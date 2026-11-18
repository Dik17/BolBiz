// BolBiz UI core — DOM rendering shared by the server app (app.js) and the test page.
// It knows nothing about networking: callers pass data in and get events out.
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const STR = {
    en: { hint: 'For example: “I make cakes and modaks at home in Kothrud. People order on WhatsApp.”', prompt: 'Tap the mic and tell me about your business', legend: 'Choose your language', type: 'Or type here…', send: 'Send', approve: 'Approve and publish', change: 'I want changes', listening: 'Listening… speak now' },
    hi: { hint: 'जैसे: “मैं घर पर केक बनाती हूँ, लोग WhatsApp पर ऑर्डर करते हैं।”', prompt: 'माइक दबाइए और अपने बिज़नेस के बारे में बताइए', legend: 'अपनी भाषा चुनिए', type: 'या यहाँ लिखिए…', send: 'भेजें', approve: 'मंज़ूर है, वेबसाइट चालू करें', change: 'मुझे बदलाव चाहिए', listening: 'सुन रहे हैं… बोलिए' },
    mr: { hint: 'उदा.: “मी घरी केक बनवते, लोक WhatsApp वर ऑर्डर करतात.”', prompt: 'माइक दाबा आणि तुमच्या व्यवसायाबद्दल सांगा', legend: 'तुमची भाषा निवडा', type: 'किंवा इथे लिहा…', send: 'पाठवा', approve: 'मंजूर, वेबसाइट सुरू करा', change: 'मला बदल हवे आहेत', listening: 'ऐकत आहोत… बोला' },
    ta: { hint: 'உதாரணம்: “நான் வீட்டில் கேக் செய்கிறேன், WhatsApp-ல் ஆர்டர் வருகிறது.”', prompt: 'மைக்கை அழுத்தி உங்கள் தொழிலைப் பற்றி சொல்லுங்கள்', legend: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்', type: 'அல்லது இங்கே எழுதுங்கள்…', send: 'அனுப்பு', approve: 'சரி, வெளியிடுங்கள்', change: 'மாற்றங்கள் வேண்டும்', listening: 'கேட்கிறோம்… பேசுங்கள்' },
    te: { hint: 'ఉదా: “నేను ఇంట్లో కేకులు చేస్తాను, WhatsApp లో ఆర్డర్లు వస్తాయి.”', prompt: 'మైక్ నొక్కి మీ వ్యాపారం గురించి చెప్పండి', legend: 'మీ భాషను ఎంచుకోండి', type: 'లేదా ఇక్కడ రాయండి…', send: 'పంపు', approve: 'సరే, ప్రచురించండి', change: 'మార్పులు కావాలి', listening: 'వింటున్నాం… మాట్లాడండి' },
    bn: { hint: 'যেমন: “আমি বাড়িতে কেক বানাই, WhatsApp-এ অর্ডার নিই।”', prompt: 'মাইক চাপুন আর আপনার ব্যবসার কথা বলুন', legend: 'আপনার ভাষা বেছে নিন', type: 'অথবা এখানে লিখুন…', send: 'পাঠান', approve: 'ঠিক আছে, প্রকাশ করুন', change: 'পরিবর্তন চাই', listening: 'শুনছি… বলুন' },
    gu: { hint: 'દા.ત.: “હું ઘરે કેક બનાવું છું, WhatsApp પર ઓર્ડર લઉં છું.”', prompt: 'માઇક દબાવો અને તમારા વ્યવસાય વિશે કહો', legend: 'તમારી ભાષા પસંદ કરો', type: 'અથવા અહીં લખો…', send: 'મોકલો', approve: 'મંજૂર, પ્રકાશિત કરો', change: 'મારે ફેરફાર જોઈએ', listening: 'સાંભળીએ છીએ… બોલો' },
    kn: { hint: 'ಉದಾ: “ನಾನು ಮನೆಯಲ್ಲಿ ಕೇಕ್ ಮಾಡುತ್ತೇನೆ, WhatsApp ನಲ್ಲಿ ಆರ್ಡರ್ ತೆಗೆದುಕೊಳ್ಳುತ್ತೇನೆ.”', prompt: 'ಮೈಕ್ ಒತ್ತಿ ನಿಮ್ಮ ವ್ಯಾಪಾರದ ಬಗ್ಗೆ ಹೇಳಿ', legend: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ', type: 'ಅಥವಾ ಇಲ್ಲಿ ಬರೆಯಿರಿ…', send: 'ಕಳುಹಿಸಿ', approve: 'ಸರಿ, ಪ್ರಕಟಿಸಿ', change: 'ಬದಲಾವಣೆ ಬೇಕು', listening: 'ಕೇಳುತ್ತಿದ್ದೇವೆ… ಮಾತನಾಡಿ' },
    ml: { hint: 'ഉദാ: “ഞാൻ വീട്ടിൽ കേക്ക് ഉണ്ടാക്കുന്നു, WhatsApp-ൽ ഓർഡർ എടുക്കുന്നു.”', prompt: 'മൈക്ക് അമർത്തി നിങ്ങളുടെ ബിസിനസിനെക്കുറിച്ച് പറയൂ', legend: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക', type: 'അല്ലെങ്കിൽ ഇവിടെ എഴുതൂ…', send: 'അയയ്ക്കൂ', approve: 'ശരി, പ്രസിദ്ധീകരിക്കൂ', change: 'മാറ്റങ്ങൾ വേണം', listening: 'കേൾക്കുന്നു… സംസാരിക്കൂ' },
    pa: { hint: 'ਜਿਵੇਂ: “ਮੈਂ ਘਰ ਵਿੱਚ ਕੇਕ ਬਣਾਉਂਦੀ ਹਾਂ, WhatsApp ਤੇ ਆਰਡਰ ਲੈਂਦੀ ਹਾਂ।”', prompt: 'ਮਾਈਕ ਦਬਾਓ ਅਤੇ ਆਪਣੇ ਕਾਰੋਬਾਰ ਬਾਰੇ ਦੱਸੋ', legend: 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ', type: 'ਜਾਂ ਇੱਥੇ ਲਿਖੋ…', send: 'ਭੇਜੋ', approve: 'ਠੀਕ ਹੈ, ਪ੍ਰਕਾਸ਼ਿਤ ਕਰੋ', change: 'ਮੈਨੂੰ ਬਦਲਾਅ ਚਾਹੀਦੇ ਹਨ', listening: 'ਸੁਣ ਰਹੇ ਹਾਂ… ਬੋਲੋ' },
  };
  const ORDER = ['hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'pa', 'en'];
  const PROFILE_LABELS = { business_name: 'Name', category: 'Trade', offerings: 'Sells', area: 'Area', city: 'City', whatsapp: 'WhatsApp', phone: 'Phone', hours: 'Hours' };
  const STEPS = ['listen', 'profile', 'domains', 'build', 'audit', 'approve', 'live'];

  const S = { lang: 'hi', languages: {}, plans: [], plan: null, view: 'primary', previewFor: null, voiceHint: true, onLang: null };
  const t = (k) => (STR[S.lang] && STR[S.lang][k]) || STR.en[k];
  const inr = (n) => (n ? `₹${n}` : 'Free');
  const safe = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } } };

  // ---------- phones scale their 390px-wide iframe to fit the frame ----------
  const ro = 'ResizeObserver' in window ? new ResizeObserver((entries) => entries.forEach((e) => fit(e.target))) : null;
  function fit(screen) { screen.style.setProperty('--s', String(screen.clientWidth / 390)); }
  function phone(frameAttrs) {
    const ph = document.createElement('div');
    ph.className = 'phone';
    const sc = document.createElement('div');
    sc.className = 'screen';
    const fr = document.createElement('iframe');
    fr.setAttribute('loading', 'lazy');
    fr.setAttribute('tabindex', '-1');
    fr.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
    Object.entries(frameAttrs).forEach(([k, v]) => fr.setAttribute(k, v));
    sc.appendChild(fr);
    ph.appendChild(sc);
    if (ro) ro.observe(sc); else requestAnimationFrame(() => fit(sc));
    return { el: ph, frame: fr };
  }
  function load(frame, p) {
    if (p.srcdoc != null) { frame.removeAttribute('src'); frame.srcdoc = p.srcdoc; } else frame.src = p.src;
  }

  const UI = {
    t, STR, state: S,

    setup({ languages, plans, onLang }) {
      S.languages = languages; S.plans = plans; S.onLang = onLang;
      S.plan = (plans.find((p) => p.recommended) || plans[0]).id;
      const grid = $('langGrid');
      for (const code of ORDER) {
        const L = languages[code];
        if (!L) continue;
        const label = document.createElement('label');
        label.lang = code;
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'lang'; input.value = code;
        const span = document.createElement('span'); span.textContent = L.native;
        label.append(input, span);
        grid.appendChild(label);
      }
      const saved = safe.get('bolbiz-lang');
      const pick = grid.querySelector(`input[value="${saved && languages[saved] ? saved : 'hi'}"]`) || grid.querySelector('input');
      pick.checked = true;
      UI.setLang(pick.value);
      grid.addEventListener('change', (e) => UI.setLang(e.target.value));
      UI.renderPriceGrid();
      for (const [id, view] of [['viewOwn', 'primary'], ['viewEn', 'en']]) {
        $(id).addEventListener('click', () => {
          S.view = view;
          $('viewOwn').setAttribute('aria-pressed', String(view === 'primary'));
          $('viewEn').setAttribute('aria-pressed', String(view === 'en'));
          UI.refreshDesigns();
        });
      }
      $('changeBtn').addEventListener('click', () => { $('approvePanel').hidden = true; $('textIn').focus(); });
      document.addEventListener('click', async (e) => {
        const b = e.target.closest('.copy');
        if (!b) return;
        try { await navigator.clipboard.writeText($(b.dataset.copy).textContent); b.textContent = 'Copied'; } catch { b.textContent = 'Select the text to copy'; }
        setTimeout(() => (b.textContent = 'Copy'), 1800);
      });
    },

    setLang(code) {
      S.lang = code;
      safe.set('bolbiz-lang', code);
      $('talkHeading').textContent = t('prompt'); $('talkHeading').lang = code;
      $('langLegend').textContent = t('legend');
      if (S.voiceHint) { $('micHint').textContent = t('hint'); $('micHint').lang = code; }
      $('textIn').placeholder = t('type');
      $('sendBtn').textContent = t('send');
      $('approveBtn').textContent = t('approve');
      $('changeBtn').textContent = t('change');
      for (const el of [$('approveBtn'), $('changeBtn'), $('textIn'), $('sendBtn')]) el.lang = code;
      if (S.languages[code]) $('viewOwn').textContent = S.languages[code].native;
      $('viewOwn').lang = code;
      S.onLang?.(code);
    },
    setVoiceUnavailable(message) { S.voiceHint = false; $('micHint').textContent = message; $('micHint').lang = 'en'; },

    // ---------- conversation ----------
    addMsg(who, text, { cls = '', speakFn } = {}) {
      const div = document.createElement('div');
      div.className = `msg ${who} ${cls}`.trim();
      div.lang = cls === 'err' ? 'en' : S.lang;
      if (who === 'saathi') { const w = document.createElement('span'); w.className = 'who'; w.lang = 'en'; w.textContent = 'Saathi'; div.appendChild(w); }
      const span = document.createElement('span');
      span.className = 'txt';
      if (text == null) span.innerHTML = '<span class="typing" aria-label="Saathi is typing"><i></i><i></i><i></i></span>';
      else span.textContent = text;
      div.appendChild(span);
      if (who === 'saathi' && !cls && speakFn) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'speak'; b.textContent = '🔊';
        b.setAttribute('aria-label', 'Read this aloud');
        b.addEventListener('click', () => speakFn(span.textContent));
        div.appendChild(b);
      }
      $('log').appendChild(div);
      $('log').scrollTop = $('log').scrollHeight;
      return div;
    },
    setMsg(div, text) { div.querySelector('.txt').textContent = text; $('log').scrollTop = $('log').scrollHeight; },
    setActivity(s) { $('activity').textContent = s || ''; },
    setBusy(b) { $('sendBtn').disabled = b; $('micBtn').disabled = b; },
    setListening(on) {
      $('micBtn').setAttribute('aria-pressed', String(on));
      $('micLabel').textContent = on ? 'Stop listening' : 'Start speaking';
      UI.setActivity(on ? t('listening') : '');
      if (on) UI.mark('listen', 'now');
    },

    mark(step, how) {
      const idx = STEPS.indexOf(step);
      document.querySelectorAll('#journey li').forEach((li) => {
        const j = STEPS.indexOf(li.dataset.step);
        li.classList.remove('now'); li.removeAttribute('aria-current');
        if (j < idx) li.classList.add('done');
        if (j === idx) { li.classList.toggle('done', how === 'done'); if (how === 'now') { li.classList.add('now'); li.setAttribute('aria-current', 'step'); } }
      });
    },
    allDone() { document.querySelectorAll('#journey li').forEach((li) => { li.classList.remove('now'); li.classList.add('done'); }); },

    // ---------- side panels ----------
    renderProfile(p) {
      const dl = $('profileList');
      dl.innerHTML = '';
      for (const [k, label] of Object.entries(PROFILE_LABELS)) {
        let v = p[k];
        if (!v || (Array.isArray(v) && !v.length)) continue;
        if (k === 'offerings') v = v.map((o) => (o.price ? `${o.name} (${o.price})` : o.name)).join(', ');
        const dt = document.createElement('dt'); dt.textContent = label;
        const dd = document.createElement('dd'); dd.textContent = v; dd.lang = S.lang;
        dl.append(dt, dd);
      }
      $('profilePanel').hidden = !dl.children.length;
      $('sideEmpty').hidden = true;
      UI.mark('profile', 'done');
    },
    renderQuick(options, onPick) {
      const q = $('quick');
      q.innerHTML = '';
      (options || []).forEach((o, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = o; b.lang = S.lang;
        b.style.animationDelay = `${i * 60}ms`;
        b.addEventListener('click', () => onPick(o));
        q.appendChild(b);
      });
    },
    clearQuick() { $('quick').innerHTML = ''; },
    renderDomains(list, { checked = true, note = '' } = {}) {
      const ul = $('domainList');
      ul.innerHTML = '';
      const money = (p) => { try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.amount); } catch { return `${p.amount} ${p.currency}`; } };
      for (const d of list) {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.className = `d ${d.available === false ? 'no' : ''}`;
        name.textContent = d.domain;
        li.appendChild(name);
        if (checked) {
          const info = document.createElement('span');
          if (d.available) { info.className = 'ok-t'; info.textContent = d.price ? `${money(d.price)}/yr` : 'Available'; } else info.textContent = d.available === false ? 'Taken' : 'Unknown';
          li.appendChild(info);
        }
        if (d.available !== false) {
          const a = document.createElement('a');
          a.href = d.buyUrl || `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(d.domain)}`;
          a.target = '_blank'; a.rel = 'noopener';
          a.textContent = checked ? 'Get it' : 'Check on GoDaddy';
          a.setAttribute('aria-label', `${a.textContent}: ${d.domain} on GoDaddy`);
          li.appendChild(a);
        }
        ul.appendChild(li);
      }
      $('domainSource').textContent = note;
      $('domainPanel').hidden = !list.length;
      $('sideEmpty').hidden = true;
      UI.mark('domains', 'done');
    },

    // ---------- design chooser ----------
    showDesigns(audit, previewFor) {
      S.previewFor = previewFor;
      const s = $('score');
      s.textContent = `Accessibility ${audit.score}/100`;
      s.className = `score ${audit.passed ? 'pass' : 'fail'}`;
      const list = $('findings');
      list.innerHTML = '';
      for (const f of audit.findings || []) {
        const li = document.createElement('li');
        li.textContent = `${f.level === 'fail' ? 'Must fix' : 'Suggestion'}: ${f.message}`;
        list.appendChild(li);
      }
      $('findingsWrap').hidden = !(audit.findings || []).length;
      const wrap = $('planCards');
      if (!wrap.children.length) {
        for (const p of S.plans) {
          // A div with role=radio (an iframe can't live inside a <button>).
          const card = document.createElement('div');
          card.className = 'plan-card';
          card.setAttribute('role', 'radio');
          card.tabIndex = 0;
          card.addEventListener('keydown', (e) => {
            const cards = [...document.querySelectorAll('.plan-card')];
            const i = cards.indexOf(card);
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); UI.selectPlan(p.id); }
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); const n = cards[(i + 1) % cards.length]; n.focus(); UI.selectPlan(n.dataset.plan); }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); const n = cards[(i + cards.length - 1) % cards.length]; n.focus(); UI.selectPlan(n.dataset.plan); }
          });
          card.dataset.plan = p.id;
          const ph = phone({ title: `${p.name} design preview` });
          card.innerHTML = `${p.recommended ? '<span class="tag">Most popular</span>' : ''}
            <span class="plan-top"><span class="plan-name"></span><span class="plan-price"></span></span>
            <ul class="plan-feat"></ul><span class="plan-pick"></span>`;
          card.querySelector('.plan-name').innerHTML = `${p.name}<span class="plan-meaning"></span>`;
          card.querySelector('.plan-meaning').textContent = p.meaning;
          card.querySelector('.plan-price').innerHTML = p.price ? `₹${p.price}<small>/month</small>` : 'Free';
          const ul = card.querySelector('.plan-feat');
          for (const f of p.features.slice(p.id === 'basic' ? 0 : 1, 4)) { const li = document.createElement('li'); li.textContent = f; ul.appendChild(li); }
          card.insertBefore(ph.el, card.querySelector('.plan-top'));
          card._frame = ph.frame;
          card.addEventListener('click', () => UI.selectPlan(p.id));
          wrap.appendChild(card);
        }
      }
      UI.refreshDesigns();
      UI.selectPlan(S.plan, true);
      const first = $('chooser').hidden;
      $('chooser').hidden = false;
      if (first) setTimeout(() => $('chooser').scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
      UI.mark(audit.passed ? 'audit' : 'build', audit.passed ? 'done' : 'now');
    },
    refreshDesigns() {
      if (!S.previewFor) return;
      document.querySelectorAll('.plan-card').forEach((card) => load(card._frame, S.previewFor(card.dataset.plan, S.view)));
    },
    selectPlan(id, quiet) {
      S.plan = id;
      const p = S.plans.find((x) => x.id === id);
      document.querySelectorAll('.plan-card').forEach((c) => {
        const on = c.dataset.plan === id;
        c.setAttribute('aria-checked', String(on));
        c.setAttribute('aria-label', `${S.plans.find((x) => x.id === c.dataset.plan).name}, ${inr(S.plans.find((x) => x.id === c.dataset.plan).price)}`);
        c.querySelector('.plan-pick').textContent = on ? 'Chosen' : `Choose ${c.dataset.plan === 'basic' ? 'free' : S.plans.find((x) => x.id === c.dataset.plan).name}`;
      });
      $('approvePlan').textContent = `${p.name} · ${p.price ? `₹${p.price}/month` : 'Free'}`;
      if (!quiet) UI.onPlan?.(id);
    },
    showApproval({ summary, domain }) {
      $('approveSummary').textContent = summary || '';
      $('approveSummary').lang = S.lang;
      $('approveDomain').textContent = domain ? `Suggested domain: ${domain}` : '';
      $('approvePanel').hidden = false;
      UI.mark('approve', 'now');
    },
    hideApproval() { $('approvePanel').hidden = true; },
    showLive({ url, label, kit }) {
      $('approvePanel').hidden = true;
      $('liveLink').href = url || '#';
      $('liveLink').textContent = label || url;
      $('kitWa').textContent = kit?.whatsapp_status || '';
      $('kitIg').textContent = kit?.instagram_caption || '';
      $('livePanel').hidden = false;
      UI.allDone();
      setTimeout(() => $('livePanel').scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    },
    setKit(kit, lang) {
      $('kitWa').textContent = kit.whatsapp_status || ''; $('kitWa').lang = lang;
      $('kitIg').textContent = kit.instagram_caption || ''; $('kitIg').lang = lang;
    },

    renderPriceGrid() {
      const g = $('priceGrid');
      g.innerHTML = '';
      for (const p of S.plans) {
        const card = document.createElement('article');
        card.className = `price-card${p.recommended ? ' rec' : ''}`;
        card.innerHTML = `${p.recommended ? '<span class="tag">Most popular</span>' : ''}
          <div><h3 class="plan-name"></h3><span class="plan-meaning"></span></div>
          <p class="plan-price" style="margin:0"></p>
          <span class="addr"></span>
          <ul class="plan-feat"></ul>
          <a class="btn ${p.recommended ? 'btn-gold' : 'btn-quiet'}" href="#studio"></a>`;
        card.querySelector('h3').textContent = p.name;
        card.querySelector('.plan-meaning').textContent = p.meaning;
        card.querySelector('.plan-price').innerHTML = p.price ? `₹${p.price}<small> /month, billed yearly</small>` : 'Free<small> forever</small>';
        card.querySelector('.addr').textContent = p.address;
        const ul = card.querySelector('ul');
        for (const f of p.features) { const li = document.createElement('li'); li.textContent = f; ul.appendChild(li); }
        card.querySelector('a').textContent = p.price ? `Start with ${p.name}` : 'Start free';
        g.appendChild(card);
      }
    },

    // Browser speech synthesis fallback
    speakBrowser(text, code) {
      try {
        if (!window.speechSynthesis || !text) return;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = (S.languages[code] || {}).speech || 'en-IN';
        const voices = speechSynthesis.getVoices();
        const v = voices.find((x) => x.lang === u.lang) || voices.find((x) => x.lang.startsWith(code));
        if (v) u.voice = v;
        u.rate = 0.95;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      } catch { /* unavailable */ }
    },
    inr,
  };
  window.BolBizUI = UI;
})();
