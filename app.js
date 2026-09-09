/* =========================================================
   Zone 2 Trainer — app.js
   Local-only storage (no backend yet). One profile per device
   unless the person logs in with a different username on it.
   ========================================================= */

(function () {
  'use strict';

  /* ---------------- storage ---------------- */
  const USERS_KEY = 'z2_users';
  const SESSION_KEY = 'z2_session';

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
  function hash(str) {
    // Not cryptographic — this app has no server. Good enough to stop a
    // shoulder-surf, not good enough to protect a reused password.
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
    return String(h >>> 0);
  }

  let users = loadUsers();
  let currentUsername = localStorage.getItem(SESSION_KEY) || null;

  function currentUser() { return currentUsername ? users[currentUsername] : null; }
  function persistCurrentUser() { saveUsers(users); }

  function newUserRecord(name, username, passHash) {
    return {
      name, username, passHash,
      zone: null, // {age, rhr, maxhr, low, high}
      prefs: { voice: true, vibration: true },
      workouts: [],       // {date, durationSec, inZoneSec, avgBpm, pct}
      streak: { current: 0, best: 0, lastDate: null }
    };
  }

  /* ---------------- zone math ---------------- */
  function calcZone(age, rhr, maxhr) {
    const mhr = (maxhr && maxhr > 0) ? maxhr : Math.round(208 - 0.7 * age);
    if (rhr && rhr > 0) {
      const hrr = mhr - rhr;
      return { low: Math.round(rhr + 0.6 * hrr), high: Math.round(rhr + 0.7 * hrr), maxhr: mhr };
    }
    return { low: Math.round(mhr * 0.6), high: Math.round(mhr * 0.7), maxhr: mhr };
  }

  /* ---------------- navigation ---------------- */
  const screens = {};
  document.querySelectorAll('.screen').forEach(s => screens[s.id] = s);
  let screenStack = ['screen-welcome'];

  function showScreen(id, replace) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[id].classList.add('active');
    if (replace) screenStack[screenStack.length - 1] = id;
    else screenStack.push(id);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.back, true));
  });

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  /* ---------------- auth ---------------- */
  document.getElementById('btn-go-signup').addEventListener('click', () => showScreen('screen-signup'));
  document.getElementById('btn-go-login').addEventListener('click', () => showScreen('screen-login'));

  document.getElementById('form-signup').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const username = document.getElementById('signup-username').value.trim().toLowerCase();
    const pass = document.getElementById('signup-password').value;
    const err = document.getElementById('signup-error');

    if (users[username]) {
      err.textContent = 'That username is already taken on this device.';
      err.hidden = false;
      return;
    }
    err.hidden = true;
    users[username] = newUserRecord(name, username, hash(pass));
    persistCurrentUser();
    currentUsername = username;
    localStorage.setItem(SESSION_KEY, username);
    showScreen('screen-setup', true);
  });

  document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    const rec = users[username];
    if (!rec || rec.passHash !== hash(pass)) {
      err.textContent = 'Username or passcode is wrong.';
      err.hidden = false;
      return;
    }
    err.hidden = true;
    currentUsername = username;
    localStorage.setItem(SESSION_KEY, username);
    if (rec.zone) { renderHome(); showScreen('screen-home', true); }
    else showScreen('screen-setup', true);
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    currentUsername = null;
    localStorage.removeItem(SESSION_KEY);
    screenStack = ['screen-welcome'];
    showScreen('screen-welcome', true);
  });

  /* ---------------- setup (one-time) ---------------- */
  function wireZonePreview(ageEl, rhrEl, maxhrEl, lowEl, highEl, wrapEl) {
    function update() {
      const age = parseInt(ageEl.value, 10);
      if (!age) { if (wrapEl) wrapEl.hidden = true; return; }
      const rhr = parseInt(rhrEl.value, 10) || 0;
      const maxhr = parseInt(maxhrEl.value, 10) || 0;
      const z = calcZone(age, rhr, maxhr);
      lowEl.textContent = z.low;
      highEl.textContent = z.high;
      if (wrapEl) wrapEl.hidden = false;
    }
    [ageEl, rhrEl, maxhrEl].forEach(el => el.addEventListener('input', update));
    update();
  }

  wireZonePreview(
    document.getElementById('setup-age'),
    document.getElementById('setup-rhr'),
    document.getElementById('setup-maxhr'),
    document.getElementById('setup-low'),
    document.getElementById('setup-high'),
    document.getElementById('setup-preview')
  );

  document.getElementById('form-setup').addEventListener('submit', (e) => {
    e.preventDefault();
    const age = parseInt(document.getElementById('setup-age').value, 10);
    const rhr = parseInt(document.getElementById('setup-rhr').value, 10) || 0;
    const maxhr = parseInt(document.getElementById('setup-maxhr').value, 10) || 0;
    const z = calcZone(age, rhr, maxhr);
    const u = currentUser();
    u.zone = { age, rhr, maxhr, low: z.low, high: z.high };
    persistCurrentUser();
    renderHome();
    showScreen('screen-home', true);
  });

  /* ---------------- settings ---------------- */
  document.getElementById('btn-open-settings').addEventListener('click', () => {
    const u = currentUser();
    document.getElementById('settings-age').value = u.zone.age;
    document.getElementById('settings-rhr').value = u.zone.rhr || '';
    document.getElementById('settings-maxhr').value = u.zone.maxhr || '';
    document.getElementById('settings-voice').checked = u.prefs.voice;
    document.getElementById('settings-vibration').checked = u.prefs.vibration;
    wireZonePreview(
      document.getElementById('settings-age'),
      document.getElementById('settings-rhr'),
      document.getElementById('settings-maxhr'),
      document.getElementById('settings-low'),
      document.getElementById('settings-high'),
      null
    );
    showScreen('screen-settings');
  });

  document.getElementById('form-settings-zone').addEventListener('submit', (e) => {
    e.preventDefault();
    const age = parseInt(document.getElementById('settings-age').value, 10);
    const rhr = parseInt(document.getElementById('settings-rhr').value, 10) || 0;
    const maxhr = parseInt(document.getElementById('settings-maxhr').value, 10) || 0;
    const z = calcZone(age, rhr, maxhr);
    const u = currentUser();
    u.zone = { age, rhr, maxhr, low: z.low, high: z.high };
    persistCurrentUser();
    toast('Zone 2 updated');
    renderHome();
  });

  document.getElementById('settings-voice').addEventListener('change', (e) => {
    currentUser().prefs.voice = e.target.checked; persistCurrentUser();
  });
  document.getElementById('settings-vibration').addEventListener('change', (e) => {
    currentUser().prefs.vibration = e.target.checked; persistCurrentUser();
  });

  /* ---------------- home / dashboard ---------------- */
  function fmtMinSec(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }
  function dayKey(d) { return d.toISOString().slice(0, 10); }

  function computeStreak(u) {
    if (!u.workouts.length) return { current: 0, best: u.streak.best || 0 };
    const days = [...new Set(u.workouts
      .filter(w => w.durationSec >= 600) // counts if at least 10 min
      .map(w => w.date.slice(0, 10)))].sort();
    let best = 0, run = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]), cur = new Date(days[i]);
      const diff = Math.round((cur - prev) / 86400000);
      run = (diff === 1) ? run + 1 : 1;
      if (run > best) best = run;
    }
    if (days.length) best = Math.max(best, 1);
    // current streak: walk back from today/yesterday
    const today = dayKey(new Date());
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    let current = 0;
    if (days.includes(today) || days.includes(yesterday)) {
      let cursor = days.includes(today) ? new Date() : new Date(Date.now() - 86400000);
      const set = new Set(days);
      while (set.has(dayKey(cursor))) {
        current++;
        cursor = new Date(cursor.getTime() - 86400000);
      }
    }
    return { current, best: Math.max(best, current) };
  }

  function renderHome() {
    const u = currentUser();
    if (!u) return;
    document.getElementById('home-greeting').textContent = 'Hey, ' + u.name;
    document.getElementById('home-avatar-initial').textContent = u.name.charAt(0).toUpperCase();
    document.getElementById('home-zone-range').textContent = `Zone 2: ${u.zone.low} – ${u.zone.high} BPM`;

    const streak = computeStreak(u);
    u.streak.current = streak.current;
    u.streak.best = streak.best;
    persistCurrentUser();
    document.getElementById('streak-current').textContent = streak.current;
    document.getElementById('streak-best').textContent = streak.best;
    document.getElementById('streak-flame').style.opacity = streak.current > 0 ? '1' : '.35';

    // this week
    const weekAgo = Date.now() - 7 * 86400000;
    const weekWorkouts = u.workouts.filter(w => new Date(w.date).getTime() >= weekAgo);
    const weekMinutes = Math.round(weekWorkouts.reduce((a, w) => a + w.durationSec, 0) / 60);
    const weekPct = weekWorkouts.length
      ? Math.round(weekWorkouts.reduce((a, w) => a + w.pct, 0) / weekWorkouts.length)
      : 0;
    document.getElementById('dash-week-time').textContent = weekMinutes;
    document.getElementById('dash-week-zone').textContent = weekPct + '%';
    document.getElementById('dash-week-count').textContent = weekWorkouts.length;

    // bar chart: last 7 workouts by pct
    const chart = document.getElementById('bar-chart');
    chart.innerHTML = '';
    const last7 = u.workouts.slice(-7);
    if (!last7.length) {
      chart.innerHTML = '<span class="bar-chart-empty">Nothing to chart yet</span>';
    } else {
      last7.forEach(w => {
        const col = document.createElement('div');
        col.className = 'bar-col';
        const fill = document.createElement('div');
        fill.className = 'bar-col-fill';
        fill.style.height = Math.max(6, w.pct) + '%';
        const label = document.createElement('div');
        label.className = 'bar-col-label';
        label.textContent = new Date(w.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        col.appendChild(fill); col.appendChild(label);
        chart.appendChild(col);
      });
    }

    renderHistory(document.getElementById('history-list-preview'), document.getElementById('history-empty'), u.workouts.slice(-4).reverse());
    renderHistory(document.getElementById('history-list-full'), document.getElementById('history-empty-full'), [...u.workouts].reverse());
  }

  function renderHistory(listEl, emptyEl, workouts) {
    listEl.innerHTML = '';
    if (!workouts.length) { emptyEl.hidden = false; return; }
    emptyEl.hidden = true;
    workouts.forEach(w => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const date = new Date(w.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
      li.innerHTML = `
        <div>
          <p class="history-item-date">${date}</p>
          <p class="history-item-time">${fmtMinSec(w.durationSec)}</p>
        </div>
        <div>
          <span class="history-item-pct">${w.pct}%</span>
          <span class="history-item-pct-label">in zone</span>
        </div>`;
      listEl.appendChild(li);
    });
  }

  document.getElementById('btn-view-all-history').addEventListener('click', () => showScreen('screen-history'));

  /* ---------------- minutes stepper ---------------- */
  let targetMinutes = 30;
  const minutesValueEl = document.getElementById('minutes-value');
  document.getElementById('minutes-minus').addEventListener('click', () => {
    targetMinutes = Math.max(5, targetMinutes - 5);
    minutesValueEl.textContent = targetMinutes;
  });
  document.getElementById('minutes-plus').addEventListener('click', () => {
    targetMinutes = Math.min(180, targetMinutes + 5);
    minutesValueEl.textContent = targetMinutes;
  });

  document.getElementById('btn-start-flow').addEventListener('click', () => {
    showScreen('screen-connect');
  });

  /* ---------------- bluetooth HR ---------------- */
  let bleDevice = null, bleChar = null;
  let manualMode = false;
  let latestBpm = null;

  function parseHeartRate(dataview) {
    const flags = dataview.getUint8(0);
    const is16 = flags & 0x1;
    return is16 ? dataview.getUint16(1, true) : dataview.getUint8(1);
  }

  document.getElementById('btn-scan').addEventListener('click', async () => {
    const statusEl = document.getElementById('connect-status');
    if (!navigator.bluetooth) {
      statusEl.textContent = "This browser can't do Bluetooth. Use Chrome/Edge, or enter BPM manually.";
      return;
    }
    try {
      statusEl.textContent = 'Opening device picker…';
      bleDevice = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
      const server = await bleDevice.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      bleChar = await service.getCharacteristic('heart_rate_measurement');
      await bleChar.startNotifications();
      bleChar.addEventListener('characteristicvaluechanged', (ev) => {
        latestBpm = parseHeartRate(ev.target.value);
      });
      manualMode = false;
      statusEl.textContent = `Connected to ${bleDevice.name || 'device'}.`;
      toast('Heart rate monitor connected');
      setTimeout(() => beginWorkout(), 400);
    } catch (err) {
      statusEl.textContent = 'Could not connect — try again, or enter BPM manually.';
    }
  });

  document.getElementById('btn-skip-connect').addEventListener('click', () => {
    manualMode = true;
    latestBpm = 100;
    beginWorkout();
  });

  /* ---------------- workout engine ---------------- */
  let workoutTimer = null;
  let elapsedSec = 0, remainingSec = 0;
  let inZoneSec = 0, bpmSamples = [];
  let sessionState = 'waiting'; // waiting | low | in | high
  let stateSince = 0;
  let lastAlertAt = -999;
  let paused = false;
  const ALERT_SUSTAIN = 4;   // seconds out-of-zone before we say something
  const ALERT_COOLDOWN = 25; // seconds minimum between alerts

  function speak(text) {
    const u = currentUser();
    if (!u.prefs.voice || sessionMuted) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0; utter.volume = 1.0;
    window.speechSynthesis.speak(utter);
  }
  function buzz(pattern) {
    const u = currentUser();
    if (!u.prefs.vibration || sessionMuted) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  let sessionMuted = false;
  document.getElementById('btn-mute').addEventListener('click', (e) => {
    sessionMuted = !sessionMuted;
    e.target.textContent = sessionMuted ? '🔇' : '🔊';
  });

  function beginWorkout() {
    const u = currentUser();
    elapsedSec = 0; inZoneSec = 0; bpmSamples = [];
    remainingSec = targetMinutes * 60;
    sessionState = 'waiting'; stateSince = 0; lastAlertAt = -999; paused = false;
    sessionMuted = false;
    document.getElementById('btn-mute').textContent = '🔊';
    document.getElementById('workout-zone-range').textContent = `${u.zone.low} – ${u.zone.high}`;
    document.getElementById('manual-bpm-slider').hidden = !manualMode;
    document.getElementById('manual-bpm-slider').value = 120;
    document.getElementById('btn-pause').textContent = 'Pause';
    showScreen('screen-workout', true);
    if (workoutTimer) clearInterval(workoutTimer);
    workoutTimer = setInterval(tickWorkout, 1000);
    tickWorkout();
  }

  document.getElementById('manual-bpm-slider').addEventListener('input', (e) => {
    latestBpm = parseInt(e.target.value, 10);
  });

  document.getElementById('btn-workout-back').addEventListener('click', () => confirmStop());
  document.getElementById('btn-pause').addEventListener('click', () => {
    paused = !paused;
    document.getElementById('btn-pause').textContent = paused ? 'Resume' : 'Pause';
  });
  document.getElementById('btn-stop').addEventListener('click', () => confirmStop());

  function confirmStop() {
    if (elapsedSec < 15) { endWorkout(); return; }
    if (confirm('Stop this workout and save it?')) endWorkout();
  }

  const GAUGE_CIRC = 2 * Math.PI * 104; // ~653

  function tickWorkout() {
    if (paused) return;
    elapsedSec++;
    remainingSec = Math.max(0, remainingSec - 1);

    const u = currentUser();
    const bpm = manualMode ? parseInt(document.getElementById('manual-bpm-slider').value, 10) : latestBpm;

    document.getElementById('workout-remaining').textContent = fmtMinSec(remainingSec);
    document.getElementById('workout-elapsed').textContent = fmtMinSec(elapsedSec);

    if (bpm) {
      bpmSamples.push(bpm);
      document.getElementById('gauge-bpm').textContent = bpm;

      let state;
      if (bpm < u.zone.low) state = 'low';
      else if (bpm > u.zone.high) state = 'high';
      else state = 'in';

      if (state === 'in') inZoneSec++;

      // gauge fill: map bpm across [low-25, high+25] to 0..1
      const span = (u.zone.high + 25) - (u.zone.low - 25);
      const frac = Math.min(1, Math.max(0, (bpm - (u.zone.low - 25)) / span));
      const fillEl = document.getElementById('gauge-fill');
      fillEl.style.strokeDashoffset = String(GAUGE_CIRC * (1 - frac));
      fillEl.style.stroke = state === 'in' ? getCss('--zone-in') : state === 'low' ? getCss('--zone-low') : getCss('--zone-high');

      const stateEl = document.getElementById('gauge-state');
      stateEl.classList.remove('state-in', 'state-low', 'state-high');
      if (state === 'in') { stateEl.textContent = 'IN ZONE'; stateEl.classList.add('state-in'); }
      if (state === 'low') { stateEl.textContent = 'TOO SLOW'; stateEl.classList.add('state-low'); }
      if (state === 'high') { stateEl.textContent = 'TOO FAST'; stateEl.classList.add('state-high'); }

      if (state !== sessionState) { sessionState = state; stateSince = elapsedSec; }
      const sustained = elapsedSec - stateSince;
      const cooledDown = (elapsedSec - lastAlertAt) >= ALERT_COOLDOWN;

      if (sustained === ALERT_SUSTAIN && cooledDown) {
        if (state === 'low') { buzz([220]); speak('Below zone 2. Speed up.'); lastAlertAt = elapsedSec; }
        else if (state === 'high') { buzz([160, 90, 160]); speak('Above zone 2. Slow down.'); lastAlertAt = elapsedSec; }
      }

      const avg = Math.round(bpmSamples.reduce((a, b) => a + b, 0) / bpmSamples.length);
      document.getElementById('workout-avg').textContent = avg;
    }

    const pct = elapsedSec ? Math.round((inZoneSec / elapsedSec) * 100) : 0;
    document.getElementById('workout-inzone-pct').textContent = pct + '%';

    if (remainingSec <= 0) endWorkout();
  }

  function getCss(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function endWorkout() {
    clearInterval(workoutTimer);
    if (bleChar) { try { bleChar.stopNotifications(); } catch (e) {} }
    if (bleDevice && bleDevice.gatt.connected) { try { bleDevice.gatt.disconnect(); } catch (e) {} }
    window.speechSynthesis && window.speechSynthesis.cancel();

    const u = currentUser();
    const pct = elapsedSec ? Math.round((inZoneSec / elapsedSec) * 100) : 0;
    const avg = bpmSamples.length ? Math.round(bpmSamples.reduce((a, b) => a + b, 0) / bpmSamples.length) : 0;

    const workout = { date: new Date().toISOString(), durationSec: elapsedSec, inZoneSec, pct, avgBpm: avg };
    if (elapsedSec >= 15) { u.workouts.push(workout); persistCurrentUser(); }

    document.getElementById('summary-time').textContent = fmtMinSec(elapsedSec);
    document.getElementById('summary-inzone-time').textContent = fmtMinSec(inZoneSec);
    document.getElementById('summary-pct').textContent = pct + '%';
    document.getElementById('summary-avg').textContent = avg || '--';

    let rec;
    if (pct >= 80) rec = "Locked in. That's a textbook Zone 2 session — repeat this pace next time.";
    else if (pct >= 50) rec = 'Solid session. You drifted out a bit — ease back when the cue tells you to speed up or slow down.';
    else rec = "You spent a lot of time outside the zone. Try a slightly easier pace next time and let the cues guide you in.";
    document.getElementById('summary-recommendation').textContent = rec;

    showScreen('screen-summary', true);
  }

  document.getElementById('btn-summary-done').addEventListener('click', () => {
    renderHome();
    showScreen('screen-home', true);
  });

  /* ---------------- boot ---------------- */
  function boot() {
    const u = currentUser();
    if (u && u.zone) { renderHome(); showScreen('screen-home', true); }
    else if (u) { showScreen('screen-setup', true); }
    else { showScreen('screen-welcome', true); }
  }
  boot();

  /* ---------------- PWA service worker ---------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
