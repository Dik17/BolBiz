// Renders a validated site spec into an accessible, mobile-first, bilingual HTML page,
// at one of three quality levels (see plans.js): basic · standard · premium.
// All dynamic text is HTML-escaped; URLs are built from validated parts only.
import { LANGUAGES, EN_UI_DEFAULTS } from './schema.js';
import { readableOn, mix } from './contrast.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

const SANS = 'system-ui,-apple-system,"Segoe UI","Noto Sans","Noto Sans Devanagari","Noto Sans Tamil","Noto Sans Telugu","Noto Sans Bengali","Noto Sans Gujarati","Noto Sans Kannada","Noto Sans Malayalam","Noto Sans Gurmukhi",sans-serif';
const SERIF = '"Noto Serif","Noto Serif Devanagari","Noto Serif Tamil","Noto Serif Bengali",Georgia,"Times New Roman",serif';

function context(spec, { lang = 'primary', mode = 'live', basePath = '' }) {
  const isEn = lang === 'en' || spec.primary_lang === 'en';
  const c = isEn ? spec.content.en : spec.content.primary;
  const ui = (k) => c.ui[k] || EN_UI_DEFAULTS[k];
  const code = isEn ? 'en' : spec.primary_lang;
  const otherCode = isEn ? spec.primary_lang : 'en';
  const wa = spec.contact.whatsapp.replace(/\D/g, '');
  const waLink = (text) => (wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : '');
  return {
    c, ui, code, otherCode, isEn,
    hasOther: spec.primary_lang !== 'en',
    otherHref: isEn ? `${basePath}/` : `${basePath}/en`,
    brand: spec.brand_color,
    onBrand: readableOn(spec.brand_color),
    wa,
    waHello: waLink(isEn ? `Hi ${c.business_name}, I found you online.` : `${c.business_name} 🙏`),
    waOrder: (item) => waLink(isEn ? `Hi ${c.business_name}, I'd like to order: ${item}` : `${c.business_name} — ${item} 🙏`),
    tel: spec.contact.phone || spec.contact.whatsapp,
    map: spec.contact.map_query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spec.contact.map_query)}` : '',
    live: mode === 'live',
    basePath,
  };
}

function head(spec, x, css) {
  return `<!doctype html>
