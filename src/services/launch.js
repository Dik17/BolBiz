// Publishing (human-triggered only) and the launch kit (Haiku: cheap, fast, structured).
import QRCode from 'qrcode';
import { config, isConfigured } from '../config.js';
import { drafts, sites } from './store.js';
import { LANGUAGES } from '../site/schema.js';
import { LAUNCH_KIT_PROMPT, TRANSLATE_PROMPT } from '../agent/prompts.js';
import { getClient } from '../agent/agent.js';

function parseJsonLoose(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

export async function generateLaunchKit(spec, url, { client } = {}) {
  const c = spec.content.primary;
  const fallback = {
    whatsapp_status: `${c.business_name} is now online! ${url}`,
    instagram_caption: `${c.business_name} — ${c.tagline} ${url}`,
    poster_line: c.ui.whatsapp_label || 'Scan to visit us online',
  };
  if (!isConfigured.claude() && !client) return fallback;
  try {
    const res = await (client || getClient()).messages.create({
      model: config.anthropic.fastModel,
      max_tokens: 600,
      messages: [{ role: 'user', content: LAUNCH_KIT_PROMPT(LANGUAGES[spec.primary_lang].name, c.business_name, url, c.tagline) }],
    });
    const j = parseJsonLoose(res.content.find((b) => b.type === 'text')?.text);
    if (!j) return fallback;
    return {
      whatsapp_status: clip(j.whatsapp_status, 300) || fallback.whatsapp_status,
      instagram_caption: clip(j.instagram_caption, 500) || fallback.instagram_caption,
      poster_line: clip(j.poster_line, 80) || fallback.poster_line,
    };
  } catch {
    return fallback;
  }
}

/**
 * Publishes the session's draft. Called ONLY from the /api/approve endpoint, which
 * requires the owner's click — the agent has no publish tool.
 */
export async function publishDraft(session, baseUrl, deps = {}, plan = 'standard') {
  if (!session.awaitingApproval || !session.draftId) {
    const e = new Error('Nothing is awaiting approval');
    e.status = 409;
    throw e;
  }
  const draft = await drafts.get(session.draftId);
  if (!draft || !draft.audit?.passed) {
    const e = new Error('Draft is missing or did not pass the audit');
    e.status = 409;
    throw e;
  }

  // Slug ownership: a session can republish its own slug, never take someone else's.
  let slug = draft.spec.slug;
  const existing = await sites.get(slug);
  if (existing && existing.ownerSession !== session.id) {
    slug = `${slug.slice(0, 33)}-${session.draftId.slice(0, 5).toLowerCase().replace(/[^a-z0-9]/g, 'x')}`;
  }
  const url = `${baseUrl}/s/${slug}/`;
  const kit = await generateLaunchKit(draft.spec, url, deps);
  const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });

  const record = {
    spec: { ...draft.spec, slug },
    audit: draft.audit,
    plan,
    kit,
    qrSvg,
    ownerSession: session.id,
    publishedAt: new Date().toISOString(),
  };
  await sites.save(slug, record);
  session.awaitingApproval = false;
  session.publishedSlug = slug;
  (session.pendingNotes ||= []).push(`[SYSTEM EVENT] The owner chose the ${plan} plan and pressed Approve. The site is LIVE at ${url}. A QR poster and social captions were generated.`);
  return { slug, url, plan, kit, posterUrl: `/s/${slug}/poster` };
}

export async function translateForOwner(text, lang, { client } = {}) {
  if (lang === 'en' || !LANGUAGES[lang] || (!isConfigured.claude() && !client)) return null;
  try {
    const res = await (client || getClient()).messages.create({
      model: config.anthropic.fastModel,
      max_tokens: 800,
      system: TRANSLATE_PROMPT(LANGUAGES[lang].name),
      messages: [{ role: 'user', content: String(text).slice(0, 1500) }],
    });
    return res.content.find((b) => b.type === 'text')?.text?.trim() || null;
  } catch {
    return null;
  }
}
