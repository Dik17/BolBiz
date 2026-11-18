# BolBiz — *Bolo, aur business online.*

**A voice-first, multilingual Claude agent that takes India's small businesses from a spoken idea to a live, accessible website on their own GoDaddy domain, in minutes.**

GoDaddy Inclusive Innovation Hackathon 2026 · Built with Claude (Anthropic) · Hosted on GoDaddy

---

## The problem

India has more than 60 million micro-businesses: home bakers, tailors, kirana stores, tutors and artisans. Most of their owners think and sell in Hindi, Marathi, Tamil or another Indian language. Many find typing hard, and some have low vision. Website builders expect English, forms with 40 fields, and design skills. So these businesses stay invisible online, or depend entirely on marketplaces that take a cut.

## What BolBiz does

1. **Talk, don't type.** The owner picks one of 10 languages and taps a big mic. Every reply is read aloud.
2. **A Claude agent interviews them**, asking no more than three short questions, offering tappable quick replies, and filling in a live "business card".
3. **Live domain search on GoDaddy** through the Domains API v3 (availability and price), with a one-tap "Get it on GoDaddy" link.
4. **Bilingual site generation.** The site is written in the owner's language and in English, with a WhatsApp button, a call button, hours, a menu and a working contact form.
5. **Accessibility audit with self-correction.** Every build is checked for WCAG contrast, contactability, plain language, link purpose and language parity. The agent reads the findings and rebuilds until the site passes.
6. **Human in control.** The agent *cannot* publish. Only the owner's **Approve** tap can, and the server enforces this.
7. **Three plans, shown as real mockups.** After the build, the owner sees *their own* site in three designs side by side, each with its price: **Shuruaat** (free, one page), **Dukaan** (₹149/month: own GoDaddy domain, business email, contact form) and **Brand** (₹349/month: premium design, an order button on every item, highlights and FAQs). The owner picks one; the agent can't choose for them. Prices live in `src/site/plans.js`.
8. **Launch kit.** A printable QR poster for the shop counter, plus WhatsApp and Instagram captions in the owner's language.
9. **Enquiries in your language.** When a customer writes in English through the site's form, the owner gets the message by email, translated into their language. Every enquiry is also saved, so no lead is lost.

## How Claude and GoDaddy are used

| Piece | How |
|---|---|
| **Claude Sonnet 5.5** | Runs the agent loop with tool use: `update_business_profile`, `show_quick_replies`, `search_domains`, `build_website`, `request_publish_approval`. Multi-step and self-correcting. |
| **Claude Haiku 5.5** | Handles the cheap, high-volume steps: launch-kit copy (structured JSON) and translating customer enquiries for the owner. |
| **Prompt caching** | The system prompt and tool definitions are marked `cache_control: ephemeral`, so every turn after the first reads them from cache. |
| **Structured output, not HTML** | Claude writes a JSON site spec. We validate it and render it with our own escaped template, so the model can never inject markup or scripts. |
| **GoDaddy Domains API v3** | `GET /v3/domains/check-availability` and `/v3/domains/suggestions`, authenticated with a Personal Access Token. If no token is set, it falls back to public RDAP data so the demo never breaks. |
| **GoDaddy VPS** | Docker Compose with Caddy, which provides automatic HTTPS. |
| **GoDaddy domain + Titan email** | The site runs on our own domain. The contact form sends to `hello@` our domain over Titan SMTP. |

## Architecture

```
Browser (Web Speech API in → speechSynthesis out)
   │  POST /api/agent  (Server-Sent Events stream of agent steps)
   ▼
Express ──► Agent loop (Sonnet + tools) ──► GoDaddy Domains API v3
   │                  │
   │                  └─► build_website → validate → render → a11y audit → draft (SQLite)
   │
   ├─ POST /api/approve  (human click only) → publish → Haiku launch kit + QR → sites (SQLite)
   ├─ GET  /s/:slug[/en] (live bilingual site) · /s/:slug/poster (printable QR)
   └─ POST /s/:slug/contact → enquiries (SQLite) → Haiku translation → Titan SMTP → owner
```

