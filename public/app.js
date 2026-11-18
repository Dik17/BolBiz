// BolBiz front end — voice in, voice out, with the site taking shape live beside the conversation.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const UI = {
    en: { hint: "For example: “I make cakes and modaks at home in Kothrud. People order on WhatsApp.”", prompt: 'Tap the mic and tell me about your business', legend: 'Choose your language', type: 'Or type here…', send: 'Send', approve: 'Approve and publish', change: 'I want changes', listening: 'Listening… speak now', stop: 'Stop listening', start: 'Start speaking' },
    hi: { hint: "जैसे: “मैं घर पर केक बनाती हूँ, लोग WhatsApp पर ऑर्डर करते हैं।”", prompt: 'माइक दबाइए और अपने बिज़नेस के बारे में बताइए', legend: 'अपनी भाषा चुनिए', type: 'या यहाँ लिखिए…', send: 'भेजें', approve: 'मंज़ूर है, वेबसाइट चालू करें', change: 'मुझे बदलाव चाहिए', listening: 'सुन रहे हैं… बोलिए' },
    mr: { hint: "उदा.: “मी घरी केक बनवते, लोक WhatsApp वर ऑर्डर करतात.”", prompt: 'माइक दाबा आणि तुमच्या व्यवसायाबद्दल सांगा', legend: 'तुमची भाषा निवडा', type: 'किंवा इथे लिहा…', send: 'पाठवा', approve: 'मंजूर, वेबसाइट सुरू करा', change: 'मला बदल हवे आहेत', listening: 'ऐकत आहोत… बोला' },
    ta: { hint: "உதாரணம்: “நான் வீட்டில் கேக் செய்கிறேன், WhatsApp-ல் ஆர்டர் வருகிறது.”", prompt: 'மைக்கை அழுத்தி உங்கள் தொழிலைப் பற்றி சொல்லுங்கள்', legend: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்', type: 'அல்லது இங்கே எழுதுங்கள்…', send: 'அனுப்பு', approve: 'சரி, வெளியிடுங்கள்', change: 'மாற்றங்கள் வேண்டும்', listening: 'கேட்கிறோம்… பேசுங்கள்' },
    te: { hint: "ఉదా: “నేను ఇంట్లో కేకులు చేస్తాను, WhatsApp లో ఆర్డర్లు వస్తాయి.”", prompt: 'మైక్ నొక్కి మీ వ్యాపారం గురించి చెప్పండి', legend: 'మీ భాషను ఎంచుకోండి', type: 'లేదా ఇక్కడ రాయండి…', send: 'పంపు', approve: 'సరే, ప్రచురించండి', change: 'మార్పులు కావాలి', listening: 'వింటున్నాం… మాట్లాడండి' },
    bn: { hint: "যেমন: “আমি বাড়িতে কেক বানাই, WhatsApp-এ অর্ডার নিই।”", prompt: 'মাইক চাপুন আর আপনার ব্যবসার কথা বলুন', legend: 'আপনার ভাষা বেছে নিন', type: 'অথবা এখানে লিখুন…', send: 'পাঠান', approve: 'ঠিক আছে, প্রকাশ করুন', change: 'পরিবর্তন চাই', listening: 'শুনছি… বলুন' },
    gu: { hint: "દા.ત.: “હું ઘરે કેક બનાવું છું, WhatsApp પર ઓર્ડર લઉં છું.”", prompt: 'માઇક દબાવો અને તમારા વ્યવસાય વિશે કહો', legend: 'તમારી ભાષા પસંદ કરો', type: 'અથવા અહીં લખો…', send: 'મોકલો', approve: 'મંજૂર, પ્રકાશિત કરો', change: 'મારે ફેરફાર જોઈએ', listening: 'સાંભળીએ છીએ… બોલો' },
    kn: { hint: "ಉದಾ: “ನಾನು ಮನೆಯಲ್ಲಿ ಕೇಕ್ ಮಾಡುತ್ತೇನೆ, WhatsApp ನಲ್ಲಿ ಆರ್ಡರ್ ತೆಗೆದುಕೊಳ್ಳುತ್ತೇನೆ.”", prompt: 'ಮೈಕ್ ಒತ್ತಿ ನಿಮ್ಮ ವ್ಯಾಪಾರದ ಬಗ್ಗೆ ಹೇಳಿ', legend: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ', type: 'ಅಥವಾ ಇಲ್ಲಿ ಬರೆಯಿರಿ…', send: 'ಕಳುಹಿಸಿ', approve: 'ಸರಿ, ಪ್ರಕಟಿಸಿ', change: 'ಬದಲಾವಣೆ ಬೇಕು', listening: 'ಕೇಳುತ್ತಿದ್ದೇವೆ… ಮಾತನಾಡಿ' },
    ml: { hint: "ഉദാ: “ഞാൻ വീട്ടിൽ കേക്ക് ഉണ്ടാക്കുന്നു, WhatsApp-ൽ ഓർഡർ എടുക്കുന്നു.”", prompt: 'മൈക്ക് അമർത്തി നിങ്ങളുടെ ബിസിനസിനെക്കുറിച്ച് പറയൂ', legend: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക', type: 'അല്ലെങ്കിൽ ഇവിടെ എഴുതൂ…', send: 'അയയ്ക്കൂ', approve: 'ശരി, പ്രസിദ്ധീകരിക്കൂ', change: 'മാറ്റങ്ങൾ വേണം', listening: 'കേൾക്കുന്നു… സംസാരിക്കൂ' },
    pa: { hint: "ਜਿਵੇਂ: “ਮੈਂ ਘਰ ਵਿੱਚ ਕੇਕ ਬਣਾਉਂਦੀ ਹਾਂ, WhatsApp ਤੇ ਆਰਡਰ ਲੈਂਦੀ ਹਾਂ।”", prompt: 'ਮਾਈਕ ਦਬਾਓ ਅਤੇ ਆਪਣੇ ਕਾਰੋਬਾਰ ਬਾਰੇ ਦੱਸੋ', legend: 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ', type: 'ਜਾਂ ਇੱਥੇ ਲਿਖੋ…', send: 'ਭੇਜੋ', approve: 'ਠੀਕ ਹੈ, ਪ੍ਰਕਾਸ਼ਿਤ ਕਰੋ', change: 'ਮੈਨੂੰ ਬਦਲਾਅ ਚਾਹੀਦੇ ਹਨ', listening: 'ਸੁਣ ਰਹੇ ਹਾਂ… ਬੋਲੋ' },
  };
  const PROFILE_LABELS = { business_name: 'Name', category: 'Trade', offerings: 'Sells', area: 'Area', city: 'City', whatsapp: 'WhatsApp', phone: 'Phone', hours: 'Hours' };
  const TOOL_STEP = { update_business_profile: 'profile', search_domains: 'domains', build_website: 'build', request_publish_approval: 'approve' };
  const STEPS = ['listen', 'profile', 'domains', 'build', 'audit', 'approve', 'live'];

  const state = { sessionId: null, speech: 'hi-IN', busy: false, languages: {}, recog: null, listening: false };
  const iso = () => state.speech.slice(0, 2);
  const t = (k) => (UI[iso()] && UI[iso()][k]) || UI.en[k];

  // ---------- language ----------
  async function init() {
    let status = { languages: {} };
    try { status = await (await fetch('/api/status')).json(); } catch { /* offline */ }
    state.languages = status.languages || {};
    setupSpeech();
    const saved = safeGet('bolbiz-lang');
    const order = ['hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'pa', 'en'];
    const grid = $('langGrid');
    for (const code of order) {
      const L = state.languages[code];
      if (!L) continue;
      const label = document.createElement('label');
      label.lang = code;
      label.innerHTML = `<input type="radio" name="lang" value="${L.speech}"><span>${L.native}</span>`;
      grid.appendChild(label);
    }
    const pick = (saved && grid.querySelector(`input[value="${saved}"]`)) || grid.querySelector('input');
    if (pick) { pick.checked = true; setLang(pick.value); }
    grid.addEventListener('change', (e) => setLang(e.target.value));
  }

  function setLang(speech) {
    state.speech = speech;
    safeSet('bolbiz-lang', speech);
    const code = iso();
    $('talkHeading').textContent = t('prompt');
    $('talkHeading').lang = code;
    if (!state.noSpeech) { $('micHint').textContent = t('hint'); $('micHint').lang = code; }
    $('langLegend').textContent = t('legend');
    $('textIn').placeholder = t('type');
    $('sendBtn').textContent = t('send');
    $('approveBtn').textContent = t('approve');
    $('changeBtn').textContent = t('change');
    for (const el of [$('approveBtn'), $('changeBtn'), $('textIn')]) el.lang = code;
    if (state.recog) state.recog.lang = speech;
  }

  // ---------- speech in ----------
  function setupSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      state.noSpeech = true;
      $('micHint').textContent = 'Voice input works in Chrome or Edge. You can also type below.';
      $('micBtn').addEventListener('click', () => $('textIn').focus());
      return;
    }
    const r = new SR();
    r.interimResults = true;
    r.continuous = false;
    r.lang = state.speech;
    let finalText = '';
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      $('textIn').value = (finalText + ' ' + interim).trim();
    };
    r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') setActivity(`Microphone: ${e.error}. You can type instead.`); };
    r.onend = () => {
      setListening(false);
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
      try { r.start(); setListening(true); } catch { /* already started */ }
    });
  }

  function setListening(on) {
    state.listening = on;
    $('micBtn').setAttribute('aria-pressed', String(on));
    $('micLabel').textContent = on ? t('stop') : t('start');
    setActivity(on ? t('listening') : '');
    if (on) mark('listen', 'now');
  }

  // ---------- speech out ----------
  function speak(text) {
    if (!$('readAloud').checked || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = state.speech;
    const voices = speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang === state.speech) || voices.find((x) => x.lang.startsWith(iso()));
    if (v) u.voice = v;
    u.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // ---------- conversation ----------
  function addMsg(who, text, cls = '') {
    const div = document.createElement('div');
    div.className = `msg ${who} ${cls}`.trim();
    div.lang = who === 'saathi' || who === 'owner' ? iso() : 'en';
    div.textContent = text;
    if (who === 'saathi' && window.speechSynthesis) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'speak';
      b.textContent = '🔊';
      b.setAttribute('aria-label', 'Read this aloud');
      b.addEventListener('click', () => { const was = $('readAloud').checked; $('readAloud').checked = true; speak(text); $('readAloud').checked = was; });
      div.appendChild(b);
    }
    $('log').appendChild(div);
    $('log').scrollTop = $('log').scrollHeight;
  }

  const setActivity = (s) => { $('activity').textContent = s; };
  function setBusy(b) {
    state.busy = b;
    $('sendBtn').disabled = b;
    $('micBtn').disabled = b;
  }

  async function ensureSession() {
    if (state.sessionId) return state.sessionId;
    const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: state.speech }) });
    if (!r.ok) throw new Error('Could not start. Please refresh the page.');
    state.sessionId = (await r.json()).sessionId;
    return state.sessionId;
  }

  async function send(text) {
    if (state.busy || !text.trim()) return;
    $('quick').innerHTML = '';
    $('textIn').value = '';
    addMsg('owner', text);
    mark('listen', 'done');
    setBusy(true);
    try {
      await ensureSession();
      const res = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: state.sessionId, text, lang: state.speech }) });
      if (res.status === 404) { state.sessionId = null; throw new Error('Your session expired. Please say that again.'); }
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || 'Something went wrong.');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      const spoken = [];
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
            try { handle(JSON.parse(line.slice(6)), spoken); } catch { /* ignore malformed */ }
          }
        }
      }
      if (spoken.length) speak(spoken.join(' '));
    } catch (e) {
      addMsg('saathi', e.message, 'err');
    } finally {
      setBusy(false);
      setActivity('');
    }
  }

  function handle(ev, spoken) {
    switch (ev.type) {
      case 'status': setActivity(ev.text); break;
      case 'message': addMsg('saathi', ev.text); spoken.push(ev.text); break;
      case 'tool': if (TOOL_STEP[ev.name]) mark(TOOL_STEP[ev.name], 'now'); break;
      case 'profile': renderProfile(ev.profile); break;
      case 'quick_replies': renderQuick(ev.options); break;
      case 'domains': renderDomains(ev.domains); break;
      case 'preview': renderPreview(ev); break;
      case 'audit': renderScore(ev); break;
      case 'approval': renderApproval(ev); break;
      case 'error': addMsg('saathi', ev.text, 'err'); break;
      default: break;
    }
  }

  // ---------- right-hand panels ----------
  function mark(step, how) {
    const idx = STEPS.indexOf(step);
    document.querySelectorAll('#journey li').forEach((li) => {
      const j = STEPS.indexOf(li.dataset.step);
      li.classList.remove('now');
      if (j < idx) li.classList.add('done');
      if (j === idx) { li.classList.toggle('done', how === 'done'); if (how === 'now') li.classList.add('now'); }
      li.removeAttribute('aria-current');
      if (j === idx && how === 'now') li.setAttribute('aria-current', 'step');
    });
  }

  function renderProfile(p) {
    const dl = $('profileList');
    dl.innerHTML = '';
    for (const [k, label] of Object.entries(PROFILE_LABELS)) {
      let v = p[k];
      if (!v || (Array.isArray(v) && !v.length)) continue;
      if (k === 'offerings') v = v.map((o) => (o.price ? `${o.name} (${o.price})` : o.name)).join(', ');
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); dd.textContent = v; dd.lang = iso();
      dl.append(dt, dd);
    }
    $('profilePanel').hidden = !dl.children.length;
    mark('profile', 'done');
  }

  function renderQuick(options) {
    const q = $('quick');
    q.innerHTML = '';
    for (const o of options || []) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o;
      b.lang = iso();
      b.addEventListener('click', () => send(o));
      q.appendChild(b);
    }
  }

  function money(p) {
    if (!p) return '';
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: p.currency, maximumFractionDigits: 2 }).format(p.amount); } catch { return `${p.amount} ${p.currency}`; }
  }

  function renderDomains(list) {
    const ul = $('domainList');
    ul.innerHTML = '';
    for (const d of list) {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = `d ${d.available === false ? 'no' : ''}`;
      name.textContent = d.domain;
      const info = document.createElement('span');
      if (d.available) {
        info.className = 'ok';
        info.textContent = d.price ? `Available · ${money(d.price)}/yr` : 'Available';
      } else {
        info.textContent = d.available === false ? 'Taken' : 'Unknown';
      }
      li.append(name, info);
      if (d.available) {
        const a = document.createElement('a');
        a.href = d.buyUrl; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Get it on GoDaddy';
        a.setAttribute('aria-label', `Get ${d.domain} on GoDaddy`);
        li.appendChild(a);
      }
      ul.appendChild(li);
    }
    const src = list[0]?.source;
    $('domainSource').textContent = src === 'rdap' ? 'Availability from public registry data. Prices appear when the GoDaddy API is connected.' : 'Live availability and prices from the GoDaddy Domains API.';
    $('domainPanel').hidden = !list.length;
    mark('domains', 'done');
  }

  function renderScore(a) {
    const s = $('score');
    s.textContent = `Accessibility ${a.score}/100`;
    s.className = `score ${a.passed ? 'pass' : 'fail'}`;
    if (a.passed) mark('audit', 'done');
  }

  function renderPreview(ev) {
    const url = `${ev.url}?v=${Date.now()}`;
    $('previewFrame').src = url;
    $('previewLink').href = ev.url;
    $('previewPanel').hidden = false;
    renderScore(ev.audit);
    mark(ev.audit.passed ? 'audit' : 'build', ev.audit.passed ? 'done' : 'now');
    $('approvePanel').hidden = true;
  }

  function renderApproval(ev) {
    $('approveSummary').textContent = ev.summary || '';
    $('approveSummary').lang = iso();
    $('approveDomain').textContent = ev.domain?.available ? `Suggested domain: ${ev.domain.domain}${ev.domain.price ? ` (${money(ev.domain.price)}/yr)` : ''}` : '';
    $('approvePanel').hidden = false;
    mark('approve', 'now');
    $('approveBtn').focus({ preventScroll: true });
  }

  $('approveBtn').addEventListener('click', async () => {
    const btn = $('approveBtn');
    btn.disabled = true;
    try {
      const r = await fetch('/api/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: state.sessionId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not publish.');
      $('approvePanel').hidden = true;
      $('liveLink').href = j.url; $('liveLink').textContent = j.url;
      $('kitWa').textContent = j.kit.whatsapp_status; $('kitWa').lang = iso();
      $('kitIg').textContent = j.kit.instagram_caption; $('kitIg').lang = iso();
      $('posterLink').href = j.posterUrl;
      $('livePanel').hidden = false;
      mark('live', 'done');
      document.querySelectorAll('#journey li').forEach((li) => li.classList.add('done'));
      $('livePanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
      speak(j.kit.whatsapp_status);
    } catch (e) {
      addMsg('saathi', e.message, 'err');
    } finally {
      btn.disabled = false;
    }
  });
  $('changeBtn').addEventListener('click', () => { $('approvePanel').hidden = true; $('textIn').focus(); });

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('.copy');
    if (!b) return;
    try { await navigator.clipboard.writeText($(b.dataset.copy).textContent); b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1500); } catch { /* clipboard blocked */ }
  });

  $('composer').addEventListener('submit', (e) => { e.preventDefault(); send($('textIn').value); });

  // ---------- BolBiz contact form → Titan mailbox ----------
  $('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const status = $('contactStatus');
    if (!f.checkValidity()) { status.textContent = 'Please fill in your name, a valid email and a message.'; return; }
    status.textContent = 'Sending…';
    try {
      const body = Object.fromEntries(new FormData(f));
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      status.textContent = 'Message sent. We will reply by email.';
      f.reset();
    } catch (err) {
      status.textContent = err.message || 'Message not sent. Try again in a minute.';
    }
  });

  function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } }

  init();
})();
