// Tool definitions (JSON Schema for Claude) and their server-side handlers.
// Handlers validate everything — tool input is untrusted model output.
import { checkDomains, suggestDomains } from '../services/godaddy.js';
import { normalizeSpec, LANGUAGES, UI_KEYS } from '../site/schema.js';
import { auditSpec } from '../site/audit.js';
import { drafts, newId } from '../services/store.js';

const contentSchema = {
  type: 'object',
  properties: {
    business_name: { type: 'string' },
    tagline: { type: 'string', description: 'One short line, under 100 characters.' },
    about: { type: 'string', description: '2-4 short sentences in plain language.' },
    hours: { type: 'string' },
    address: { type: 'string' },
    offerings: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, description: { type: 'string' }, price: { type: 'string' } },
        required: ['name'],
      },
    },
    highlights: {
      type: 'array',
      description: 'Up to 3 short highlights drawn ONLY from what the owner said (e.g. "Made at home", "Free delivery in Kothrud"). Used by the Brand plan.',
      items: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string' } }, required: ['title'] },
    },
    faqs: {
      type: 'array',
      description: 'Up to 3 common customer questions answered ONLY with facts the owner gave (ordering, delivery, timings). Used by the Brand plan.',
      items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'] },
    },
    ui: {
      type: 'object',
      description: `Interface labels in this language. Keys: ${UI_KEYS.join(', ')}`,
      properties: Object.fromEntries(UI_KEYS.map((k) => [k, { type: 'string' }])),
    },
  },
  required: ['business_name', 'offerings', 'ui'],
};

export const TOOL_DEFS = [
  {
    name: 'update_business_profile',
    description: 'Save facts the owner has told you about their business. Call whenever you learn something new. Only include fields you actually know. Returns which essentials are still missing.',
    input_schema: {
      type: 'object',
      properties: {
        business_name: { type: 'string' },
        name_suggestions: { type: 'array', items: { type: 'string' }, description: 'Name ideas if the owner has no name yet.' },
        category: { type: 'string', description: 'e.g. home bakery, tailoring, kirana, tuition' },
        offerings: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'string' } }, required: ['name'] } },
        city: { type: 'string' },
        area: { type: 'string' },
        whatsapp: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        hours: { type: 'string' },
        owner_name: { type: 'string' },
        story: { type: 'string', description: 'Anything personal the owner shared, in their words.' },
      },
    },
  },
  {
    name: 'show_quick_replies',
    description: 'Show 2-4 big tappable answer buttons for your next question, written in the owner\'s language. Helps owners who find typing hard.',
    input_schema: {
      type: 'object',
      properties: { options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 } },
      required: ['options'],
    },
  },
  {
    name: 'search_domains',
    description: 'Check live domain availability and price on GoDaddy. Give 3-6 exact candidate domains and a short query describing the business for GoDaddy suggestions.',
    input_schema: {
      type: 'object',
      properties: {
        candidates: { type: 'array', items: { type: 'string' }, description: 'Exact domains, e.g. ["ajimodak.in","ajimodak.com"]' },
        query: { type: 'string', description: 'e.g. "home made modak bakery pune"' },
      },
      required: ['candidates'],
    },
  },
  {
    name: 'build_website',
    description: 'Render a bilingual, accessible draft website from a structured spec and run the accessibility audit. The owner will then see it as three mockups (Shuruaat free, Dukaan, Brand) and choose one. Returns the preview URL, a 0-100 score and findings to fix. Does NOT publish.',
    input_schema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'URL name, lowercase a-z 0-9 and hyphens, e.g. "aji-che-modak"' },
        primary_lang: { type: 'string', enum: Object.keys(LANGUAGES) },
        brand_color: { type: 'string', description: 'Hex like #8a2b0f; must have 4.5:1 contrast on white.' },
        icon: { type: 'string', description: 'One emoji that represents the trade.' },
        contact: {
          type: 'object',
          properties: { whatsapp: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, map_query: { type: 'string' } },
        },
        content: {
          type: 'object',
          properties: { primary: contentSchema, en: contentSchema },
          required: ['primary', 'en'],
        },
      },
      required: ['slug', 'primary_lang', 'brand_color', 'contact', 'content'],
    },
  },
  {
    name: 'request_publish_approval',
    description: 'Show the owner the three plan mockups with prices and an Approve button. The owner picks the plan and publishes; you cannot. Call only after build_website passed the audit.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'One sentence in the owner\'s language describing what will go live.' },
        chosen_domain: { type: 'string', description: 'The domain you recommend they buy on GoDaddy, if any.' },
      },
      required: ['summary'],
    },
  },
];

const ESSENTIALS = ['business_name', 'offerings', 'whatsapp_or_phone', 'city_or_area'];

