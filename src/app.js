import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, isConfigured } from './config.js';
import { createSession, getSession, drafts, sites, enquiries } from './services/store.js';
import { runAgentTurn } from './agent/agent.js';
import { publishDraft, translateForOwner } from './services/launch.js';
import { sendMail } from './services/mailer.js';
import { renderSite, renderNotice, esc } from './site/render.js';
import { LANGUAGES } from './site/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEECH_LANGS = new Set(Object.values(LANGUAGES).map((l) => l.speech));

export function createApp(deps = {}) {
  const app = express();
  app.set('trust proxy', config.trustProxy === 'false' ? false : Number(config.trustProxy) || config.trustProxy);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));

  const limiter = (max, windowMin) =>
    rateLimit({ windowMs: windowMin * 60_000, limit: max, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests, please slow down.' } });

  const baseUrl = (req) => config.publicBaseUrl || `${req.protocol}://${req.get('host')}`;

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  app.get('/api/status', (_req, res) =>
    res.json({ claude: isConfigured.claude(), godaddy: isConfigured.godaddy(), email: isConfigured.smtp(), languages: LANGUAGES }),
  );

  // ---------- agent ----------
  app.post('/api/session', limiter(30, 10), (req, res) => {
    const lang = SPEECH_LANGS.has(req.body?.lang) ? req.body.lang : 'en-IN';
    const s = createSession(lang);
    res.json({ sessionId: s.id });
  });

  app.post('/api/agent', limiter(40, 10), async (req, res) => {
    const session = getSession(req.body?.sessionId);
    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 2000) : '';
    if (!session) return res.status(404).json({ error: 'Session expired. Please refresh.' });
    if (!text) return res.status(400).json({ error: 'Say or type something first.' });
    if (session.busy) return res.status(409).json({ error: 'Still working on your last message.' });
    if (!isConfigured.claude() && !deps.client) return res.status(503).json({ error: 'The AI service is not configured on this server.' });
    if (SPEECH_LANGS.has(req.body.lang)) session.lang = req.body.lang;

    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    const emit = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    const ping = setInterval(() => res.write(': ping\n\n'), 15_000);

    session.busy = true;
    try {
      await runAgentTurn(session, text, emit, deps);
    } catch (e) {
      console.error('[agent]', e.status || '', e.message);
      emit('error', { text: e.status === 429 ? 'The assistant is busy, please try again in a moment.' : 'Sorry, something went wrong. Please try again.' });
    } finally {
      session.busy = false;
      clearInterval(ping);
      emit('done', {});
      res.end();
    }
  });

  // Human-in-the-loop: the ONLY way a site goes live is the owner pressing Approve.
  app.post('/api/approve', limiter(10, 10), async (req, res) => {
    const session = getSession(req.body?.sessionId);
    if (!session) return res.status(404).json({ error: 'Session expired.' });
    try {
      const out = await publishDraft(session, baseUrl(req), deps);
      res.json(out);
    } catch (e) {
      res.status(e.status || 500).json({ error: e.status ? e.message : 'Could not publish.' });
    }
  });

  // ---------- previews & published sites ----------
  // (Express routing is non-strict, so '/s/x' and '/s/x/' both match the same handler.)
  const ID = /^[A-Za-z0-9_-]{8,20}$/;
  const SLUG = /^[a-z0-9-]{2,40}$/;

  const servePreview = (lang) => async (req, res) => {
    if (!ID.test(req.params.id)) return res.status(404).end();
    const d = await drafts.get(req.params.id);
    if (!d) return res.status(404).send(renderNotice('Not found', 'This preview does not exist.'));
    res.set('X-Robots-Tag', 'noindex').send(renderSite(d.spec, { lang, mode: 'preview', basePath: `/preview/${req.params.id}` }));
  };
  app.get('/preview/:id/', servePreview('primary'));
  app.get('/preview/:id/en', servePreview('en'));

  const loadSite = async (req, res) => {
    const site = SLUG.test(req.params.slug) ? await sites.get(req.params.slug) : null;
    if (!site) res.status(404).send(renderNotice('Not found', 'This business page does not exist yet.'));
    return site;
  };
  app.get('/s/:slug/', async (req, res) => {
    const site = await loadSite(req, res);
    if (site) res.send(renderSite(site.spec, { lang: 'primary', basePath: `/s/${site.spec.slug}` }));
  });
  app.get('/s/:slug/en', async (req, res) => {
    const site = await loadSite(req, res);
    if (site) res.send(renderSite(site.spec, { lang: 'en', basePath: `/s/${site.spec.slug}` }));
  });
  app.get('/s/:slug/poster', async (req, res) => {
    const site = await loadSite(req, res);
    if (site) res.send(renderPoster(site, baseUrl(req)));
  });
  app.get('/s/:slug/qr.svg', async (req, res) => {
    const site = await loadSite(req, res);
    if (site) res.type('image/svg+xml').send(site.qrSvg);
  });

  // Customer enquiry on a generated site → owner's inbox, translated into the owner's language.
  app.post('/s/:slug/contact', limiter(5, 10), async (req, res) => {
    const site = await loadSite(req, res);
    if (!site) return;
    const { name, reply, message, website } = req.body || {};
    const back = `/s/${site.spec.slug}/`;
    const lang = site.spec.primary_lang;
    if (website) return res.send(renderNotice('Thank you', 'Your message was sent.', { backHref: back })); // honeypot
    if (!name || !reply || !message || String(message).length > 1500) {
      return res.status(400).send(renderNotice('Missing details', 'Please fill in your name, how to reach you and your message.', { backHref: back }));
    }
    const translated = await translateForOwner(message, lang, deps);
    const biz = site.spec.content.primary.business_name;
    const text = [
      `New enquiry for ${biz} from your BolBiz website`,
      '',
      `Name: ${name}`,
      `Reach them at: ${reply}`,
      '',
      translated ? `${LANGUAGES[lang].name}:\n${translated}\n\nOriginal:\n${message}` : message,
    ].join('\n');
    // Save first, so a lead is never lost even if email delivery fails.
    const id = await enquiries.add({ slug: site.spec.slug, name, reply, message, translated });
    try {
      const r = await sendMail({ to: site.spec.contact.email || config.smtp.contactTo, subject: `New enquiry: ${biz}`, text, replyTo: String(reply).includes('@') ? reply : undefined }, deps);
      if (r.sent) await enquiries.markEmailed(id);
    } catch (e) {
      console.error('[contact] email failed, enquiry stored', id, e.message);
    }
    res.send(renderNotice('Thank you 🙏', `${biz} will get back to you soon.`, { backHref: back }));
  });

  // BolBiz's own contact form → hello@<our-domain> (Titan mailbox).
  app.post('/api/contact', limiter(5, 10), async (req, res) => {
    const { name, email, message, website } = req.body || {};
    if (website) return res.json({ ok: true });
    const valid = typeof name === 'string' && name.trim() && typeof message === 'string' && message.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
    if (!valid || message.length > 2000 || name.length > 100) return res.status(400).json({ error: 'Please enter your name, a valid email and a message.' });
    try {
      const r = await sendMail({ subject: `BolBiz contact: ${name}`, text: `From: ${name} <${email}>\n\n${message}`, replyTo: email }, deps);
      if (!r.sent) return res.status(503).json({ error: 'Email is not configured on this server yet.' });
      res.json({ ok: true });
    } catch (e) {
      console.error('[contact]', e.message);
      res.status(502).json({ error: 'Could not send right now. Please try again later.' });
    }
  });

  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', extensions: ['html'] }));
  app.use((_req, res) => res.status(404).send(renderNotice('Not found', 'This page does not exist.')));
  return app;
}