```
src/
  agent/    agent.js (tool loop, caching) · tools.js (schemas + handlers) · prompts.js
  services/ godaddy.js · launch.js (publish, launch kit, translation) · mailer.js · store.js (SQLite)
  site/     schema.js (validation) · render.js (3 plan templates, escaped) · plans.js (pricing) · audit.js · contrast.js
public/     index.html · ui-core.js (shared UI) · app.js (API + voice) · styles.css · fonts/ (self-hosted Baloo 2, OFL)
test/       unit tests + an end-to-end agent flow with a scripted Claude
```

## Security and engineering practices

- **No secrets in code or the repo.** Everything comes from `.env`, which is git-ignored. `.env.example` documents each variable.
- **The model's output is treated as untrusted.** Every tool input is validated and clipped. All text is HTML-escaped. URLs are built only from validated parts.
- **Server-enforced approval gate.** There is no publish tool. `/api/approve` only works when a draft that passed the audit is awaiting approval, and an approval can't be replayed.
- **Conversation history stays on the server**, so a client can't forge tool results.
- **Hardening:** Helmet with a strict CSP (no inline scripts), rate limits on every write endpoint, a 32 kB body cap, honeypot fields, stripping of CR/LF from email headers, validation of slugs and IDs, and a non-root Docker user.
- **Bounded cost:** a cap on agent steps, `max_tokens`, history trimming that never splits a tool call from its result, and model routing (Haiku wherever it's enough).
- **Tests:** `npm test` runs unit tests plus a full scripted agent flow covering self-fix, the approval gate, publishing, enquiry translation and header injection. CI runs the tests, `npm audit` and a Docker build.

## Run locally

```bash
cp .env.example .env   # add ANTHROPIC_API_KEY (and optionally GODADDY_PAT)
npm install
npm start              # http://localhost:3000
npm test
```

Node 22 or later is required (it uses the built-in `node:sqlite`). Voice input works in Chrome and Edge; you can always type instead.

## Deploy on the GoDaddy VPS (Docker)

1. **Server:** check out the $0 VPS (4 vCPU / 8 GB), create an SSH key (`ssh-keygen -t ed25519`), add it to the server, then connect with `ssh root@<server-ip>`.
2. **Install Docker:** `curl -fsSL https://get.docker.com | sh`
3. **Domain:** buy it on godaddy.com, then point DNS at the server:
   ```bash
   gddy domain dns ...   # or in the GoDaddy DNS UI:
   # A    @    <server-ip>
   # A    www  <server-ip>
   ```
   (Run `gddy tree` to see the exact DNS commands for your CLI version.)
4. **App:**
   ```bash
   git clone https://github.com/<you>/bolbiz.git && cd bolbiz
   cp .env.example .env && nano .env      # DOMAIN, PUBLIC_BASE_URL, keys, Titan mailbox password
   docker compose up -d --build
   ```
   Caddy gets the HTTPS certificate on its own once DNS points to the server. Open ports 80 and 443 in the firewall if one is enabled.
5. **Email:** buy Titan Pro Light (1 month), create `hello@yourdomain` with the CLI, and put its password **only** in `.env` as `SMTP_PASS`. If the login is rejected, keep `SMTP_HOST=smtpout.secureserver.net` and use the full email address as the username.
6. **Check:** `curl https://yourdomain/healthz`, send a test email to the mailbox, and submit the contact form on the home page.

To update later: `./deploy/deploy.sh`

## Roadmap

- Custom domains per business, using Caddy on-demand TLS and the GoDaddy DNS API.
- Domain purchase inside the flow through the GoDaddy v3 quote/register endpoints, after explicit owner confirmation.
- WhatsApp-native onboarding via voice notes.
- An owner dashboard for enquiries.

## License

MIT. The Baloo 2 font is licensed under SIL OFL 1.1.
