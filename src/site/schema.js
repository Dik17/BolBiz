// Validation for the structured site spec that Claude produces via the build_website tool.
// Claude never writes HTML: it writes this JSON, we validate it, and our own template renders it.

export const LANGUAGES = {
  en: { name: 'English', native: 'English', speech: 'en-IN' },
  hi: { name: 'Hindi', native: 'हिन्दी', speech: 'hi-IN' },
  mr: { name: 'Marathi', native: 'मराठी', speech: 'mr-IN' },
  ta: { name: 'Tamil', native: 'தமிழ்', speech: 'ta-IN' },
  te: { name: 'Telugu', native: 'తెలుగు', speech: 'te-IN' },
  bn: { name: 'Bengali', native: 'বাংলা', speech: 'bn-IN' },
  gu: { name: 'Gujarati', native: 'ગુજરાતી', speech: 'gu-IN' },
  kn: { name: 'Kannada', native: 'ಕನ್ನಡ', speech: 'kn-IN' },
  ml: { name: 'Malayalam', native: 'മലയാളം', speech: 'ml-IN' },
  pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', speech: 'pa-IN' },
};

export const UI_KEYS = [
  'about_heading',
  'offerings_heading',
  'contact_heading',
  'whatsapp_label',
  'call_label',
  'hours_label',
  'address_label',
  'name_label',
  'phone_label',
  'message_label',
  'send_label',
];

export const EN_UI_DEFAULTS = {
  about_heading: 'About us',
  offerings_heading: 'What we offer',
  contact_heading: 'Get in touch',
  whatsapp_label: 'Order on WhatsApp',
  call_label: 'Call us',
  hours_label: 'Opening hours',
  address_label: 'Find us',
  name_label: 'Your name',
  phone_label: 'Your phone or email',
  message_label: 'Your message',
  send_label: 'Send message',
};

const HEX = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function slugify(s) {
  return String(s || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

function cleanContent(c, isEnglish) {
  c = c && typeof c === 'object' ? c : {};
  const ui = {};
  const srcUi = c.ui && typeof c.ui === 'object' ? c.ui : {};
  for (const k of UI_KEYS) ui[k] = str(srcUi[k], 60) || (isEnglish ? EN_UI_DEFAULTS[k] : '');
  const offerings = (Array.isArray(c.offerings) ? c.offerings : []).slice(0, 12).map((o) => ({
    name: str(o?.name, 80),
    description: str(o?.description, 240),
    price: str(o?.price, 40),
  }));
  return {
    business_name: str(c.business_name, 80),
    tagline: str(c.tagline, 160),
    about: str(c.about, 900),
    hours: str(c.hours, 160),
    address: str(c.address, 240),
    offerings,
    ui,
  };
}

/**
 * Normalises a raw spec. Returns { spec, errors } — errors are hard problems the
 * agent must fix (the audit adds softer accessibility findings on top).
 */
export function normalizeSpec(raw) {
  const errors = [];
  raw = raw && typeof raw === 'object' ? raw : {};

  const primary_lang = LANGUAGES[raw.primary_lang] ? raw.primary_lang : 'en';
  if (!LANGUAGES[raw.primary_lang]) errors.push(`primary_lang must be one of: ${Object.keys(LANGUAGES).join(', ')}`);

  const content = raw.content && typeof raw.content === 'object' ? raw.content : {};
  const primary = cleanContent(content.primary, primary_lang === 'en');
  const en = primary_lang === 'en' ? primary : cleanContent(content.en, true);

  let slug = typeof raw.slug === 'string' ? raw.slug.toLowerCase() : '';
  if (!SLUG.test(slug)) slug = slugify(en.business_name || primary.business_name);
  if (!SLUG.test(slug)) errors.push('slug must be 3-40 chars of a-z, 0-9 and hyphens');

  const brand_color = HEX.test(raw.brand_color || '') ? raw.brand_color.toLowerCase() : '#1f5f8b';
  if (!HEX.test(raw.brand_color || '')) errors.push('brand_color must be a 6-digit hex like #1f5f8b');

  const ct = raw.contact && typeof raw.contact === 'object' ? raw.contact : {};
  const digits = (v) => String(v || '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  const contact = {
    whatsapp: digits(ct.whatsapp).slice(0, 16),
    phone: digits(ct.phone).slice(0, 16),
    email: /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,24}$/i.test(ct.email || '') ? ct.email.trim() : '',
    map_query: str(ct.map_query, 200),
  };

  const icon = str(raw.icon, 8) || '✨';

  for (const [label, c] of [['primary', primary], ['en', en]]) {
    if (!c.business_name) errors.push(`content.${label}.business_name is required`);
    if (c.offerings.length === 0) errors.push(`content.${label}.offerings needs at least one item`);
  }
  if (primary_lang !== 'en') {
    const missing = UI_KEYS.filter((k) => !primary.ui[k]);
    if (missing.length) errors.push(`content.primary.ui is missing translations for: ${missing.join(', ')}`);
  }

  return { spec: { slug, primary_lang, brand_color, icon, contact, content: { primary, en } }, errors };
}
