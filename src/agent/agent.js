// The agent loop: Claude (Sonnet) reasons, calls our tools, sees results, and repeats
// until it ends its turn. Progress is streamed to the browser as events.
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { SYSTEM_PROMPT, turnPreamble } from './prompts.js';
import { TOOL_DEFS, runTool } from './tools.js';

let defaultClient = null;
export function getClient() {
  if (!defaultClient) defaultClient = new Anthropic({ apiKey: config.anthropic.apiKey, maxRetries: 2, timeout: 60_000 });
  return defaultClient;
}

// Prompt caching: the system prompt and tool list are identical on every call, so mark them cacheable.
const SYSTEM = [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }];
const TOOLS = TOOL_DEFS.map((t, i) => (i === TOOL_DEFS.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t));

const MAX_HISTORY_TURNS = 30;

/**
 * Runs one owner turn.
 * @param {object} session  server-side session
 * @param {string} text     what the owner said/typed
 * @param {(type:string, data:object)=>void} emit
 * @param {{client?: object}} [deps]  injectable for tests
 */
export async function runAgentTurn(session, text, emit, deps = {}) {
  const client = deps.client || getClient();
  const notes = session.pendingNotes?.splice(0) || [];
  const userText = [...notes, turnPreamble(session.lang), `OWNER SAYS: ${text}`].join('\n');
  session.messages.push({ role: 'user', content: [{ type: 'text', text: userText }] });

  const usage = { input: 0, output: 0, cacheRead: 0 };

  for (let step = 0; step < config.anthropic.maxAgentSteps; step++) {
    emit('status', { key: 'thinking', text: 'Thinking…' });
    const res = await client.messages.create({
      model: config.anthropic.agentModel,
      max_tokens: config.anthropic.maxTokens,
      system: SYSTEM,
      tools: TOOLS,
      messages: session.messages,
    });

    usage.input += res.usage?.input_tokens || 0;
    usage.output += res.usage?.output_tokens || 0;
    usage.cacheRead += res.usage?.cache_read_input_tokens || 0;

    session.messages.push({ role: 'assistant', content: res.content });

    for (const block of res.content) {
      if (block.type === 'text' && block.text.trim()) emit('message', { text: block.text.trim() });
    }

    const toolUses = res.content.filter((b) => b.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || toolUses.length === 0) {
      if (res.stop_reason === 'max_tokens') emit('status', { key: 'warn', text: 'Response was cut short.' });
      break;
    }

    const results = [];
    for (const tu of toolUses) {
      emit('tool', { name: tu.name });
      let out;
      try {
        out = await runTool(tu.name, tu.input, { session, emit });
      } catch (e) {
        out = { isError: true, content: `Tool failed: ${e.message}` };
      }
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: typeof out.content === 'string' ? out.content : JSON.stringify(out.content),
        ...(out.isError ? { is_error: true } : {}),
      });
    }
    session.messages.push({ role: 'user', content: results });

    if (step === config.anthropic.maxAgentSteps - 1) {
      emit('status', { key: 'warn', text: 'Paused after several steps — say "continue" to keep going.' });
    }
  }

  trimHistory(session);
  emit('usage', usage);
}

// Keep the conversation bounded while never splitting a tool_use from its tool_result:
// we only cut at a plain-text user message.
export function trimHistory(session) {
  const msgs = session.messages;
  if (msgs.length <= MAX_HISTORY_TURNS * 2) return;
  for (let i = msgs.length - MAX_HISTORY_TURNS * 2; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.role === 'user' && m.content.every?.((b) => b.type === 'text')) {
      session.messages = msgs.slice(i);
      return;
    }
  }
}
