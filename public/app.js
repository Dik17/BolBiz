// BolBiz server app — talks to /api/* and drives the shared UI (ui-core.js).
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const UI = window.BolBizUI;
  const state = { sessionId: null, busy: false, draftUrl: null, recog: null, listening: false, langs: {} };
  const speech = () => (state.langs[UI.state.lang] || {}).speech || 'en-IN';
  const speak = (text) => { if ($('readAloud')?.checked !== false) UI.speakBrowser(text, UI.state.lang); };

  async function init() {
    let status = { languages: {}, plans: [] };
    try { status = await (await fetch('/api/status')).json(); } catch { /* offline */ }
    state.langs = status.languages;
    setupSpeech();
    UI.setup({ languages: status.languages, plans: status.plans, onLang: () => { if (state.recog) state.recog.lang = speech(); } });
  }

  // ---------- voice in (Web Speech API) ----------
  function setupSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      UI.setVoiceUnavailable('Voice works in Chrome or Edge. You can also type below.');
      $('micBtn').addEventListener('click', () => $('textIn').focus());
      return;
    }
    const r = new SR();
    r.interimResults = true;
    r.continuous = false;
    let finalText = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      $('textIn').value = `${finalText} ${interim}`.trim();
    };
    r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') UI.setActivity(`Microphone: ${e.error}. You can type instead.`); };
    r.onend = () => {
      state.listening = false;
      UI.setListening(false);
      const text = finalText.trim() || $('textIn').value.trim();
      finalText = '';
      if (text) send(text);
    };
    state.recog = r;
    $('micBtn').addEventListener('click', () => {
      if (state.busy) return;
      if (state.listening) { r.stop(); return; }
      window.speechSynthesis?.cancel();
      $('textIn').value = '';
      r.lang = speech();
      try { r.start(); state.listening = true; UI.setListening(true); } catch { /* already started */ }
    });
  }

  // ---------- one owner turn, streamed ----------
  async function ensureSession() {
    if (state.sessionId) return;
    const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: speech() }) });
    if (!r.ok) throw new Error('Could not start. Please refresh the page.');
    state.sessionId = (await r.json()).sessionId;
  }

  async function send(text) {
    text = (text || '').trim();
    if (state.busy || !text) return;
    UI.clearQuick();
    $('textIn').value = '';
    UI.addMsg('owner', text);
    UI.mark('listen', 'done');
    state.busy = true;
    UI.setBusy(true);
    let bubble = UI.addMsg('saathi', null, { speakFn: (t) => UI.speakBrowser(t, UI.state.lang) });
    const spoken = [];
    try {
      await ensureSession();
      const res = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: state.sessionId, text, lang: speech() }) });
      if (res.status === 404) { state.sessionId = null; throw new Error('Your session expired. Please say that again.'); }
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || 'Something went wrong.');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i);
          buf = buf.slice(i + 2);
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            let ev;
            try { ev = JSON.parse(line.slice(6)); } catch { continue; }
            if (ev.type === 'message') {
              if (bubble) { UI.setMsg(bubble, ev.text); bubble = null; } else UI.addMsg('saathi', ev.text, { speakFn: (t) => UI.speakBrowser(t, UI.state.lang) });
              spoken.push(ev.text);
            } else handle(ev);
          }
        }
      }
      if (bubble) { bubble.remove(); bubble = null; }
      if (spoken.length) speak(spoken.join(' '));
    } catch (e) {
      bubble?.remove();
      UI.addMsg('saathi', e.message, { cls: 'err' });
    } finally {
      state.busy = false;
      UI.setBusy(false);
      UI.setActivity('');
    }
  }

  const TOOL_STEP = { update_business_profile: 'profile', search_domains: 'domains', build_website: 'build', request_publish_approval: 'approve' };
  function handle(ev) {
    switch (ev.type) {
      case 'status': UI.setActivity(ev.text); break;
      case 'tool': if (TOOL_STEP[ev.name]) UI.mark(TOOL_STEP[ev.name], 'now'); break;
      case 'profile': UI.renderProfile(ev.profile); break;
      case 'quick_replies': UI.renderQuick(ev.options, send); break;
      case 'domains': {
        const rdap = ev.domains[0]?.source === 'rdap';
        UI.renderDomains(ev.domains, { note: rdap ? 'Availability from public registry data. Prices appear when the GoDaddy API is connected.' : 'Live availability and prices from the GoDaddy Domains API.' });
        break;
      }
      case 'preview':
        state.draftUrl = ev.url;
        UI.hideApproval();
        UI.showDesigns(ev.audit, (plan, view) => ({ src: `${ev.url}${view === 'en' ? 'en' : ''}?plan=${plan}&v=${Date.now()}` }));
        break;
      case 'approval': UI.showApproval({ summary: ev.summary, domain: ev.domain?.domain }); break;
      case 'error': UI.addMsg('saathi', ev.text, { cls: 'err' }); break;
      default: break;
    }
  }

  // ---------- owner approves (the only way to publish) ----------
  $('approveBtn').addEventListener('click', async () => {
    const btn = $('approveBtn');
    btn.disabled = true;
    try {
      const r = await fetch('/api/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: state.sessionId, plan: UI.state.plan }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not publish.');
      UI.showLive({ url: j.url, label: j.url, kit: j.kit });
      UI.setKit(j.kit, UI.state.lang);
      $('posterLink').href = j.posterUrl;
      speak(j.kit.whatsapp_status);
    } catch (e) {
      UI.addMsg('saathi', e.message, { cls: 'err' });
    } finally {
      btn.disabled = false;
    }
  });

  $('composer').addEventListener('submit', (e) => { e.preventDefault(); send($('textIn').value); });

  // ---------- BolBiz contact form → Titan mailbox ----------
  $('contactForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const status = $('contactStatus');
    if (!f.checkValidity()) { status.textContent = 'Please fill in your name, a valid email and a message.'; return; }
    status.textContent = 'Sending…';
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(f))) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      status.textContent = 'Message sent. We will reply by email.';
      f.reset();
    } catch (err) {
      status.textContent = err.message || 'Message not sent. Try again in a minute.';
    }
  });

  init();
})();