function missingEssentials(p) {
  const missing = [];
  if (!p.business_name) missing.push('business_name');
  if (!p.offerings?.length) missing.push('offerings');
  if (!p.whatsapp && !p.phone) missing.push('whatsapp_or_phone');
  if (!p.city && !p.area) missing.push('city_or_area');
  return missing;
}

const clip = (v, n = 200) => (typeof v === 'string' ? v.trim().slice(0, n) : undefined);

/**
 * Executes one tool call. `ctx` = { session, emit, baseUrl }.
 * Returns { content: string|object, isError?: boolean }.
 */
export async function runTool(name, input, ctx) {
  const { session, emit } = ctx;
  input = input && typeof input === 'object' ? input : {};

  switch (name) {
    case 'update_business_profile': {
      const p = session.profile;
      for (const k of ['business_name', 'category', 'city', 'area', 'whatsapp', 'phone', 'email', 'hours', 'owner_name']) {
        const v = clip(input[k], 120);
        if (v) p[k] = v;
      }
      if (input.story) p.story = clip(input.story, 600);
      if (Array.isArray(input.name_suggestions)) p.name_suggestions = input.name_suggestions.slice(0, 4).map((s) => clip(s, 60)).filter(Boolean);
      if (Array.isArray(input.offerings) && input.offerings.length) {
        p.offerings = input.offerings.slice(0, 12).map((o) => ({ name: clip(o?.name, 80), price: clip(o?.price, 40) })).filter((o) => o.name);
      }
      emit('profile', { profile: p });
      const missing = missingEssentials(p);
      return { content: { saved: true, still_missing: missing, ready_to_build: missing.length === 0 } };
    }

    case 'show_quick_replies': {
      const options = (Array.isArray(input.options) ? input.options : []).map((o) => clip(o, 60)).filter(Boolean).slice(0, 4);
      emit('quick_replies', { options });
      return { content: { shown: options.length } };
    }

    case 'search_domains': {
      const candidates = Array.isArray(input.candidates) ? input.candidates.slice(0, 6) : [];
      emit('status', { key: 'domains', text: 'Checking domains on GoDaddy…' });
      const [checked, suggested] = await Promise.all([checkDomains(candidates), suggestDomains(clip(input.query, 100))]);
      const seen = new Set(checked.map((d) => d.domain));
      const results = [...checked, ...suggested.filter((s) => !seen.has(s.domain)).slice(0, 4)];
      session.domains = results;
      emit('domains', { domains: results });
      return {
        content: {
          source: results[0]?.source || 'none',
          results: results.map(({ domain, available, price, definitive }) => ({ domain, available, definitive, price })),
          note: results.some((r) => r.source === 'rdap') ? 'Prices unavailable in fallback mode; availability is from public RDAP registry data.' : undefined,
        },
      };
    }

    case 'build_website': {
      emit('status', { key: 'build', text: 'Designing your website…' });
      const { spec, errors } = normalizeSpec(input);
      if (errors.length) {
        emit('audit', { passed: false, score: 0, findings: errors.map((m) => ({ level: 'fail', message: m })) });
        return { isError: true, content: { ok: false, schema_errors: errors, hint: 'Fix these and call build_website again.' } };
      }
      const audit = auditSpec(spec);
      const draftId = session.draftId || newId(9);
      session.draftId = draftId;
      session.awaitingApproval = false; // any rebuild invalidates an earlier approval request
      await drafts.save(draftId, { spec, audit, sessionId: session.id, updatedAt: new Date().toISOString() });
      const previewUrl = `/preview/${draftId}/`;
      emit('preview', { url: previewUrl, audit, slug: spec.slug });
      return {
        content: {
          ok: true,
          preview_url: previewUrl,
          accessibility: { passed: audit.passed, score: audit.score, findings: audit.findings },
          next: audit.passed ? 'Audit passed. Call request_publish_approval.' : 'Fix every "fail" finding, then call build_website again.',
        },
      };
    }

    case 'request_publish_approval': {
      if (!session.draftId) return { isError: true, content: 'No draft yet. Call build_website first.' };
      const draft = await drafts.get(session.draftId);
      if (!draft?.audit?.passed) return { isError: true, content: 'The draft has failing accessibility findings. Fix them and rebuild first.' };
      session.awaitingApproval = true;
      const chosen = clip(input.chosen_domain, 100);
      const domain = session.domains.find((d) => d.domain === chosen) || null;
      emit('approval', { summary: clip(input.summary, 300), previewUrl: `/preview/${session.draftId}/`, domain });
      return { content: 'Approval card is now shown to the owner. End your turn with one short sentence asking them to check the preview and tap Approve, or say what to change.' };
    }

    default:
      return { isError: true, content: `Unknown tool ${name}` };
  }
}

export const _test = { missingEssentials, ESSENTIALS };
