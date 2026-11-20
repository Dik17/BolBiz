// End-to-end: a scripted Claude drives the real tool handlers, then the owner approves,
// a customer sends an enquiry, and we check every gate along the way.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Our own server is called with the real fetch; the global one is stubbed for GoDaddy.
const realFetch = globalThis.fetch;
process.env.DATA_DIR = ':memory:';
process.env.GODADDY_PAT = 'test-pat';
process.env.ANTHROPIC_API_KEY = '';

const { createApp } = await import('../src/app.js');
const { sampleSpec } = await import('./fixtures.js');
const { checkDomains } = await import('../src/services/godaddy.js');

// ---- fake Anthropic client: returns queued responses, records requests ----
function fakeClient(script) {
  const calls = [];
  return {
    calls,
    messages: {
      async create(req) {
        calls.push(req);
        if (req.model.includes('haiku')) {
          if (req.system) return { content: [{ type: 'text', text: 'नमस्कार, मला २० मोदक हवे आहेत' }], usage: {} };
          return { content: [{ type: 'text', text: '{"whatsapp_status":"आम्ही ऑनलाइन आहोत!","instagram_caption":"नवीन वेबसाइट #modak","poster_line":"QR स्कॅन करा"}' }], usage: {} };
        }
        const next = script.shift();
        if (!next) throw new Error('script exhausted');
        return { stop_reason: next.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn', content: next, usage: { input_tokens: 10, output_tokens: 5 } };
      },
    },
  };
}
const toolUse = (id, name, input) => ({ type: 'tool_use', id, name, input });

let server, base;
const sent = [];
const transportImpl = { sendMail: async (m) => sent.push(m) };
let client;

before(async () => {
  // Stub GoDaddy so tests never hit the network.
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    if (u.pathname === '/v3/domains/check-availability') {
      const d = u.searchParams.get('domain');
      return new Response(JSON.stringify({ domain: d, available: d.endsWith('.in'), definitive: true, prices: [{ term: 'YEAR', period: 1, price: { currencyCode: 'INR', value: 79900 } }] }));
    }
    if (u.pathname === '/v3/domains/suggestions') return new Response(JSON.stringify({ items: [{ domain: 'ajimodak.shop', prices: [] }] }));
    throw new Error(`unexpected fetch ${url}`);
  };
  const bad = sampleSpec({ brand_color: '#ffd54f' });
  client = fakeClient([
    [{ type: 'text', text: 'छान!' }, toolUse('t1', 'update_business_profile', { business_name: 'आजीचे मोदक', offerings: [{ name: 'मोदक' }], area: 'Kothrud', whatsapp: '9876543210' })],
    [toolUse('t2', 'search_domains', { candidates: ['ajimodak.in', 'ajimodak.com', 'not a domain'], query: 'modak pune' })],
    [toolUse('t3', 'build_website', bad)], // fails contrast → agent must fix
    [toolUse('t4', 'build_website', sampleSpec())],
    [toolUse('t5', 'request_publish_approval', { summary: 'तुमची वेबसाइट तयार आहे', chosen_domain: 'ajimodak.in' })],
    [{ type: 'text', text: 'कृपया पहा आणि मंजूर करा.' }],
  ]);
  const app = createApp({ client, transportImpl });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.closeAllConnections(); server?.close(); });

const post = (path, body) => realFetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('GoDaddy check parses v3 prices (cents) and drops invalid domains', async () => {
  const r = await checkDomains(['ajimodak.in', 'bad domain!']);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].price, { amount: 799, currency: 'INR', renewal: null });
});

test('falls back to RDAP when GoDaddy rejects the token', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('api.godaddy.com')) return new Response('{}', { status: 401 });
    if (String(url).includes('rdap.org')) return new Response('', { status: 404 });
    throw new Error('unexpected');
  };
  try {
    const [r] = await checkDomains(['brandnewname.in']);
    assert.equal(r.source, 'rdap');
    assert.equal(r.available, true);
  } finally {
    globalThis.fetch = saved;
  }
});

