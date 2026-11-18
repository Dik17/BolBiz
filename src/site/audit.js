// Automated accessibility + plain-language audit of a site spec (WCAG 2.2-inspired).
// The agent receives these findings as a tool result and fixes them itself.
import { contrastRatio, darkenToContrast } from './contrast.js';

const VAGUE_LINKS = /^(click here|here|link|more|read more|यहाँ क्लिक करें|इथे क्लिक करा)$/i;

function sentences(text) {
  return String(text || '')
    .split(/[.!?।॥\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function auditSpec(spec) {
  const findings = [];
  const add = (level, id, message, fix) => findings.push({ level, id, message, ...(fix ? { fix } : {}) });

  // 1.4.3 Contrast — brand colour is used for headings and links on white.
  const ratio = contrastRatio(spec.brand_color, '#ffffff');
  if (ratio < 4.5) {
    add('fail', 'contrast', `brand_color ${spec.brand_color} has contrast ${ratio.toFixed(2)}:1 on white; WCAG AA needs 4.5:1.`, `use a darker shade such as ${darkenToContrast(spec.brand_color)}`);
  }

  // Must be reachable: at least one contact channel.
  const { whatsapp, phone, email } = spec.contact;
  if (!whatsapp && !phone && !email) add('fail', 'contact', 'No WhatsApp, phone or email — customers cannot reach the business.', 'ask the owner for a WhatsApp number');

  const langs = Object.entries(spec.content);
  const counts = new Set(langs.map(([, c]) => c.offerings.length));
  if (counts.size > 1) add('fail', 'parity', 'The two language versions list a different number of offerings; they must match item for item.');

  for (const [label, c] of langs) {
    c.offerings.forEach((o, i) => {
      if (!o.name) add('fail', 'offering-name', `content.${label}.offerings[${i}] has no name.`);
    });
    if (!c.tagline) add('warn', 'tagline', `content.${label}.tagline is empty.`);
    if (c.tagline.length > 120) add('warn', 'tagline-length', `content.${label}.tagline is over 120 characters; keep it short for screen-reader users.`);
    if (!c.about) add('warn', 'about', `content.${label}.about is empty.`);

    // 3.1.5 Reading level — short sentences help low-literacy readers and translation.
    const ss = sentences(c.about);
    const long = ss.filter((s) => s.split(/\s+/).length > 22);
    if (long.length) add('warn', 'plain-language', `content.${label}.about has ${long.length} sentence(s) over 22 words; split them.`);

    // 2.4.4 Link purpose.
    for (const k of ['whatsapp_label', 'call_label', 'send_label']) {
      if (VAGUE_LINKS.test(c.ui[k] || '')) add('fail', 'link-purpose', `content.${label}.ui.${k} is vague; describe the action.`);
    }

    // Shouting text is harder to read and some screen readers spell it out.
    const caps = [c.business_name, c.tagline].filter((t) => t.length > 6 && t === t.toUpperCase() && /[A-Z]/.test(t));
    if (caps.length) add('warn', 'all-caps', `content.${label} uses ALL CAPS text; use sentence case.`);
  }

  const fails = findings.filter((f) => f.level === 'fail').length;
  const warns = findings.length - fails;
  const score = Math.max(0, 100 - fails * 20 - warns * 5);
  return { passed: fails === 0, score, contrast: Number(ratio.toFixed(2)), findings };
}