<html lang="${esc(x.code)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(x.c.business_name)}${x.c.tagline ? ` — ${esc(x.c.tagline)}` : ''}</title>
<meta name="description" content="${esc(x.c.tagline || x.c.about.slice(0, 150))}">
<meta name="theme-color" content="${esc(x.brand)}">
${x.live ? '' : '<meta name="robots" content="noindex">'}
${x.hasOther ? `<link rel="alternate" hreflang="${esc(x.otherCode)}" href="${esc(x.otherHref)}">` : ''}
<style>
*{box-sizing:border-box}
:focus-visible{outline:3px solid ${x.brand};outline-offset:3px}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;left:-999px}.skip:focus{left:1rem;top:1rem;background:#fff;color:#111;padding:.5rem 1rem;z-index:9}
.hp{position:absolute;left:-9999px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
${css}
</style>
</head>`;
}

function langLink(x, cls) {
  if (!x.hasOther) return '';
  return `<a class="${cls}" href="${esc(x.otherHref)}" hreflang="${esc(x.otherCode)}" lang="${esc(x.otherCode)}">${esc(LANGUAGES[x.otherCode].native)}</a>`;
}

function contactForm(x) {
  return `${x.live ? '' : '<p class="note" role="note">Preview — the form goes live after the owner approves publishing.</p>'}
    <form method="post" action="${esc(x.basePath)}/contact">
      <input type="hidden" name="lang" value="${esc(x.code)}">
      <div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
      <div><label for="name">${esc(x.ui('name_label'))}</label><input id="name" name="name" required maxlength="80" autocomplete="name"></div>
      <div><label for="reply">${esc(x.ui('phone_label'))}</label><input id="reply" name="reply" required maxlength="120" autocomplete="tel"></div>
      <div><label for="message">${esc(x.ui('message_label'))}</label><textarea id="message" name="message" rows="4" required maxlength="1500"></textarea></div>
      <button class="btn btn-brand" type="submit"${x.live ? '' : ' disabled'}>${esc(x.ui('send_label'))}</button>
    </form>`;
}

const year = () => new Date().getFullYear();

// ---------------------------------------------------------------- basic (Shuruaat)
function renderBasic(spec, x) {
  const { c } = x;
  const items = c.offerings
    .map((o) => `<li><span class="n">${esc(o.name)}${o.description ? `<small>${esc(o.description)}</small>` : ''}</span>${o.price ? `<span class="p"><span class="sr-only">Price: </span>${esc(o.price)}</span>` : ''}</li>`)
    .join('');
  return `${head(spec, x, `
body{margin:0;font:1.125rem/1.6 ${SANS};color:#1a1a1a;background:#fff}
a{color:${x.brand}}
.bar{height:8px;background:${x.brand}}
main{max-width:36rem;margin:0 auto;padding:2rem 1.25rem 3rem}
.top{display:flex;justify-content:space-between;align-items:center;gap:1rem}
.icon{font-size:2.6rem}
.lang{font-weight:700;text-decoration:none;border:2px solid ${x.brand};border-radius:999px;padding:.25rem .8rem}
h1{font-size:2.2rem;line-height:1.15;margin:.5rem 0 .25rem}
.tag{margin:0 0 1.5rem;color:#444}
.btn{display:flex;justify-content:center;align-items:center;gap:.5rem;min-height:52px;border-radius:.75rem;font-weight:700;text-decoration:none;margin:.6rem 0;font-size:1.1rem}
.btn-brand{background:${x.brand};color:${x.onBrand}}
.btn-line{border:2px solid ${x.brand};color:${x.brand}}
h2{font-size:1.3rem;margin:2rem 0 .5rem;color:${x.brand}}
ul{list-style:none;padding:0;margin:0}
li{display:flex;justify-content:space-between;gap:1rem;padding:.7rem 0;border-bottom:1px solid #e5e5e5}
li small{display:block;color:#555;font-size:.95rem}
.p{font-weight:700;white-space:nowrap}
.meta{color:#444}
footer{text-align:center;padding:1.5rem;background:#f5f5f5;font-size:.95rem}
`)}
<body>
<div class="bar"></div>
<main id="main">
  <div class="top"><span class="icon" aria-hidden="true">${esc(spec.icon)}</span>${langLink(x, 'lang')}</div>
  <h1>${esc(c.business_name)}</h1>
  ${c.tagline ? `<p class="tag">${esc(c.tagline)}</p>` : ''}
  ${x.waHello ? `<a class="btn btn-brand" href="${esc(x.waHello)}" rel="noopener">💬 ${esc(x.ui('whatsapp_label'))}</a>` : ''}
  ${x.tel ? `<a class="btn btn-line" href="tel:${esc(x.tel)}">📞 ${esc(x.ui('call_label'))} · ${esc(x.tel)}</a>` : ''}
  <h2>${esc(x.ui('offerings_heading'))}</h2>
  <ul>${items}</ul>
  ${c.about ? `<h2>${esc(x.ui('about_heading'))}</h2><p>${nl2br(c.about)}</p>` : ''}
  ${c.hours || c.address ? `<h2>${esc(x.ui('address_label'))}</h2><p class="meta">${c.hours ? `${esc(x.ui('hours_label'))}: ${esc(c.hours)}<br>` : ''}${esc(c.address)}${x.map ? ` · <a href="${esc(x.map)}" rel="noopener">Google Maps</a>` : ''}</p>` : ''}
</main>
<footer>Free website by <a href="/">BolBiz</a> — make yours by speaking.</footer>
</body></html>`;
}

// ---------------------------------------------------------------- standard (Dukaan)
function renderStandard(spec, x) {
  const { c } = x;
  const offerings = c.offerings
    .map((o) => `<li class="card"><h3>${esc(o.name)}</h3>${o.description ? `<p>${esc(o.description)}</p>` : ''}${o.price ? `<p class="price"><span class="sr-only">Price: </span>${esc(o.price)}</p>` : ''}</li>`)
    .join('');
  return `${head(spec, x, `
:root{--brand:${x.brand};--on-brand:${x.onBrand};--soft:${mix(x.brand, '#ffffff', 0.93)}}
body{margin:0;font:1.125rem/1.6 ${SANS};color:#1a1a1a;background:#fff}
a{color:var(--brand)}
.wrap{max-width:60rem;margin:0 auto;padding:0 1.25rem}
header.hero{background:var(--brand);color:var(--on-brand);padding:3rem 0 2.5rem}
.hero .icon{font-size:3rem;line-height:1}
.hero h1{font-size:clamp(2rem,6vw,3.2rem);margin:.5rem 0 .25rem;line-height:1.15}
.hero p{font-size:1.25rem;margin:0 0 1.5rem;max-width:40rem}
.lang{float:right;color:var(--on-brand);font-weight:600;padding:.4rem .8rem;border:2px solid currentColor;border-radius:999px;text-decoration:none}
.btn{display:inline-flex;align-items:center;gap:.5rem;min-height:48px;padding:.75rem 1.25rem;border-radius:.75rem;font-weight:700;text-decoration:none;border:0;font-size:1.1rem;cursor:pointer;font-family:inherit}
.btn-light{background:#fff;color:#111}
.btn-brand{background:var(--brand);color:var(--on-brand)}
.actions{display:flex;flex-wrap:wrap;gap:.75rem}
section{padding:2.5rem 0}
section.alt{background:var(--soft)}
h2{font-size:1.75rem;margin:0 0 1rem;color:var(--brand)}
.grid{list-style:none;padding:0;margin:0;display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))}
.card{background:#fff;border:1px solid #ddd;border-radius:1rem;padding:1.25rem}
.card h3{margin:0 0 .25rem;font-size:1.2rem}.card p{margin:.25rem 0;color:#4a4a4a}
.price{font-weight:700;color:#1a1a1a!important;font-size:1.15rem}
dl{display:grid;grid-template-columns:auto 1fr;gap:.5rem 1.25rem}dt{font-weight:700}dd{margin:0}
form{display:grid;gap:1rem;max-width:32rem}
label{font-weight:600;display:block;margin-bottom:.25rem}
input,textarea{width:100%;font:inherit;padding:.75rem;border:2px solid #767676;border-radius:.5rem}
.note{background:#fff7d6;border-left:4px solid #8a6d00;padding:.75rem 1rem}
footer{padding:2rem 0;color:#555;font-size:.95rem;border-top:1px solid #eee}
`)}
<body>
<a class="skip" href="#main">${esc(x.ui('about_heading'))}</a>
<header class="hero"><div class="wrap">
  ${langLink(x, 'lang')}
  <div class="icon" aria-hidden="true">${esc(spec.icon)}</div>
  <h1>${esc(c.business_name)}</h1>
  ${c.tagline ? `<p>${esc(c.tagline)}</p>` : ''}
  <div class="actions">
    ${x.waHello ? `<a class="btn btn-light" href="${esc(x.waHello)}" rel="noopener">💬 ${esc(x.ui('whatsapp_label'))}</a>` : ''}
    ${x.tel ? `<a class="btn btn-light" href="tel:${esc(x.tel)}">📞 ${esc(x.ui('call_label'))}</a>` : ''}
  </div>
</div></header>
<main id="main">
  ${c.about ? `<section aria-labelledby="about"><div class="wrap"><h2 id="about">${esc(x.ui('about_heading'))}</h2><p>${nl2br(c.about)}</p></div></section>` : ''}
  <section class="alt" aria-labelledby="offer"><div class="wrap"><h2 id="offer">${esc(x.ui('offerings_heading'))}</h2><ul class="grid">${offerings}</ul></div></section>
  ${c.hours || c.address ? `<section aria-labelledby="visit"><div class="wrap"><h2 id="visit">${esc(x.ui('address_label'))}</h2><dl>
    ${c.hours ? `<dt>${esc(x.ui('hours_label'))}</dt><dd>${esc(c.hours)}</dd>` : ''}
    ${c.address ? `<dt>${esc(x.ui('address_label'))}</dt><dd>${esc(c.address)}${x.map ? ` — <a href="${esc(x.map)}" rel="noopener">Google Maps</a>` : ''}</dd>` : ''}
  </dl></div></section>` : ''}
  <section class="alt" aria-labelledby="contact"><div class="wrap"><h2 id="contact">${esc(x.ui('contact_heading'))}</h2>${contactForm(x)}</div></section>
</main>
<footer><div class="wrap">© ${year()} ${esc(c.business_name)} · Made with <a href="/">BolBiz</a></div></footer>
</body></html>`;
}

// ---------------------------------------------------------------- premium (Brand)
function renderPremium(spec, x) {
  const { c } = x;
  const tint = mix(x.brand, '#ffffff', 0.9);
  const deep = mix(x.brand, '#000000', 0.35);
  const [lead, ...rest] = c.about.split(/(?<=[.!?।])\s+/);
  const menu = c.offerings
    .map(
      (o) => `<li>
        <div class="mi"><h3>${esc(o.name)}</h3>${o.description ? `<p>${esc(o.description)}</p>` : ''}</div>
        <div class="mp">${o.price ? `<span class="price"><span class="sr-only">Price: </span>${esc(o.price)}</span>` : ''}
        ${x.wa ? `<a class="order" href="${esc(x.waOrder(o.name))}" rel="noopener" aria-label="${esc(x.ui('order_label'))}: ${esc(o.name)}">${esc(x.ui('order_label'))}</a>` : ''}</div>
      </li>`,
    )
    .join('');
  const highlights = c.highlights.length
    ? `<section class="hl" aria-label="Highlights"><div class="wrap"><ul>${c.highlights.map((h) => `<li><span class="tick" aria-hidden="true">✦</span><h3>${esc(h.title)}</h3>${h.text ? `<p>${esc(h.text)}</p>` : ''}</li>`).join('')}</ul></div></section>`
    : '';
  const faqs = c.faqs.length
    ? `<section aria-labelledby="faq"><div class="wrap narrow"><h2 id="faq">${esc(x.ui('faq_heading'))}</h2>${c.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div></section>`
    : '';
  return `${head(spec, x, `
:root{--brand:${x.brand};--on-brand:${x.onBrand};--tint:${tint};--deep:${deep}}
body{margin:0;font:1.1rem/1.65 ${SANS};color:#1d1b19;background:#fffdf9}
a{color:var(--brand)}
.wrap{max-width:64rem;margin:0 auto;padding:0 1.5rem}.narrow{max-width:44rem}
h1,h2,h3{font-family:${SERIF};font-weight:700;line-height:1.15}
nav{position:sticky;top:0;z-index:5;background:rgba(255,253,249,.94);backdrop-filter:blur(6px);border-bottom:1px solid #eee}
nav .wrap{display:flex;justify-content:space-between;align-items:center;min-height:60px}
nav .brandname{font-family:${SERIF};font-weight:700;font-size:1.15rem;color:var(--deep);text-decoration:none}
.lang{font-weight:600;text-decoration:none;border:1.5px solid var(--brand);border-radius:999px;padding:.2rem .8rem;font-size:.95rem}
.hero{position:relative;overflow:hidden;background:var(--tint);padding:4.5rem 0 4rem;text-align:center}
.hero::before{content:"";position:absolute;inset:0;opacity:.18;
  background-image:radial-gradient(circle at 50% 50%,var(--brand) 1.5px,transparent 2px),radial-gradient(circle at 0 0,transparent 14px,var(--brand) 15px,transparent 16px);
  background-size:22px 22px,44px 44px}
.hero .wrap{position:relative}
.medal{width:6.5rem;height:6.5rem;margin:0 auto 1.25rem;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:3.2rem;box-shadow:0 0 0 6px var(--tint),0 0 0 8px var(--brand)}
.hero h1{font-size:clamp(2.4rem,7vw,4.2rem);margin:0;color:var(--deep);letter-spacing:-.01em}
.hero p{font-size:1.3rem;margin:.75rem auto 2rem;max-width:34rem;color:#3a3633}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:52px;padding:.8rem 1.6rem;border-radius:999px;font-weight:700;text-decoration:none;border:0;font-size:1.1rem;cursor:pointer;font-family:inherit}
.btn-brand{background:var(--brand);color:var(--on-brand)}
.btn-ghost{background:#fff;color:var(--deep);border:2px solid var(--brand)}
.actions{display:flex;flex-wrap:wrap;justify-content:center;gap:.75rem}
section{padding:3.5rem 0}
h2{font-size:clamp(1.8rem,4vw,2.4rem);margin:0 0 1.5rem;color:var(--deep)}
.hl{padding:0;margin-top:-1.75rem;position:relative}
.hl ul{list-style:none;margin:0;padding:1.5rem;display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));background:#fff;border-radius:1.25rem;box-shadow:0 10px 30px -18px rgba(0,0,0,.35)}
.hl h3{margin:.2rem 0;font-size:1.15rem}.hl p{margin:0;color:#555;font-size:1rem}
.tick{color:var(--brand);font-size:1.2rem}
.story .lead{font-family:${SERIF};font-size:clamp(1.4rem,3vw,1.9rem);line-height:1.4;color:var(--deep);margin:0 0 1rem}
.menu{list-style:none;margin:0;padding:0}
.menu li{display:flex;justify-content:space-between;align-items:center;gap:1.25rem;padding:1.15rem 0;border-bottom:1px dashed #d8d2c8}
.menu h3{margin:0;font-size:1.3rem}.menu p{margin:.2rem 0 0;color:#5a5550;font-size:1rem}
.mp{display:flex;align-items:center;gap:.9rem;flex-shrink:0}
.price{font-weight:700;font-size:1.15rem;white-space:nowrap}
.order{font-weight:700;text-decoration:none;background:var(--brand);color:var(--on-brand);border-radius:999px;padding:.45rem 1rem;min-height:44px;display:inline-flex;align-items:center;white-space:nowrap}
@media (max-width:560px){.menu li{flex-direction:column;align-items:flex-start}.mp{width:100%;justify-content:space-between}}
details{border-bottom:1px solid #e8e2d8;padding:.9rem 0}
summary{cursor:pointer;font-weight:700;font-size:1.1rem;list-style-position:outside}
details p{margin:.5rem 0 0;color:#4a4540}
.visit{background:var(--tint)}
.two{display:grid;gap:2.5rem;grid-template-columns:1fr 1.2fr}
@media (max-width:760px){.two{grid-template-columns:1fr}}
.info{background:#fff;border-radius:1.25rem;padding:1.5rem}
.info dt{font-weight:700;color:var(--deep);margin-top:.6rem}.info dd{margin:0}
form{display:grid;gap:1rem}
label{font-weight:600;display:block;margin-bottom:.25rem}
input,textarea{width:100%;font:inherit;padding:.8rem;border:2px solid #8a847c;border-radius:.75rem;background:#fff}
.note{background:#fff7d6;border-left:4px solid #8a6d00;padding:.75rem 1rem;margin:0}
footer{padding:2.5rem 0 6rem;text-align:center;color:#5a5550;font-size:.95rem}
.sticky{position:fixed;left:1rem;right:1rem;bottom:1rem;display:none;z-index:6}
@media (max-width:760px){.sticky{display:flex}}
.sticky a{flex:1;box-shadow:0 8px 24px -8px rgba(0,0,0,.45)}
`)}
<body>
<a class="skip" href="#main">${esc(x.ui('about_heading'))}</a>
<nav aria-label="${esc(c.business_name)}"><div class="wrap"><a class="brandname" href="#main">${esc(c.business_name)}</a>${langLink(x, 'lang')}</div></nav>
<header class="hero"><div class="wrap">
  <div class="medal" aria-hidden="true">${esc(spec.icon)}</div>
  <h1>${esc(c.business_name)}</h1>
  ${c.tagline ? `<p>${esc(c.tagline)}</p>` : ''}
  <div class="actions">
    ${x.waHello ? `<a class="btn btn-brand" href="${esc(x.waHello)}" rel="noopener">💬 ${esc(x.ui('whatsapp_label'))}</a>` : ''}
    ${x.tel ? `<a class="btn btn-ghost" href="tel:${esc(x.tel)}">📞 ${esc(x.ui('call_label'))}</a>` : ''}
  </div>
</div></header>
<main id="main">
  ${highlights}
  ${c.about ? `<section class="story" aria-labelledby="about"><div class="wrap narrow"><h2 id="about">${esc(x.ui('about_heading'))}</h2><p class="lead">${esc(lead)}</p>${rest.length ? `<p>${esc(rest.join(' '))}</p>` : ''}</div></section>` : ''}
  <section aria-labelledby="offer"><div class="wrap narrow"><h2 id="offer">${esc(x.ui('offerings_heading'))}</h2><ul class="menu">${menu}</ul></div></section>
  ${faqs}
  <section class="visit" aria-labelledby="contact"><div class="wrap two">
    <div>
      <h2 id="contact">${esc(x.ui('contact_heading'))}</h2>
      <dl class="info">
        ${c.hours ? `<dt>${esc(x.ui('hours_label'))}</dt><dd>${esc(c.hours)}</dd>` : ''}
        ${c.address ? `<dt>${esc(x.ui('address_label'))}</dt><dd>${esc(c.address)}${x.map ? `<br><a href="${esc(x.map)}" rel="noopener">Google Maps</a>` : ''}</dd>` : ''}
        ${x.tel ? `<dt>${esc(x.ui('call_label'))}</dt><dd><a href="tel:${esc(x.tel)}">${esc(x.tel)}</a></dd>` : ''}
      </dl>
    </div>
    <div>${contactForm(x)}</div>
  </div></section>
</main>
<footer>© ${year()} ${esc(c.business_name)} · Made with <a href="/">BolBiz</a></footer>
${x.waHello ? `<div class="sticky"><a class="btn btn-brand" href="${esc(x.waHello)}" rel="noopener">💬 ${esc(x.ui('whatsapp_label'))}</a></div>` : ''}
</body></html>`;
}

/**
 * @param {object} spec normalised spec
 * @param {object} opts { lang: 'primary'|'en', mode: 'preview'|'live', basePath, tier: 'basic'|'standard'|'premium' }
 */
export function renderSite(spec, opts = {}) {
  const x = context(spec, opts);
  if (opts.tier === 'basic') return renderBasic(spec, x);
  if (opts.tier === 'premium') return renderPremium(spec, x);
  return renderStandard(spec, x);
}

export function renderNotice(title, body, { lang = 'en', backHref = '/' } = {}) {
  return `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:1.2rem/1.6 system-ui,"Noto Sans",sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.25rem;color:#1a1a1a}a{color:#1f5f8b;font-weight:700}</style></head>
<body><main><h1>${esc(title)}</h1><p>${esc(body)}</p><p><a href="${esc(backHref)}">←</a></p></main></body></html>`;
}