function renderPoster(site, base) {
  const c = site.spec.content.primary;
  const url = `${base}/s/${site.spec.slug}/`;
  return `<!doctype html><html lang="${esc(site.spec.primary_lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.business_name)} — poster</title>
<style>@page{size:A4;margin:0}body{margin:0;font-family:system-ui,"Noto Sans",sans-serif;display:flex;justify-content:center}
.p{width:210mm;min-height:297mm;box-sizing:border-box;padding:18mm;text-align:center;border-top:18mm solid ${esc(site.spec.brand_color)}}
h1{font-size:44pt;margin:6mm 0 2mm;color:${esc(site.spec.brand_color)}}.t{font-size:18pt;margin:0 0 10mm}
.q{width:120mm;margin:0 auto}.q svg{width:100%;height:auto}.l{font-size:24pt;font-weight:800;margin:8mm 0 2mm}.u{font-size:14pt;color:#333;word-break:break-all}
.i{font-size:48pt}</style></head>
<body><main class="p"><div class="i" aria-hidden="true">${esc(site.spec.icon)}</div><h1>${esc(c.business_name)}</h1><p class="t">${esc(c.tagline)}</p>
<div class="q" role="img" aria-label="QR code for ${esc(url)}">${site.qrSvg}</div>
<p class="l">${esc(site.kit?.poster_line || '')}</p><p class="u">${esc(url)}</p></main></body></html>`;
}
