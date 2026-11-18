// Renders a validated site spec into an accessible, mobile-first, bilingual HTML page.
// All dynamic text is HTML-escaped; URLs are built from validated parts only.
import { LANGUAGES } from './schema.js';
import { readableOn } from './contrast.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

/**
 * @param {object} spec normalised spec
 * @param {object} opts { lang: 'primary'|'en', mode: 'preview'|'live', basePath, csrf }
 */
export function renderSite(spec, { lang = 'primary', mode = 'live', basePath = '' } = {}) {
  const isEn = lang === 'en' || spec.primary_lang === 'en';
  const c = isEn ? spec.content.en : spec.content.primary;
  const code = isEn ? 'en' : spec.primary_lang;
  const otherCode = isEn ? spec.primary_lang : 'en';
  const hasOther = spec.primary_lang !== 'en';
  const otherHref = isEn ? `${basePath}/` : `${basePath}/en`;
  const brand = spec.brand_color;
  const onBrand = readableOn(brand);
  const wa = spec.contact.whatsapp.replace(/\D/g, '');
  const waText = encodeURIComponent(isEn ? `Hi ${c.business_name}, I found you online.` : `${c.business_name} 🙏`);
  const tel = spec.contact.phone || spec.contact.whatsapp;
  const live = mode === 'live';

  const offerings = c.offerings
    .map(
      (o) => `<li class="card">
        <h3>${esc(o.name)}</h3>
        ${o.description ? `<p>${esc(o.description)}</p>` : ''}
        ${o.price ? `<p class="price"><span class="sr-only">Price: </span>${esc(o.price)}</p>` : ''}
      </li>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${esc(code)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.business_name)}${c.tagline ? ` — ${esc(c.tagline)}` : ''}</title>
<meta name="description" content="${esc(c.tagline || c.about.slice(0, 150))}">
${live ? '' : '<meta name="robots" content="noindex">'}
${hasOther ? `<link rel="alternate" hreflang="${esc(otherCode)}" href="${esc(otherHref)}">` : ''}
<style>
:root{--brand:${brand};--on-brand:${onBrand};--ink:#1a1a1a;--muted:#4a4a4a;--bg:#ffffff;--soft:#f6f4f0}
*{box-sizing:border-box}
body{margin:0;font:1.125rem/1.6 system-ui,-apple-system,"Noto Sans","Noto Sans Devanagari","Noto Sans Tamil",sans-serif;color:var(--ink);background:var(--bg)}
a{color:var(--brand)}
:focus-visible{outline:3px solid var(--brand);outline-offset:3px}
.skip{position:absolute;left:-999px}.skip:focus{left:1rem;top:1rem;background:#fff;padding:.5rem 1rem;z-index:9}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.wrap{max-width:60rem;margin:0 auto;padding:0 1.25rem}
header.hero{background:var(--brand);color:var(--on-brand);padding:3rem 0 2.5rem}
.hero .icon{font-size:3rem;line-height:1}
.hero h1{font-size:clamp(2rem,6vw,3.2rem);margin:.5rem 0 .25rem;line-height:1.15}
.hero p{font-size:1.25rem;margin:0 0 1.5rem;max-width:40rem}
.lang{float:right;color:var(--on-brand);font-weight:600;padding:.5rem .75rem;border:2px solid currentColor;border-radius:999px;text-decoration:none}
.btn{display:inline-flex;align-items:center;gap:.5rem;min-height:48px;padding:.75rem 1.25rem;border-radius:.75rem;font-weight:700;text-decoration:none;border:0;font-size:1.1rem;cursor:pointer}
.btn-light{background:#fff;color:#111}
.btn-brand{background:var(--brand);color:var(--on-brand)}
.actions{display:flex;flex-wrap:wrap;gap:.75rem}
section{padding:2.5rem 0}
section:nth-of-type(even){background:var(--soft)}
h2{font-size:1.75rem;margin:0 0 1rem;color:var(--brand)}
.grid{list-style:none;padding:0;margin:0;display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))}
.card{background:#fff;border:1px solid #ddd;border-radius:1rem;padding:1.25rem}
.card h3{margin:0 0 .25rem;font-size:1.25rem}.card p{margin:.25rem 0;color:var(--muted)}
.price{font-weight:700;color:var(--ink)!important;font-size:1.2rem}
dl{display:grid;grid-template-columns:auto 1fr;gap:.5rem 1.25rem}dt{font-weight:700}dd{margin:0}
form{display:grid;gap:1rem;max-width:32rem}
label{font-weight:600;display:block;margin-bottom:.25rem}
input,textarea{width:100%;font:inherit;padding:.75rem;border:2px solid #767676;border-radius:.5rem}
.hp{position:absolute;left:-9999px}
.note{background:#fff7d6;border-left:4px solid #8a6d00;padding:.75rem 1rem}
footer{padding:2rem 0;color:var(--muted);font-size:.95rem}
@media (prefers-reduced-motion:no-preference){.btn{transition:transform .1s}.btn:hover{transform:translateY(-1px)}}
</style>
</head>
<body>
<a class="skip" href="#main">${isEn ? 'Skip to content' : esc(c.ui.about_heading)}</a>
<header class="hero">
  <div class="wrap">
    ${hasOther ? `<a class="lang" href="${esc(otherHref)}" hreflang="${esc(otherCode)}" lang="${esc(otherCode)}">${esc(LANGUAGES[otherCode].native)}</a>` : ''}
    <div class="icon" aria-hidden="true">${esc(spec.icon)}</div>
    <h1>${esc(c.business_name)}</h1>
    ${c.tagline ? `<p>${esc(c.tagline)}</p>` : ''}
    <div class="actions">
      ${wa ? `<a class="btn btn-light" href="https://wa.me/${wa}?text=${waText}" rel="noopener">💬 ${esc(c.ui.whatsapp_label)}</a>` : ''}
      ${tel ? `<a class="btn btn-light" href="tel:${esc(tel)}">📞 ${esc(c.ui.call_label)}</a>` : ''}
    </div>
  </div>
</header>
<main id="main">
  ${c.about ? `<section aria-labelledby="about"><div class="wrap"><h2 id="about">${esc(c.ui.about_heading)}</h2><p>${nl2br(c.about)}</p></div></section>` : ''}
  <section aria-labelledby="offer"><div class="wrap"><h2 id="offer">${esc(c.ui.offerings_heading)}</h2><ul class="grid">${offerings}</ul></div></section>
  ${
    c.hours || c.address
      ? `<section aria-labelledby="visit"><div class="wrap"><h2 id="visit">${esc(c.ui.address_label)}</h2><dl>
      ${c.hours ? `<dt>${esc(c.ui.hours_label)}</dt><dd>${esc(c.hours)}</dd>` : ''}
      ${c.address ? `<dt>${esc(c.ui.address_label)}</dt><dd>${esc(c.address)}${spec.contact.map_query ? ` — <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spec.contact.map_query)}" rel="noopener">Google Maps</a>` : ''}</dd>` : ''}
      </dl></div></section>`
      : ''
  }
  <section aria-labelledby="contact"><div class="wrap">
    <h2 id="contact">${esc(c.ui.contact_heading)}</h2>
    ${live ? '' : '<p class="note" role="note">Preview — the form goes live after the owner approves publishing.</p>'}
    <form method="post" action="${esc(basePath)}/contact">
      <input type="hidden" name="lang" value="${esc(code)}">
      <div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
      <div><label for="name">${esc(c.ui.name_label)}</label><input id="name" name="name" required maxlength="80" autocomplete="name"></div>
      <div><label for="reply">${esc(c.ui.phone_label)}</label><input id="reply" name="reply" required maxlength="120" autocomplete="tel"></div>
      <div><label for="message">${esc(c.ui.message_label)}</label><textarea id="message" name="message" rows="4" required maxlength="1500"></textarea></div>
      <button class="btn btn-brand" type="submit"${live ? '' : ' disabled'}>${esc(c.ui.send_label)}</button>
    </form>
  </div></section>
</main>
<footer><div class="wrap">© ${new Date().getFullYear()} ${esc(c.business_name)} · Made with <a href="/">BolBiz</a> — voice-first websites, built with Claude, hosted on GoDaddy.</div></footer>
</body>
</html>`;
}

export function renderNotice(title, body, { lang = 'en', backHref = '/' } = {}) {
  return `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:1.2rem/1.6 system-ui,"Noto Sans",sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.25rem;color:#1a1a1a}a{color:#1f5f8b;font-weight:700}</style></head>
<body><main><h1>${esc(title)}</h1><p>${esc(body)}</p><p><a href="${esc(backHref)}">←</a></p></main></body></html>`;
}