test('full flow: voice turn → tools → self-fix → approval gate → publish → enquiry', async () => {
  const { sessionId } = await (await post('/api/session', { lang: 'mr-IN' })).json();

  // Approve must fail before the agent has asked for approval.
  assert.equal((await post('/api/approve', { sessionId, plan: 'standard' })).status, 409);

  const res = await post('/api/agent', { sessionId, text: 'मी कोथरूडमध्ये घरी मोदक बनवते', lang: 'mr-IN' });
  const body = await res.text();
  const events = body.split('\n\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  const types = events.map((e) => e.type);

  for (const t of ['profile', 'domains', 'preview', 'approval', 'message', 'done']) assert.ok(types.includes(t), `missing ${t}`);
  const previews = events.filter((e) => e.type === 'preview');
  assert.equal(previews[0].audit.passed, false, 'first build should fail contrast');
  assert.equal(previews[1].audit.passed, true, 'agent fixed it');
  assert.equal(events.find((e) => e.type === 'domains').domains.find((d) => d.domain === 'ajimodak.in').available, true);

  // Prompt caching is applied to system prompt and tools.
  const req = client.calls.find((c) => c.model.includes('sonnet'));
  assert.equal(req.system[0].cache_control.type, 'ephemeral');
  assert.equal(req.tools.at(-1).cache_control.type, 'ephemeral');
  assert.ok(!req.tools.some((t) => /publish/.test(t.name) && t.name !== 'request_publish_approval'), 'agent has no publish tool');

  // Preview renders but is not public yet.
  const previewUrl = previews[1].url;
  const pv = await realFetch(`${base}${previewUrl}`).catch((e) => { throw e.cause || e; });
  assert.equal(pv.status, 200);
  assert.equal((await realFetch(`${base}/s/aji-che-modak/`)).status, 404);

  // Owner approves → published, launch kit from Haiku, QR poster.
  assert.equal((await post('/api/approve', { sessionId })).status, 400, 'plan is required');
  const ap = await post('/api/approve', { sessionId, plan: 'premium' });
  assert.equal(ap.status, 200);
  const out = await ap.json();
  assert.equal(out.slug, 'aji-che-modak');
  assert.equal(out.plan, 'premium');
  assert.equal(out.kit.poster_line, 'QR स्कॅन करा');
  const live = await (await realFetch(`${base}/s/aji-che-modak/`)).text();
  assert.match(live, /<html lang="mr">/);
  assert.match(await (await realFetch(`${base}/s/aji-che-modak/poster`)).text(), /<svg/);

  // Approval can't be replayed.
  assert.equal((await post('/api/approve', { sessionId, plan: 'premium' })).status, 409);

  // Customer enquiry → stored, translated to Marathi, emailed.
  const form = new URLSearchParams({ name: 'Riya', reply: 'riya@example.com', message: 'Hi, I need 20 modaks', lang: 'en' });
  const cr = await realFetch(`${base}/s/aji-che-modak/contact`, { method: 'POST', body: form });
  assert.equal(cr.status, 200);
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /Marathi:\nनमस्कार/);
  assert.equal(sent[0].replyTo, 'riya@example.com');
});

test('contact form header-injection attempts are neutralised', async () => {
  const r = await post('/api/contact', { name: 'Eve\r\nBcc: x@evil.com', email: 'eve@example.com', message: 'hi' });
  assert.equal(r.status, 200);
  assert.ok(!sent.at(-1).subject.includes('\n'));
});

test('honeypot submissions are silently dropped', async () => {
  const before = sent.length;
  await post('/api/contact', { name: 'Bot', email: 'b@b.co', message: 'spam', website: 'http://spam' });
  assert.equal(sent.length, before);
});

test('rejects unknown sessions and invalid slugs', async () => {
  assert.equal((await post('/api/agent', { sessionId: 'nope', text: 'hi' })).status, 404);
  assert.equal((await realFetch(`${base}/s/..%2Fetc/`)).status, 404);
});
