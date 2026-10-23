/* Dein Leben – Oberfläche */
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'dein-leben-v1';
  const $app = document.getElementById('app');
  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const COLORS = ['#9C735B', '#C9A9DD', '#E9E4DA', '#8FB3A0', '#E3B66F', '#7FA6D6', '#E5806F', '#B8C27A'];

  const INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.01" stroke-linecap="round"/></svg>';
  const CLOCK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2" stroke-linecap="round"/></svg>';
  const PEN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>';
  const infoBtn = topic => `<button class="info" data-act="sheet" data-arg="info:${topic}" aria-label="Erklärung">${INFO}</button>`;
  const CATCOL = { Druck: '#E5806F', Zug: '#7FA6D6', Beine: '#8FB3A0', Rumpf: '#E3B66F', Ausdauer: '#C9A9DD', Reha: '#B8C27A' };
  const ICONS = {
    heute: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>',
    ziele: '<path d="M6 21V4h11l-2 3.75L17 11.5H6"/>',
    training: '<path d="M3.5 9.5v5M6.5 7v10M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
    gewicht: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M8.6 10a4.2 4.2 0 0 1 6.8 0M12 12.2l1.4-2.2"/>',
    mehr: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>'
  };
  const THEMES = [['light', 'Hell'], ['dim', 'Gedimmt'], ['dark', 'Dunkel']];
  // Akzentfarben je Farbschema: [Akzent, Schrift auf Akzent, Fläche, Schrift auf Fläche]. Minze = Standard aus styles.css
  const ACCENTS = {
    mint: ['Minze', '#86D7C0', null],
    blau: ['Blau', '#8EC5FF', { dark: ['#8EC5FF', '#00325A', '#16324C', '#CDE5FF'], dim: ['#9CCBFF', '#00325A', '#2E4A63', '#D6EAFF'], light: ['#1F5FA8', '#FFFFFF', '#D3E4FF', '#001C3A'] }],
    violett: ['Violett', '#C9B3FF', { dark: ['#C9B3FF', '#2E1A63', '#30264F', '#E6DEFF'], dim: ['#CFBCFF', '#2E1A63', '#4A3E6B', '#EBE3FF'], light: ['#6A4FB3', '#FFFFFF', '#E6DEFF', '#22104F'] }],
    rose: ['Rosé', '#F4A8CF', { dark: ['#F4A8CF', '#5B1140', '#4A2440', '#FFD8EA'], dim: ['#F6B3D5', '#5B1140', '#63405A', '#FFE0EF'], light: ['#A2386F', '#FFFFFF', '#FFD8EA', '#3A0024'] }],
    limette: ['Limette', '#C3DC72', { dark: ['#C3DC72', '#2C3A00', '#33401A', '#E1F5A6'], dim: ['#CBE17F', '#2C3A00', '#4C5A30', '#E7F8B4'], light: ['#4F6A00', '#FFFFFF', '#D9EDA0', '#162000'] }],
    graphit: ['Graphit', '#E1E8E5', { dark: ['#E1E8E5', '#18201E', '#2D3734', '#E1E8E5'], dim: ['#E4ECE9', '#252D2B', '#4A5552', '#E4ECE9'], light: ['#2A3330', '#FFFFFF', '#DCE5E2', '#0F1C19'] }]
  };
  const TAB_LABELS = { heute: 'Heute', ziele: 'Ziele', training: 'Training', gewicht: 'Gewicht', mehr: 'Mehr' };
  const TAB_DEFAULT = ['heute', 'ziele', 'training', 'gewicht', 'mehr'];
  // Gespeicherte Reihenfolge nur übernehmen, wenn sie genau die fünf Seiten enthält
  function tabOrderAll() {
    const o = S && S.settings && S.settings.tabOrder;
    return Array.isArray(o) && o.length === TAB_DEFAULT.length && TAB_DEFAULT.every(k => o.includes(k)) ? o : TAB_DEFAULT;
  }
  // „Mehr“ bleibt immer sichtbar, sonst wären die Einstellungen nicht mehr erreichbar
  const tabHidden = () => { const h = S && S.settings && S.settings.tabHidden; return Array.isArray(h) ? h.filter(k => k !== 'mehr' && TAB_DEFAULT.includes(k)) : []; };
  function tabOrder() { const h = tabHidden(); return tabOrderAll().filter(k => !h.includes(k)); }
  // Einstellungen mit Standardwert
  const setting = (k, def) => (S && S.settings && S.settings[k] !== undefined && S.settings[k] !== null ? S.settings[k] : def);
  const SETTABLE = { fontScale: ['normal', 'large'], heuteView: ['tiles', 'list'], trainStart: ['ask', 'repeat', 'empty'], weightRange: ['auto', '1M', '3M', '6M', '1J'], backupDays: [1, 3, 7, 14, 30] };
  const WEIGHT_LINES = [99, 92, 88, 85];
  const weightLines = () => { const l = setting('weightLines', WEIGHT_LINES); return Array.isArray(l) ? l.filter(v => typeof v === 'number' && v >= 30 && v <= 300) : WEIGHT_LINES; };
  const backupDays = () => { const v = Number(setting('backupDays', 7)); return SETTABLE.backupDays.includes(v) ? v : 7; };
  // Gewohnheiten in eigener Reihenfolge; noch nicht einsortierte kommen in alter Reihenfolge ans Ende
  function activeHabits() {
    const ord = setting('habitOrder', []), act = S.habits.filter(h => !h.archived), base = new Map(act.map((h, i) => [h.id, i]));
    const pos = h => { const i = ord.indexOf(h.id); return i < 0 ? 1e6 + base.get(h.id) : i; };
    return act.sort((a, b) => pos(a) - pos(b));
  }
  const inRing = h => !setting('ringExclude', []).includes(h.id);
  // Trainingskategorien: eigene Liste mit Farben; Kategorien aus Übungen, die (noch) fehlen, werden grau ergänzt
  const CAT_DEFAULT = C.CATS.map(n => ({ name: n, color: CATCOL[n] }));
  const CAT_COLORS = ['#E5806F', '#7FA6D6', '#8FB3A0', '#E3B66F', '#C9A9DD', '#B8C27A', '#F4A8CF', '#86D7C0', '#C49A80', '#9AA8A3'];
  function cats() {
    const st = setting('cats', null), list = (Array.isArray(st) && st.length ? st : CAT_DEFAULT).map(c => ({ ...c }));
    for (const e of (S ? S.exercises : [])) if (e.cat && !list.some(c => c.name === e.cat)) list.push({ name: e.cat, color: '#9AA8A3' });
    return list;
  }
  const catNames = () => cats().map(c => c.name);
  const catCol = n => (cats().find(c => c.name === n) || {}).color || 'var(--fa)';
  function applyTheme() {
    const t = (S && S.settings && S.settings.theme) || 'dark';
    document.documentElement.dataset.theme = t;
    if (setting('fontScale', 'normal') === 'large') document.documentElement.dataset.font = 'l'; else delete document.documentElement.dataset.font;
    const ac = ACCENTS[S && S.settings && S.settings.accent], st = document.documentElement.style;
    const props = ['--accent', '--on-accent', '--pc', '--on-pc', '--sage', '--good-bg', '--good-tx'];
    if (!ac || !ac[2]) props.forEach(p => st.removeProperty(p));
    else { const [a, oa, pc, opc] = ac[2][t]; [a, oa, pc, opc, a, pc, opc].forEach((v, i) => st.setProperty(props[i], v)); }
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  }
  let S = load();
  const ui = { tab: tabOrder()[0], stack: [], sheet: null, range: null, cal: {}, metric: {}, scroll: {} };
  // Standard: 1 Monat, solange der 30-Tage-Ø über 92 kg liegt, sonst 3 Monate
  const rangeFor = ws => ui.range || (setting('weightRange', 'auto') !== 'auto' ? setting('weightRange', 'auto') : (ws.avg !== null && ws.avg <= 92 ? '3M' : '1M'));

  // ---------- Speicher ----------
  function load() {
    try { const raw = localStorage.getItem(KEY); return raw ? C.validate(JSON.parse(raw)) : null; }
    catch (e) { console.error(e); return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Speichern fehlgeschlagen. Bitte sofort ein Backup erstellen.'); console.error(e); }
  }
  let saveTimer = null;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); };
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- Hilfen ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => C.todayStr();
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const dLong = s => { const d = C.parseDay(s); return `${DAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`; };
  const dShort = s => { const d = C.parseDay(s); return `${DAYS[d.getDay()].slice(0, 2)} ${C.pad(d.getDate())}.${C.pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`; };
  const dNum = s => { const d = C.parseDay(s); return `${C.pad(d.getDate())}.${C.pad(d.getMonth() + 1)}.${d.getFullYear()}`; };
  const pct = q => q ? `${Math.round(q.pct * 100)} %` : '–';
  function toast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  // Verlauf: jede Unterseite und jedes Sheet bekommt einen Eintrag, damit die Zurück-Taste von Android funktioniert
  function push(name, args = {}) {
    ui.stack.push({ name, ...args });
    const st = { depth: ui.stack.length, sheet: false };
    if (ui.sheet) { ui.sheet = null; history.replaceState(st, ''); } else history.pushState(st, '');
    render(); window.scrollTo(0, 0);
  }
  const pop = (n = 1) => history.go(-n);
  function openSheet(obj) { ui.sheet = obj; history.pushState({ depth: ui.stack.length, sheet: true }, ''); render(); }
  const closeSheet = () => history.back();
  const top = () => ui.stack[ui.stack.length - 1];
  const header = (title, right = '') => `<div class="top"><button class="iconbtn" data-act="back" aria-label="Zurück">‹</button><h3 class="grow">${title}</h3>${right}</div>`;

  // ---------- Render ----------
  function render() {
    applyTheme();
    if (!S) { $app.innerHTML = viewWelcome(); return; }
    const t = top();
    saveScroll();
    let html;
    if (t) html = `<main>${SCREENS[t.name](t)}</main>`;
    else html = `<div class="pager" id="pager">${tabOrder().map(k => `<section class="page" data-tab="${k}"><main>${TABS[k]()}</main></section>`).join('')}</div>${tabbar()}`;
    if (ui.sheet) html += `<div class="scrim" data-act="closeSheet"><div class="sheet" data-stop>${SHEETS[ui.sheet.name](ui.sheet)}</div></div>`;
    document.body.classList.toggle('paged', !t);
    $app.innerHTML = html;
    if (!t) restoreScroll();
    const ps = document.getElementById('persist');
    if (ps && navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { ps.textContent = p ? 'Speicher dauerhaft ✓' : 'Speicher nicht dauerhaft bestätigt · Backups wichtig'; });
    else if (ps) ps.textContent = '';
  }
  // Seiten nebeneinander mit nativem Scroll-Einrasten: folgt dem Finger, flüssig wie eine native App
  function saveScroll() {
    const pg = document.getElementById('pager'); if (!pg) return;
    pg.querySelectorAll('.page').forEach(p => { ui.scroll[p.dataset.tab] = p.scrollTop; });
  }
  function restoreScroll() {
    const pg = document.getElementById('pager'); if (!pg) return;
    pg.scrollLeft = tabOrder().indexOf(ui.tab) * pg.clientWidth;
    pg.querySelectorAll('.page').forEach(p => { p.scrollTop = ui.scroll[p.dataset.tab] || 0; });
  }
  function syncTabbar() {
    document.querySelectorAll('nav.tabs button').forEach(b => { if (b.dataset.arg === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function tabbar() {
    const b = (id, ic, l) => `<button data-act="tab" data-arg="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}><span class="ic"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id]}</svg></span>${l}</button>`;
    return `<nav class="tabs" style="grid-template-columns:repeat(${tabOrder().length},1fr)">${tabOrder().map(k => b(k, '', TAB_LABELS[k])).join('')}</nav>`;
  }

  function viewWelcome() {
    return `<main class="welcome"><div class="big">Dein Leben</div>
      <p class="sub">Gewohnheiten, Gewicht und Training an einem Ort. Alles bleibt auf diesem Handy.</p>
      <label class="btn primary block" style="display:grid;place-items:center;margin:0 0 10px">Importdatei oder Backup laden
        <input type="file" accept=".json,application/json" data-change="restore" hidden></label>
      <button class="btn ghost block" data-act="startEmpty">Ohne Daten beginnen</button></main>`;
  }

  // ===== HEUTE =====
  // Gemeinsame Hilfen für die Entwürfe
  function ring(frac, size, sw, color, inner = '', soll = null) {
    const r = (size - sw) / 2, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0)), m = size / 2;
    let tick = '';
    if (soll !== null && soll !== undefined && !Number.isNaN(soll)) {
      const a = 2 * Math.PI * Math.max(0, Math.min(1, soll)) - Math.PI / 2, r1 = r - sw / 2 - 2, r2 = r + sw / 2 + 2;
      tick = `<line x1="${(m + r1 * Math.cos(a)).toFixed(1)}" y1="${(m + r1 * Math.sin(a)).toFixed(1)}" x2="${(m + r2 * Math.cos(a)).toFixed(1)}" y2="${(m + r2 * Math.sin(a)).toFixed(1)}" style="stroke:var(--tx)" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${m}" cy="${m}" r="${r}" fill="none" style="stroke:var(--track)" stroke-width="${sw}"/>${f > 0 ? `<circle cx="${m}" cy="${m}" r="${r}" fill="none" style="stroke:${color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${m} ${m})"/>` : ''}${tick}</svg><div class="ring-in">${inner}</div></div>`;
  }
  function weightModel(ws, tp, d) {
    const m = { phase: ws.phase, avg: ws.avg };
    const mon = s => `${MONTHS[C.parseDay(s).getMonth()].slice(0, 3)} ${s.slice(2, 4)}`;
    if (ws.phase === 1 && ws.avg !== null) {
      const sw = [...ws.switches].reverse().find(s => s.to === 1);
      const a0 = Math.max(C.avg30(ws.daily, sw ? sw.d : ws.daily[0].d), ws.avg);
      m.left = Math.max(0, ws.avg - C.T.p1to3);
      m.rl = ws.relapse ? Math.max(0, C.T.relapseDays - ws.relapse.n) : 0;
      const fc = C.forecast(ws.avg, tp, C.T.p1to3, d);
      m.when = m.left > 0 && fc && fc.date ? `≈ ${mon(fc.date)}` : '';
      m.frac = a0 > C.T.p1to3 ? (a0 - ws.avg) / (a0 - C.T.p1to3) : 1;
    } else if (ws.phase === 3 && ws.daily.length) m.buffer = C.T.relapse - ws.daily[ws.daily.length - 1].kg;
    return m;
  }
  const MORE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function viewHeute() {
    const d = today(), pd = C.parseDay(d);
    const ws = C.weightStatus(S.weights, d);
    const active = activeHabits();
    const stats = active.map(h => C.habitStats(S, h, d));
    const ri = active.map((h, i) => i).filter(i => inRing(active[i])), rh = ri.map(i => active[i]), rs = ri.map(i => stats[i]);
    const done = rs.filter(st => st.days.has(d)).length;
    let out = `<div class="ph"><h1>${DAYS[pd.getDay()]}</h1><span class="meta num">${pd.getDate()}. ${MONTHS[pd.getMonth()]}</span></div>`;
    for (const [i, n] of (S.notices || []).entries()) out += `<div class="notice good row"><span class="grow">${esc(n)}</span><button class="btn sm ghost" data-act="dismiss" data-arg="${i}">OK</button></div>`;
    const running = S.sessions.find(s => s.kind === 'training' && !s.done);
    if (running) out += `<button class="notice due row" style="width:100%;border:0;text-align:left" data-act="open" data-arg="session:${running.id}"><span class="grow">Einheit #${String(running.num).padStart(3, '0')} läuft</span><b>›</b></button>`;
    if (rh.length) {
      const wk = weekProgress(rh, rs, d), frac = wk.P ? wk.D / wk.P : 0;
      const inner = wk.P && wk.D >= wk.P ? CHECK : `<b class="num" style="font-size:18px">${Math.round(frac * 100)}%</b>`;
      out += `<div class="hero-b">${ring(frac, 76, 9, 'var(--accent)', inner, wk.P ? wk.E / wk.P : null)}
        <div><div class="hero-sub">Diese Woche</div><div class="hero-num num">${wk.D} von ${wk.P}</div><div class="hero-sub num">heute ${done} von ${rh.length}</div></div></div>`;
    }
    if (ws.due) out += `<div class="entry-b"><input type="text" inputmode="decimal" placeholder="Gewicht heute, kg" id="quickKg" aria-label="Gewicht in kg"><button class="fab" data-act="quickWeight" aria-label="Gewicht speichern">${CHECK}</button></div>`;
    if (S.settings.heightCm && C.measurementDue(S.measurements, d)) out += `<button class="notice due row" style="width:100%;border:0;text-align:left" data-act="open" data-arg="measure"><span class="grow">Umfänge messen</span><b>›</b></button>`;
    if (!active.length) out += `<div class="card"><button class="btn primary block" data-act="open" data-arg="habitEdit">Erste Gewohnheit anlegen</button></div>`;
    else if (setting('heuteView', 'tiles') === 'list') out += `<div class="hlist2">${active.map((h, i) => habitRow(h, stats[i], d)).join('')}</div>`;
    else out += `<div class="tiles">${active.map((h, i) => habitTile(h, stats[i], d)).join('')}</div>`;
    return out;
  }
  // Wochenring: alle Abhak-Möglichkeiten von Mo bis So.
  // Täglich (auch Verzicht): jeder Tag ab Beginn ist eine Möglichkeit. X-mal pro Woche: das Wochenziel, Mehrleistung zählt nicht doppelt.
  // E = Soll bis einschließlich heute (Strich im Ring).
  function weekProgress(active, stats, d) {
    const ws = C.weekStart(d), we = C.addDays(ws, 6), elapsed = C.diffDays(ws, d) + 1;
    let P = 0, D = 0, E = 0;
    active.forEach((h, i) => {
      const days = stats[i].days;
      if (h.start > we) return;
      if (h.type === 'weekly') {
        const t = C.targetAt(h, ws);
        P += t; D += Math.min(t, C.weekCount(days, ws)); E += t * elapsed / 7;
      } else {
        const from = h.start > ws ? h.start : ws;
        P += C.diffDays(from, we) + 1;
        if (from <= d) { for (const day of C.dayRange(from, d)) if (days.has(day)) D++; E += C.diffDays(from, d) + 1; }
      }
    });
    return { P, D, E };
  }
  function weekBars(h, st, d) {
    const ws = C.weekStart(d);
    return WD.map((w, i) => { const day = C.addDays(ws, i); return `<i class="${st.days.has(day) ? 'on' : ''} ${day === d ? 'today' : ''} ${day > d || day < h.start ? 'off' : ''}" title="${w}"></i>`; }).join('');
  }
  function streakTxt(h, st) {
    const weekly = h.type === 'weekly';
    return `<b>${st.cur}</b> ${weekly ? (st.cur === 1 ? 'Woche' : 'Wochen') : (st.cur === 1 ? 'Tag' : 'Tage')}${weekly ? ` · ${st.week.n}/${st.week.t}` : ''}`;
  }
  const tickBtn = (h, on, d) => `<button class="tick ${on ? 'on' : ''}" data-act="${h.link === 'sport' ? 'sportSheet' : 'toggle'}" data-arg="${h.id}:${d}" aria-label="${esc(h.name)} heute abhaken" aria-pressed="${on}">${CHECK}</button>`;
  function habitTile(h, st, d) {
    const on = st.days.has(d);
    return `<div class="tile ${on ? 'done' : ''}" style="--hc:${h.color}">
      <div class="tile-top"><span class="tile-emo">${esc(h.emoji)}</span>${tickBtn(h, on, d)}</div>
      <button class="tile-body" data-act="open" data-arg="habit:${h.id}"><span class="tile-name">${esc(h.name)}</span>
      <span class="tile-streak num">${streakTxt(h, st)}</span>
      <span class="wbar">${weekBars(h, st, d)}</span></button></div>`;
  }
  function habitRow(h, st, d) {
    const on = st.days.has(d);
    return `<div class="hl ${on ? 'done' : ''}" style="--hc:${h.color}">
      <button class="hl-main" data-act="open" data-arg="habit:${h.id}"><span class="tile-emo">${esc(h.emoji)}</span>
      <span class="hl-txt"><span class="tile-name">${esc(h.name)}</span><span class="tile-streak num">${streakTxt(h, st)}</span><span class="wbar">${weekBars(h, st, d)}</span></span></button>
      ${tickBtn(h, on, d)}</div>`;
  }

  // ===== GEWOHNHEIT DETAIL =====
  function screenHabit({ id }) {
    const h = S.habits.find(x => x.id === id); if (!h) return header('Nicht gefunden');
    const d = today(), st = C.habitStats(S, h, d);
    const unit = h.type === 'weekly' ? 'Wochen' : 'Tage';
    let goal = '';
    if (h.link === 'weightgoal' && h.goal) {
      const ws = C.weightStatus(S.weights, d);
      goal = `<div class="card"><div class="lbl">30-Tage-Ø</div><div class="big num">${C.fmt(ws.avg)} kg</div>
        <div class="pills">${ws.avg !== null && ws.avg > h.goal.kg ? `<span class="pill">noch ${C.fmt(ws.avg - h.goal.kg)} kg</span>` : ''}<span class="pill">bis ${dNum(h.goal.deadline)}</span></div></div>`;
    }
    const tNow = C.targetAt(h, C.weekStart(d));
    const pills = [h.type === 'weekly' ? `${tNow}× pro Woche` : (h.kind === 'verzicht' ? 'täglich · Verzicht' : 'täglich'), h.link === 'sport' ? 'automatisch aus Training' : '', `seit ${dNum(h.start)}`, h.archived ? `archiviert${h.result ? ' · ' + esc(h.result) : ''}` : ''].filter(Boolean);
    const q = (lbl, v, w) => `<div class="stat"><b class="num">${v}</b><span>${lbl}${w ? ` · ${w}` : ''}</span></div>`;
    const wk = h.type === 'weekly' ? `${st.week.n}/${st.week.t}` : pct(st.week);
    const mo = st.month ? `${pct(st.month)}` : '–', yr = st.year ? pct(st.year) : '–';
    const y = ui.cal[h.id + 'y'] || d.slice(0, 4);
    return `${header(`${esc(h.emoji)} ${esc(h.name)}`, `${infoBtn('habit')}<button class="iconbtn" data-act="open" data-arg="habitEdit:${h.id}" aria-label="Bearbeiten">${PEN}</button>`)}
      <div style="--hc:${h.color}">
      <div class="pills" style="margin:0 0 14px">${pills.map(p => `<span class="pill">${p}</span>`).join('')}</div>
      ${goal}
      <div class="stats">${q('Gesamt', st.total)}${q('Serie', st.cur, unit)}${q('Beste', st.best, unit)}</div>
      <div class="stats" style="margin-top:8px">${q('Woche', wk)}${q('Monat', mo)}${q('Jahr', yr)}</div>
      <div class="card" style="margin-top:12px">${calendar(h, st)}</div>
      <div class="card"><div class="lbl" style="margin:0 0 10px">${y}</div>${heatmap(h, st, y)}</div>
      </div>`;
  }
  function calendar(h, st) {
    const d = today(); const m = ui.cal[h.id] || C.monthStart(d);
    const first = C.parseDay(m), off = (first.getDay() + 6) % 7, end = C.monthEnd(m);
    let cells = WD.map(w => `<span class="dl">${w}</span>`).join('') + '<span></span>'.repeat(off);
    for (const day of C.dayRange(m, end)) {
      const dis = day > d || day < h.start || h.link === 'sport';
      cells += `<button class="${st.days.has(day) ? 'on' : ''} ${day === d ? 'today' : ''}" ${dis ? 'disabled' : ''} data-act="toggle" data-arg="${h.id}:${day}">${Number(day.slice(8))}</button>`;
    }
    const prev = C.monthStart(C.addDays(m, -1)), next = C.addDays(end, 1);
    return `<div class="row between" style="margin:0 0 10px"><button class="iconbtn" data-act="cal" data-arg="${h.id}:${prev}" aria-label="Vormonat">‹</button>
      <b>${MONTHS[first.getMonth()]} ${m.slice(0, 4)}</b><button class="iconbtn" data-act="cal" data-arg="${h.id}:${next}" aria-label="Nächster Monat" ${next > d ? 'disabled' : ''}>›</button></div>
      <div class="cal">${cells}</div>`;
  }
  function heatmap(h, st, y) {
    const start = C.weekStart(`${y}-01-01`), end = `${y}-12-31`, cell = 11, gap = 2;
    let x = 0, rects = '';
    for (let w = start; w <= end; w = C.addDays(w, 7), x++) {
      for (let i = 0; i < 7; i++) {
        const day = C.addDays(w, i); if (day.slice(0, 4) !== y) continue;
        const on = st.days.has(day);
        rects += `<rect x="${x * (cell + gap)}" y="${i * (cell + gap)}" width="${cell}" height="${cell}" rx="2.5" style="fill:${on ? h.color : 'var(--grid)'}"/>`;
      }
    }
    const W = x * (cell + gap), H = 7 * (cell + gap);
    const py = String(Number(y) - 1), ny = String(Number(y) + 1);
    return `<svg class="heat" viewBox="0 0 ${W} ${H}" role="img" aria-label="Jahresübersicht ${y}">${rects}</svg>
      <div class="row between" style="margin-top:8px"><button class="btn sm ghost" data-act="year" data-arg="${h.id}:${py}">${py}</button>
      <span class="muted small num">${[...st.days].filter(d => d.startsWith(y)).length} Tage</span>
      <button class="btn sm ghost" data-act="year" data-arg="${h.id}:${ny}" ${ny > today().slice(0, 4) ? 'disabled' : ''}>${ny}</button></div>`;
  }
  function targetFields(h) {
    const cur = h ? C.targetAt(h, C.weekStart(today())) : 3;
    return `<div class="fields"><label class="f"><span>Mal pro Woche</span><input type="text" inputmode="numeric" id="hTarget" value="${cur || 3}"></label>
      ${h && h.type === 'weekly' ? `<label class="f"><span>Änderung gilt</span><select id="hTargetFrom"><option value="now">ab dieser Woche</option><option value="all">rückwirkend für alle Wochen</option></select></label>` : ''}</div>
      ${h && h.type === 'weekly' ? '<p class="faint small" style="margin-top:-6px">„Ab dieser Woche“ lässt deine bisherigen Serien und Quoten unverändert.</p>' : '<p class="faint small" style="margin-top:-6px">Nur relevant bei „X-mal pro Woche“.</p>'}`;
  }
  function screenHabitEdit({ id }) {
    const h = id ? S.habits.find(x => x.id === id) : null;
    const v = h || { name: '', emoji: '✓', color: COLORS[3], type: 'daily', target: 3, start: today() };
    ui.draftColor = ui.draftColor || v.color;
    return `${header(h ? 'Gewohnheit bearbeiten' : 'Neue Gewohnheit')}
      <label class="f"><span>Name</span><input type="text" id="hName" value="${esc(v.name)}" placeholder="Ich lese heute 10 Seiten"></label>
      <div class="fields"><label class="f"><span>Symbol (Emoji)</span><input type="text" id="hEmoji" value="${esc(v.emoji)}"></label>
      <label class="f"><span>Beginn</span><input type="date" id="hStart" value="${v.start}"></label></div>
      ${h && h.link === 'sport' ? `<p class="faint small">Wird automatisch durch deine Trainings abgehakt. Die Art bleibt deshalb „X-mal pro Woche“.</p>${targetFields(h)}` : ''}
      ${h && h.link === 'weightgoal' ? `<p class="faint small">Verknüpft mit deinem Gewicht: Ist der 30-Tage-Durchschnitt am Ziel oder der Stichtag vorbei, wird die Gewohnheit archiviert. Den Namen passt du bei Bedarf oben selbst an.</p>
      <div class="fields"><label class="f"><span>Zielgewicht (kg)</span><input type="text" inputmode="decimal" id="hGoalKg" value="${C.fmt(h.goal.kg)}"></label>
      <label class="f"><span>Stichtag</span><input type="date" id="hGoalDate" value="${h.goal.deadline}"></label></div>` : ''}
      ${h && h.link ? '' : `
      <div class="fields"><label class="f"><span>Art</span><select id="hType"><option value="daily" ${v.type === 'daily' && v.kind !== 'verzicht' ? 'selected' : ''}>Täglich</option><option value="verzicht" ${v.kind === 'verzicht' ? 'selected' : ''}>Täglich (Verzicht)</option><option value="weekly" ${v.type === 'weekly' ? 'selected' : ''}>X-mal pro Woche</option></select></label></div>
      ${targetFields(h)}`}
      <label class="f"><span>Farbe</span><div class="swatches">${COLORS.map(c => `<button class="swatch" style="background:${c}" aria-pressed="${c === ui.draftColor}" data-act="color" data-arg="${c}" aria-label="Farbe ${c}"></button>`).join('')}</div></label>
      <button class="btn primary block" data-act="saveHabit" data-arg="${h ? h.id : ''}">Speichern</button>
      ${h ? `<div style="height:10px"></div><button class="btn ghost block" data-act="archiveHabit" data-arg="${h.id}">${h.archived ? 'Wieder aktivieren' : 'Archivieren'}</button>
      <div style="height:10px"></div><button class="btn danger block" data-act="deleteHabit" data-arg="${h.id}">Löschen</button>` : ''}`;
  }

  // ===== TRAINING =====
  function viewTraining() {
    const d = today(), y = d.slice(0, 4);
    const pauses = S.pauses.filter(p => !p.to || p.to >= d);
    const nEx = S.exercises.filter(e => C.exHistory(S, e.id).length).length;
    const ts = setting('trainStart', 'ask');
    const startBtn = ts === 'ask' ? '<button class="btn primary block xl" data-act="sheet" data-arg="startTraining">Einheit starten</button>'
      : `<div class="row" style="gap:10px"><button class="btn primary xl grow" data-act="startTraining" data-arg="${ts}:">Einheit starten · ${ts === 'repeat' ? 'wie zuletzt' : 'leer'}</button><button class="iconbtn" style="width:56px;height:56px;flex:none" data-act="sheet" data-arg="startTraining" aria-label="Andere Startmöglichkeiten">${MORE}</button></div>`;
    let out = `<div class="ph"><h1>Training</h1><div class="meta"><span class="pill num">${C.trainings(S).filter(s => s.date.startsWith(y)).length} in ${y}</span></div></div>
      ${startBtn}
      <div class="trio" style="margin:10px 0 0"><button class="card tilebtn act" data-act="newMove"><span class="tile-emo" style="--hc:var(--sage)">🚶</span><b>Bewegung</b><span class="faint small">eintragen</span></button>
      <button class="card tilebtn act" data-act="open" data-arg="progress"><span class="tile-emo" style="--hc:var(--umber)">📈</span><b>Fortschritt</b><span class="faint small num">${nEx} mit Verlauf</span></button>
      <button class="card tilebtn act" data-act="open" data-arg="exercises"><span class="tile-emo" style="--hc:#7FA6D6">🏋️</span><b>Übungen</b><span class="faint small num">${S.exercises.length} · neu</span></button></div>`;
    for (const p of pauses) out += `<div class="notice row"><span class="grow">${esc(p.cat)} pausiert seit ${dNum(p.from).slice(0, 6)}</span><button class="btn sm ghost" data-act="endPause" data-arg="${p.id}">Beenden</button></div>`;
    const list = [...S.sessions].sort((a, b) => (b.date + C.pad(b.num || 0)).localeCompare(a.date + C.pad(a.num || 0)));
    let month = '', rows = '';
    const flush = () => { if (rows) out += `<div class="wlist">${rows}</div>`; rows = ''; };
    for (const s of list.slice(0, ui.trainMore ? 9999 : 40)) {
      const m = s.date.slice(0, 7);
      if (m !== month) { flush(); month = m; out += `<div class="lbl mon">${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}</div>`; }
      const day = dShort(s.date).slice(0, 9);
      if (s.kind === 'move') {
        rows += `<button class="srow" data-act="open" data-arg="move:${s.id}"><span class="sn mv">🚶</span><span class="grow"><b>${day}</b><span class="cats">${esc(s.activity)} · ${s.min} Min.${s.min >= 60 ? ' · zählt' : ''}</span></span><span class="chev">›</span></button>`;
      } else {
        const cats = catNames().filter(c => s.items.some(i => (C.exById(S, i.ex) || {}).cat === c));
        rows += `<button class="srow" data-act="open" data-arg="session:${s.id}"><span class="sn num">${s.num}</span><span class="grow"><b>${day}</b>${s.done ? '' : ' <span class="pill due">läuft</span>'}<span class="cats">${cats.length ? cats.map(c => `<span class="ct"><i style="--c:${catCol(c)}"></i>${c}</span>`).join('') : 'noch leer'}</span></span><span class="chev">›</span></button>`;
      }
    }
    flush();
    if (list.length > 40 && !ui.trainMore) out += `<button class="linkbtn" data-act="trainMore">Alle ${list.length} Einträge ›</button>`;
    if (!list.length) out += `<p class="muted">Noch keine Einheiten.</p>`;
    return out;
  }
  const FIELDS = {
    weight: [['w', 'kg'], ['r', 'Wdh.']], assist: [['w', 'Hilfe kg'], ['r', 'Wdh.']], reps: [['r', 'Wdh.']],
    time: [['s', 'Sek.']], cardio: [['min', 'Min.'], ['kmh', 'km/h'], ['incl', 'Steig.'], ['km', 'km']], sled: [['w', 'kg'], ['m', 'Meter']]
  };
  function screenSession({ id }) {
    const s = S.sessions.find(x => x.id === id); if (!s) return header('Nicht gefunden');
    let out = header(`Einheit ${s.num}`, s.done ? '' : `<button class="btn sm primary" data-act="finish" data-arg="${s.id}">Fertig</button>`);
    out += `<label class="f"><span>Datum</span><input type="date" value="${s.date}" data-change="sessDate" data-arg="${s.id}"></label>`;
    s.items.forEach((it, idx) => { out += exCard(s, it, idx); });
    out += `<button class="btn block" data-act="sheet" data-arg="picker:${s.id}">Übung hinzufügen</button>
      <label class="f" style="margin-top:16px"><span>Notiz zur Einheit</span><textarea data-input="sessNote" data-arg="${s.id}" placeholder="Wie lief es?">${esc(s.note || '')}</textarea></label>
      ${s.done ? '' : `<button class="btn primary block" data-act="finish" data-arg="${s.id}">Einheit abschließen</button><div style="height:10px"></div>`}
      <button class="btn danger block" data-act="deleteSession" data-arg="${s.id}">Einheit löschen</button>`;
    return out;
  }
  function exCard(s, it, idx) {
    const ex = C.exById(S, it.ex) || { name: 'Unbekannte Übung', type: 'weight', cat: '' };
    const paused = C.pauseFor(S, ex.cat, s.date);
    const last = C.lastItem(S, it.ex, s.id);
    const lastTxt = last ? `<span class="faint">${dShort(last.session.date).slice(3, 9)}</span> ${esc(C.setSummary(ex, last.item.sets))}${last.item.note ? ' – ' + esc(last.item.note) : ''}` : 'Zum ersten Mal';
    let body = '';
    if (ex.type === 'done') {
      body = `<label class="check" style="margin:12px 0"><input type="checkbox" ${it.done ? 'checked' : ''} data-change="itemDone" data-arg="${s.id}:${idx}"> Erledigt</label>`;
    } else {
      const f = FIELDS[ex.type] || FIELDS.weight;
      body = `<div class="sets" style="--cols:${f.length}"><div class="set-head"><span>#</span>${f.map(x => `<span>${x[1]}</span>`).join('')}<span></span></div>` +
        it.sets.map((st, si) => `<div class="set"><span class="i">${si + 1}</span>${f.map(([k, l]) => `<input type="text" inputmode="${k === 'incl' ? 'text' : 'decimal'}" aria-label="${l} Satz ${si + 1}" value="${st[k] === null || st[k] === undefined ? '' : esc(String(ex.type === 'assist' && k === 'w' ? Math.abs(st[k]) : st[k]).replace('.', ','))}" data-input="set" data-arg="${s.id}:${idx}:${si}:${k}">`).join('')}<button class="x" data-act="delSet" data-arg="${s.id}:${idx}:${si}" aria-label="Satz löschen">×</button></div>`).join('') +
        `</div><button class="btn sm" data-act="addSet" data-arg="${s.id}:${idx}">+ Satz</button>`;
    }
    return `<div class="ex ${paused ? 'paused' : ''}"><div class="row between"><h3>${esc(ex.name)}${ex.uni ? ' <span class="faint small">pro Seite</span>' : ''}</h3>
      <span>${paused ? '<span class="badge pause">pausiert</span> ' : ''}<span class="badge"><i class="cdot" style="--c:${catCol(ex.cat)}"></i>${esc(ex.cat)}</span></span></div>
      <p class="last">${lastTxt}</p>${body}
      <input type="text" style="margin-top:10px;min-height:40px;font-size:14px" placeholder="Notiz zur Übung" value="${esc(it.note || '')}" data-input="itemNote" data-arg="${s.id}:${idx}">
      <div class="row" style="justify-content:flex-end;margin-top:8px">${last ? `<button class="btn sm ghost" style="margin-right:auto" data-act="open" data-arg="exStats:${it.ex}">Verlauf</button>` : ''}<button class="btn sm ghost" data-act="moveItem" data-arg="${s.id}:${idx}:-1" aria-label="Nach oben">↑</button><button class="btn sm ghost" data-act="moveItem" data-arg="${s.id}:${idx}:1" aria-label="Nach unten">↓</button><button class="btn sm danger" data-act="delItem" data-arg="${s.id}:${idx}" aria-label="Übung entfernen">✕</button></div></div>`;
  }
  function screenMove({ id }) {
    const m = S.sessions.find(x => x.id === id); if (!m) return header('Nicht gefunden');
    return `${header('Bewegung')}
      <label class="f"><span>Datum</span><input type="date" value="${m.date}" data-change="moveField" data-arg="${m.id}:date"></label>
      <label class="f"><span>Aktivität</span><input type="text" value="${esc(m.activity)}" list="acts" data-input="moveField" data-arg="${m.id}:activity" placeholder="Spaziergang"></label>
      <datalist id="acts"><option>Spaziergang</option><option>Wandern</option><option>Radfahren</option><option>Schwimmen</option></datalist>
      <label class="f"><span>Minuten (ab 60 zählt es für Sport)</span><input type="text" inputmode="numeric" value="${m.min || ''}" data-input="moveField" data-arg="${m.id}:min"></label>
      <label class="f"><span>Notiz</span><input type="text" value="${esc(m.note || '')}" data-input="moveField" data-arg="${m.id}:note"></label>
      <button class="btn primary block" data-act="back">Fertig</button><div style="height:10px"></div>
      <button class="btn danger block" data-act="deleteSession" data-arg="${m.id}">Löschen</button>`;
  }
  function screenExercises() {
    let out = header('Übungen') + `<button class="btn primary block xl" data-act="open" data-arg="exEdit">Neue Übung anlegen</button>`;
    for (const cat of catNames()) {
      const list = S.exercises.filter(e => e.cat === cat).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      if (!list.length) continue;
      out += `<h2>${cat}${C.pauseFor(S, cat) ? ' <span class="badge pause">pausiert</span>' : ''}</h2>` + list.map(e => `<button class="pick" data-act="open" data-arg="exEdit:${e.id}"><span>${esc(e.name)}</span><span class="faint small">${C.TYPES[e.type]}${e.uni ? ', pro Seite' : ''}</span></button>`).join('');
    }
    return out;
  }
  function screenExEdit({ id, sessionId }) {
    const e = id ? C.exById(S, id) : { name: '', cat: 'Beine', type: 'weight', uni: false };
    const used = id && S.sessions.some(s => s.items && s.items.some(i => i.ex === id));
    return `${header(id ? 'Übung bearbeiten' : 'Neue Übung')}
      <label class="f"><span>Name</span><input type="text" id="eName" value="${esc(e.name)}" placeholder="Lunges"></label>
      <div class="fields"><label class="f"><span>Kategorie</span><select id="eCat">${catNames().map(c => `<option ${c === e.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="f"><span>Messart</span><select id="eType">${Object.entries(C.TYPES).map(([k, v]) => `<option value="${k}" ${k === e.type ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <label class="check" style="margin:0 0 18px"><input type="checkbox" id="eUni" ${e.uni ? 'checked' : ''}> Einseitig (Gewicht pro Hantel, Wdh. pro Seite)</label>
      <button class="btn primary block" data-act="saveEx" data-arg="${id || ''}:${sessionId || ''}">Speichern</button>
      ${id && !used ? `<div style="height:10px"></div><button class="btn danger block" data-act="deleteEx" data-arg="${id}">Löschen</button>` : ''}
      ${used ? '<p class="faint small">Diese Übung kommt in Einheiten vor und kann deshalb nicht gelöscht werden.</p>' : ''}`;
  }
  function screenPauses() {
    const d = today();
    let out = header('Pausen', infoBtn('pauses'));
    for (const p of [...S.pauses].reverse()) out += `<div class="card row between"><span><b>${esc(p.cat)}</b><br><span class="muted small">${dNum(p.from)} – ${p.to ? dNum(p.to) : 'offen'}</span></span>${!p.to || p.to >= d ? `<button class="btn sm ghost" data-act="endPause" data-arg="${p.id}">Beenden</button>` : ''}</div>`;
    out += `<h2>Neue Pause</h2><div class="fields"><select id="pCat">${catNames().map(c => `<option>${c}</option>`).join('')}</select><button class="btn primary" data-act="addPause">Pausieren</button></div>`;
    return out;
  }

  // ===== LEISTUNGSENTWICKLUNG =====
  const fmtM = (v, unit) => v === undefined || v === null ? '–' : (unit === 'Sek.' && v >= 120 ? `${C.fmtW(Math.round(v / 6) / 10)} Min.` : `${unit === 'kg' && v >= 100 ? Math.round(v).toLocaleString('de-DE') : C.fmtW(Math.round(v * 10) / 10)} ${unit}`);
  function metricOf(ex) {
    const list = C.METRICS[ex.type] || []; if (!list.length) return null;
    return list.find(m => m[0] === ui.metric[ex.id]) || list[0];
  }
  function lineChart(pts, { invert = false, color = '#9C735B', W = 400, H = 200, spark = false } = {}) {
    if (pts.length < 2) return '';
    const L = spark ? 2 : 34, R = spark ? 2 : 8, Tp = spark ? 3 : 10, B = spark ? 3 : 22;
    const vals = pts.map(p => p.v); let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo) * 0.12 || Math.max(1, Math.abs(hi) * 0.1); lo -= pad; hi += pad;
    const a = pts[0].d, b = pts[pts.length - 1].d, span = Math.max(1, C.diffDays(a, b));
    const X = d => L + (W - L - R) * C.diffDays(a, d) / span;
    const Y = v => { const f = (hi - v) / (hi - lo); return Tp + (H - Tp - B) * (invert ? 1 - f : f); };
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.d).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
    if (spark) return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    let g = '';
    const step = niceStep((hi - lo) / 4);
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      const lbl = Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : (Math.round(v * 10) / 10).toLocaleString('de-DE');
      g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" style="stroke:var(--grid)"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" style="fill:var(--fa)">${lbl}</text>`;
    }
    g += [[a, 'start'], [b, 'end']].map(([d, an]) => `<text x="${X(d)}" y="${H - 6}" font-size="11" style="fill:var(--fa)" text-anchor="${an}">${dNum(d)}</text>`).join('');
    const best = invert ? Math.min(...vals) : Math.max(...vals);
    const dots = pts.map(p => `<circle cx="${X(p.d).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="${p.v === best ? 4.5 : 3}" style="fill:${p.v === best ? 'var(--warn)' : color}"/>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf">${g}<path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>${dots}</svg>`;
  }
  function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x || 1))); const f = x / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
  function screenProgress() {
    let out = header('Fortschritt');
    for (const cat of catNames()) {
      const rows = S.exercises.filter(e => e.cat === cat).map(e => ({ e, h: C.exHistory(S, e.id) })).filter(x => x.h.length)
        .sort((a, b) => b.h[b.h.length - 1].d.localeCompare(a.h[a.h.length - 1].d));
      if (!rows.length) continue;
      out += `<h2>${cat}${C.pauseFor(S, cat) ? ' <span class="badge pause">pausiert</span>' : ''}</h2>`;
      for (const { e, h } of rows) {
        const m = metricOf(e), pts = m ? h.filter(x => x.v[m[0]] !== undefined).map(x => ({ d: x.d, v: x.v[m[0]] })) : [];
        const lastV = pts.length ? fmtM(pts[pts.length - 1].v, m[2]) : `${h.length}× erledigt`;
        out += `<button class="pick" data-act="open" data-arg="exStats:${e.id}"><span class="grow" style="min-width:0"><span style="display:block">${esc(e.name)}</span><span class="faint small">${m ? esc(m[1]) + ': ' : ''}${lastV} · ${h.length} Einheiten</span></span>
          <span style="flex:0 0 auto;margin-left:10px">${pts.length >= 2 ? lineChart(pts.slice(-20), { invert: !!m[3], W: 84, H: 30, spark: true }) : ''}</span></button>`;
      }
    }
    return out;
  }
  function screenExStats({ id }) {
    const ex = C.exById(S, id); if (!ex) return header('Nicht gefunden');
    const h = C.exHistory(S, id), m = metricOf(ex), list = C.METRICS[ex.type] || [];
    let out = header(esc(ex.name), infoBtn('ex')) + `<div class="pills" style="margin:0 0 14px"><span class="pill"><i class="cdot" style="--c:${catCol(ex.cat)}"></i>${esc(ex.cat)}</span><span class="pill">${C.TYPES[ex.type]}</span>${ex.uni ? '<span class="pill">pro Seite</span>' : ''}</div>`;
    if (!h.length) return out + '<p class="muted">Noch keine Einträge.</p>';
    if (!m) {
      return out + `<div class="stats"><div class="stat"><b class="num">${h.length}</b><span>Mal erledigt</span></div><div class="stat"><b class="num" style="font-size:18px">${dNum(h[0].d)}</b><span>Erstes Mal</span></div><div class="stat"><b class="num" style="font-size:18px">${dNum(h[h.length - 1].d)}</b><span>Zuletzt</span></div></div>`;
    }
    if (list.length > 1) out += `<div class="seg" style="margin:0 0 12px;flex-wrap:wrap">${list.map(x => `<button aria-pressed="${x[0] === m[0]}" data-act="metric" data-arg="${ex.id}:${x[0]}">${x[1]}</button>`).join('')}</div>`;
    const pts = h.filter(x => x.v[m[0]] !== undefined).map(x => ({ d: x.d, v: x.v[m[0]] }));
    if (!pts.length) return out + '<p class="muted">Für diese Kennzahl gibt es noch keine Werte.</p>';
    const inv = !!m[3], first = pts[0], lastP = pts[pts.length - 1];
    const bestP = pts.reduce((a, p) => (inv ? p.v < a.v : p.v > a.v) ? p : a, pts[0]);
    const delta = lastP.v - first.v, better = inv ? delta < 0 : delta > 0;
    out += `<div class="stats"><div class="stat"><b class="num" style="font-size:20px">${fmtM(lastP.v, m[2])}</b><span>Zuletzt · ${dNum(lastP.d)}</span></div>
      <div class="stat"><b class="num" style="font-size:20px;color:var(--warn)">${fmtM(bestP.v, m[2])}</b><span>Bestwert · ${dNum(bestP.d)}</span></div>
      <div class="stat"><b class="num" style="font-size:20px;${delta === 0 ? '' : better ? 'color:var(--sage)' : 'color:var(--danger)'}">${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${fmtM(Math.abs(delta), m[2])}</b><span>Seit ${dNum(first.d)}</span></div></div>`;
    out += pts.length >= 2 ? lineChart(pts, { invert: inv }) : '<p class="muted">Ab zwei Einträgen erscheint hier der Verlauf.</p>';

    if (ex.type === 'weight') {
      const rec = C.repRecords(h);
      if (rec.length) out += `<h2>Bestwerte je Wdh.</h2><table class="t num">${rec.map(r => `<tr><td>${r.r} Wdh.</td><td><b>${C.fmtW(r.w)} kg</b> <span class="faint small">${dNum(r.d)}</span></td></tr>`).join('')}</table>`;
    }
    out += `<h2>Einheiten</h2><table class="t">${h.slice().reverse().slice(0, 30).map(x => `<tr><td class="num">${dShort(x.d)}</td><td class="small">${esc(C.setSummary(ex, x.sets) || 'erledigt')}${x.note ? `<br><span class="faint">${esc(x.note)}</span>` : ''}</td></tr>`).join('')}</table>`;
    return out;
  }

  // ===== GEWICHT =====
  function weightTargets(ws) {
    const t = new Set();
    for (const h of S.habits) if (!h.archived && h.link === 'weightgoal' && h.goal) t.add(h.goal.kg);
    for (const g of S.goals) if (g.type === 'weight' && Number(g.year) >= Number(today().slice(0, 4))) t.add(g.target);
    t.add(88);
    return [...t].filter(k => ws.avg !== null && k < ws.avg).sort((a, b) => b - a);
  }
  function viewGewicht() {
    const d = today(), ws = C.weightStatus(S.weights, d);
    const ms = [...S.measurements].sort((a, b) => a.t.localeCompare(b.t)), lastNavy = ms[ms.length - 1];
    const tp = C.tempo(ws.daily, d), m = weightModel(ws, tp, d);
    const fat = lastNavy && lastNavy.fat !== null && lastNavy.fat !== undefined ? `${C.fmt(lastNavy.fat)} %` : '–';
    const chips = [tp === null ? '' : `<span class="chip-b num">${tp > 0 ? '↑' : '↓'} ${C.fmt(Math.abs(tp), 2)} kg/Wo</span>`,
      m.phase === 1 ? `<span class="chip-b num">${m.left > 0 ? `noch ${C.fmt(m.left)} kg` : (m.rl ? `noch ${m.rl} Wiegetage` : 'Ziel erreicht')}${m.when ? ' · ' + m.when : ''}</span>` : `<span class="chip-b num">Puffer ${C.fmt(m.buffer)} kg</span>`].join('');
    return `<div class="ph"><h1>Gewicht</h1><div class="meta"><span class="pill ${ws.due ? 'due' : ''}">${ws.phase === 1 ? 'täglich' : 'monatlich'}${ws.due ? ' · fällig' : ''}</span><button class="info" data-act="sheet" data-arg="infoWeight" aria-label="Erklärung">${INFO}</button></div></div>
      <div class="card hero-w">${ring(m.phase === 1 ? m.frac : 1, 188, 14, 'var(--accent)', `<span class="lbl">Ø 30 Tage</span><b class="num">${C.fmt(ws.avg)}</b><span class="unit">kg</span>`)}
      <div class="ring-cap">${m.phase === 1 ? `Phase 2 (monatlich) ab ${C.fmt(C.T.p1to3)} kg` : `Grenze ${C.fmt(C.T.relapse)} kg`}</div><div class="chips-b">${chips}</div></div>
      <div class="entry-b"><input type="text" inputmode="decimal" placeholder="Gewicht, kg" id="wKg" aria-label="Gewicht in kg"><button class="iconbtn lg" data-act="toggleWhen" aria-label="Anderer Zeitpunkt">${CLOCK}</button><button class="fab" data-act="addWeight" aria-label="Gewicht speichern">${CHECK}</button></div>
      <input type="datetime-local" id="wWhen" hidden style="margin:-4px 0 12px" value="${C.nowLocal()}">
      <div class="card"><div class="row between"><h2 style="margin:0">Verlauf</h2><div class="seg">${['1M', '3M', '6M', '1J'].map(r => `<button aria-pressed="${rangeFor(ws) === r}" data-act="range" data-arg="${r}">${r}</button>`).join('')}</div></div>
      ${chart(ws, d)}</div>
      <div class="duo"><button class="card tilebtn" data-act="open" data-arg="measure"><span class="lbl">Körperfett</span><b class="num">${fat}</b><span class="faint small num">${lastNavy ? dShort(lastNavy.t) : 'messen'}</span></button>
      <button class="card tilebtn" data-act="open" data-arg="weights"><span class="lbl">Einträge</span><b class="num">${S.weights.length}</b><span class="faint small num">zuletzt ${ws.lastDay ? dShort(ws.lastDay).slice(3) : '–'}</span></button></div>`;
  }
  function kfaChart(ms) {
    if (ms.length < 2) return '';
    const W = 400, H = 160, L = 30, R = 10, Tp = 10, B = 22;
    const vals = ms.map(m => m.fat); let lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
    const a = ms[0].t.slice(0, 10), b = ms[ms.length - 1].t.slice(0, 10), span = Math.max(1, C.diffDays(a, b));
    const X = t => L + (W - L - R) * C.diffDays(a, t.slice(0, 10)) / span, Y = v => Tp + (H - Tp - B) * (hi - v) / (hi - lo);
    let g = '';
    for (let v = lo; v <= hi; v += (hi - lo > 6 ? 2 : 1)) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--grid)"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" style="fill:var(--fa)">${v}</text>`;
    const line = ms.map((m, i) => `${i ? 'L' : 'M'}${X(m.t).toFixed(1)},${Y(m.fat).toFixed(1)}`).join('');
    const dots = ms.map(m => `<circle cx="${X(m.t).toFixed(1)}" cy="${Y(m.fat).toFixed(1)}" r="4" style="fill:var(--warn)"/>`).join('');
    const lbl = [ms[0], ms[ms.length - 1]].map((m, i) => `<text x="${X(m.t)}" y="${H - 6}" font-size="11" style="fill:var(--fa)" text-anchor="${i ? 'end' : 'start'}">${dNum(m.t)}</text>`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="KFA-Verlauf">${g}<path d="${line}" fill="none" style="stroke:var(--warn)" stroke-width="2"/>${dots}${lbl}</svg>`;
  }
  function weightTable(n) {
    const list = [...S.weights].sort((a, b) => b.t.localeCompare(a.t)).slice(0, n);
    return `<table class="t num">${list.map(w => `<tr><td>${dShort(w.t)} <span class="faint small">${w.t.slice(11, 16)}</span>${w.src === 'alt' ? ' <span class="badge">alte App</span>' : ''}</td><td><b>${C.fmt(w.kg)}</b> kg <button class="btn sm ghost" style="min-height:30px;padding:2px 8px;margin-left:6px" data-act="delWeight" data-arg="${w.t}:${w.kg}" aria-label="Eintrag löschen">×</button></td></tr>`).join('')}</table>`;
  }
  function chart(ws, d) {
    if (!ws.daily.length) return '<p class="muted">Noch keine Werte.</p>';
    const from = C.addDays(d, -({ '1M': 30, '3M': 91, '6M': 182, '1J': 365 }[rangeFor(ws)] || 30));
    const pts = ws.daily.filter(x => x.d >= from);
    const avg = [];
    const step = 1;
    let i = 0;
    for (const day of C.dayRange(from < ws.daily[0].d ? ws.daily[0].d : from, d)) { if (i++ % step === 0) { const a = C.avg30(ws.daily, day); if (a !== null) avg.push({ d: day, kg: a }); } }
    const vals = pts.map(p => p.kg).concat(avg.map(a => a.kg));
    if (!vals.length) return '<p class="muted">Keine Werte in diesem Zeitraum.</p>';
    let lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
    const W = 400, H = 220, L = 30, R = 6, Tp = 8, B = 22;
    const span = Math.max(1, C.diffDays(from, d));
    const X = day => L + (W - L - R) * C.diffDays(from, day) / span;
    const Y = kg => Tp + (H - Tp - B) * (hi - kg) / (hi - lo);
    let g = '';
    const stepY = hi - lo > 20 ? 5 : 2;
    for (let v = Math.ceil(lo / stepY) * stepY; v <= hi; v += stepY) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--grid)"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" style="fill:var(--fa)">${v}</text>`;
    for (const ref of weightLines()) if (ref >= lo && ref <= hi) g += `<line x1="${L}" x2="${W - R}" y1="${Y(ref)}" y2="${Y(ref)}" style="stroke:var(--warn)" stroke-dasharray="4 5" stroke-width="1" stroke-opacity=".8"/><text class="ref" x="${W - R}" y="${Y(ref) - 4}" text-anchor="end" style="fill:var(--warn)">${C.fmtW(ref)}</text>`;
    // Monatsmarken
    let mk = C.monthStart(C.addDays(from, 31)), lastLabel = -99;
    if (span <= 31) { for (let k = 0; k <= 4; k++) { const dd = C.addDays(from, Math.round(span * k / 4)); g += `<text x="${X(dd)}" y="${H - 6}" font-size="11" style="fill:var(--fa)" text-anchor="${k === 0 ? 'start' : k === 4 ? 'end' : 'middle'}">${Number(dd.slice(8))}.${Number(dd.slice(5, 7))}.</text>`; } mk = '9999'; }
    while (mk <= d) { const x = X(mk); if (x - lastLabel > 46) { g += `<text x="${x}" y="${H - 6}" font-size="11" style="fill:var(--fa)" text-anchor="middle">${MONTHS[Number(mk.slice(5, 7)) - 1].slice(0, 3)}${mk.slice(5, 7) === '01' ? ' ' + mk.slice(2, 4) : ''}</text>`; lastLabel = x; } mk = C.monthStart(C.addDays(C.monthEnd(mk), 1)); }
    const dots = pts.map(p => `<circle cx="${X(p.d).toFixed(1)}" cy="${Y(p.kg).toFixed(1)}" r="${pts.length > 150 ? 1.4 : 2.2}" style="fill:var(--sage)" fill-opacity=".45"/>`).join('');
    const line = avg.map((a, k) => `${k ? 'L' : 'M'}${X(a.d).toFixed(1)},${Y(a.kg).toFixed(1)}`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf">${g}${dots}<path d="${line}" fill="none" style="stroke:var(--sage)" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  }
  function screenWeights() { return header('Alle Einträge') + weightTable(99999); }
  function screenMeasure() {
    const h = S.settings.heightCm;
    return `${header('Umfänge messen', infoBtn('measure'))}
      ${h ? '' : `<label class="f"><span>Körpergröße in cm</span><input type="text" inputmode="decimal" id="mH" placeholder="188"></label>`}
      <div class="fields"><label class="f"><span>Hals (cm)</span><input type="text" inputmode="decimal" id="mNeck" data-input="navyPreview"></label>
      <label class="f"><span>Bauch (cm)</span><input type="text" inputmode="decimal" id="mWaist" data-input="navyPreview"></label></div>
      <label class="f"><span>Datum</span><input type="date" id="mDate" value="${today()}"></label>
      <p class="big num" id="navyOut" style="font-size:34px;margin:6px 0 18px">– %</p>
      <button class="btn primary block" data-act="saveMeasure">Speichern</button>
      ${S.measurements.length ? `<h2>Messungen</h2><table class="t num">${[...S.measurements].sort((a, b) => b.t.localeCompare(a.t)).map(m => `<tr><td>${dNum(m.t)} <span class="faint small">${m.neck ? `Hals ${C.fmt(m.neck)}, Bauch ${C.fmt(m.waist)}` : 'ohne Umfänge'}</span></td><td><b>${C.fmt(m.fat)} %</b> <button class="btn sm ghost" style="min-height:30px;padding:2px 8px" data-act="delMeasure" data-arg="${m.t}" aria-label="Messung löschen">×</button></td></tr>`).join('')}</table>` : ''}`;
  }

  // ===== MEHR =====
  function viewMehr() {
    const ago = S.lastBackup ? C.diffDays(S.lastBackup.slice(0, 10), today()) : null;
    const agoTxt = ago === null ? 'noch nie' : ago === 0 ? 'heute' : ago === 1 ? 'gestern' : `vor ${ago} Tagen`;
    const row = (arg, l, v) => `<button class="srow" data-act="open" data-arg="${arg}"><span class="grow"><b>${l}</b></span><span class="muted num">${v}</span><span class="chev">›</span></button>`;
    const seg = (key, opts) => `<div class="seg wide">${opts.map(([k, l]) => `<button aria-pressed="${String(setting(key, DEFAULTS[key])) === String(k)}" data-act="setting" data-arg="${key}:${k}">${l}</button>`).join('')}</div>`;
    const set = (label, inner) => `<div class="opt"><span class="lbl">${label}</span>${inner}</div>`;
    const acc = ACCENTS[S.settings.accent] ? S.settings.accent : 'mint';
    const act = activeHabits(), nIn = act.filter(inRing).length, hidN = tabHidden().length;
    return `<div class="ph"><h1>Mehr</h1></div>
      <div class="card"><div class="row between"><span class="lbl">Backup</span>${infoBtn('backup')}</div>
      <div class="hero-num num" style="margin:2px 0 14px">${agoTxt}${S.lastBackup ? ` <span class="faint small" style="font-weight:500">${dNum(S.lastBackup)}</span>` : ''}</div>
      <button class="btn primary block" data-act="backup">Jetzt sichern</button>
      <div class="duo" style="margin-top:10px">${navigator.canShare ? '<button class="btn block" data-act="shareBackup">Teilen</button>' : ''}<label class="btn ghost block" style="display:grid;place-items:center${navigator.canShare ? '' : ';grid-column:1 / -1'}">Wiederherstellen<input type="file" accept=".json,application/json" data-change="restore" hidden></label></div>
      ${set('Automatisch alle … Tage', seg('backupDays', SETTABLE.backupDays.map(v => [v, v])))}</div>
      <div class="lbl mon">Verwalten</div>
      <div class="wlist">${row('habits', 'Gewohnheiten', act.length)}${row('exercises', 'Übungen', S.exercises.length)}${row('cats', 'Kategorien', cats().length)}${row('pauses', 'Pausen', `${S.pauses.filter(p => !p.to).length} aktiv`)}</div>
      <div class="lbl mon">Darstellung</div>
      <div class="seg wide">${THEMES.map(([k, l]) => `<button aria-pressed="${(S.settings.theme || 'dark') === k}" data-act="theme" data-arg="${k}">${l}</button>`).join('')}</div>
      <div class="card accents"><div class="row between"><span class="lbl">Akzentfarbe</span><span class="muted small">${ACCENTS[acc][0]}</span></div>
      <div class="swatches">${Object.entries(ACCENTS).map(([k, v]) => `<button class="swatch" style="background:${v[1]}" aria-pressed="${k === acc}" data-act="accent" data-arg="${k}" aria-label="Akzentfarbe ${v[0]}">${k === acc ? CHECK : ''}</button>`).join('')}</div></div>
      <div class="card">${set('Schrift', seg('fontScale', [['normal', 'Normal'], ['large', 'Groß']]))}${set('Gewohnheiten auf „Heute“', seg('heuteView', [['tiles', 'Kacheln'], ['list', 'Liste']]))}</div>
      <div class="wlist">${row('tabOrder', 'Seiten', `Start: ${TAB_LABELS[tabOrder()[0]]}${hidN ? ` · ${hidN} aus` : ''}`)}${row('ring', 'Wochenring', `${nIn} von ${act.length}`)}</div>
      <div class="lbl mon">Training</div>
      <div class="card">${set('„Einheit starten“', seg('trainStart', [['ask', 'Fragen'], ['repeat', 'Wie zuletzt'], ['empty', 'Leer']]))}</div>
      <div class="lbl mon">Gewicht</div>
      <div class="card">${set('Diagramm zeigt zuerst', seg('weightRange', [['auto', 'Auto'], ['1M', '1M'], ['3M', '3M'], ['6M', '6M'], ['1J', '1J']]))}
      <div class="opt"><label class="lbl" for="wLines">Markierungen in kg</label><input type="text" id="wLines" inputmode="decimal" value="${weightLines().map(C.fmtW).join(' ')}" data-change="weightLines" placeholder="z. B. 99 92 88"></div>
      <div class="opt"><label class="lbl" for="hCm">Körpergröße in cm</label><input type="text" id="hCm" inputmode="decimal" value="${S.settings.heightCm || ''}" data-change="height" placeholder="cm"></div></div>
      <p class="faint small" id="persist" style="margin:18px 0 4px">…</p>
      <p class="faint small" style="margin:0">Dein Leben 2.4.0</p>`;
  }
  const DEFAULTS = { fontScale: 'normal', heuteView: 'tiles', trainStart: 'ask', weightRange: 'auto', backupDays: 7 };
  const iconOf = k => `<span class="sn"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg></span>`;
  const emoOf = h => `<span class="sn" style="background:color-mix(in srgb,${h.color} 28%,var(--s2));font-size:20px">${esc(h.emoji)}</span>`;
  const upDown = (act, i, last, name) => `<button class="iconbtn sm" data-act="${act}" data-arg="${i}:-1" aria-label="${name} nach oben" ${i === 0 ? 'disabled' : ''}>↑</button><button class="iconbtn sm" data-act="${act}" data-arg="${i}:1" aria-label="${name} nach unten" ${i === last ? 'disabled' : ''}>↓</button>`;
  function screenTabOrder() {
    const o = tabOrderAll(), last = o.length - 1, hid = tabHidden(), first = tabOrder()[0];
    return `${header('Seiten')}
      <div class="wlist">${o.map((k, i) => `<div class="srow ${hid.includes(k) ? 'off' : ''}">${iconOf(k)}<span class="grow"><b>${TAB_LABELS[k]}</b>${k === first ? ' <span class="pill">Start</span>' : ''}</span>
        ${k === 'mehr' ? '<span style="width:52px;flex:none"></span>' : `<input type="checkbox" class="sw" ${hid.includes(k) ? '' : 'checked'} data-change="tabShow" data-arg="${k}" aria-label="${TAB_LABELS[k]} anzeigen">`}
        ${upDown('moveTab', i, last, TAB_LABELS[k])}</div>`).join('')}</div>
      <p class="faint small" style="margin:12px 4px">Die oberste sichtbare Seite öffnet sich beim Start. „Mehr“ bleibt immer sichtbar.</p>
      <button class="btn ghost block" data-act="resetTabs" ${o === TAB_DEFAULT && !hid.length ? 'disabled' : ''}>Zurücksetzen</button>`;
  }
  function screenHabits() {
    const a = activeHabits(), z = S.habits.filter(h => h.archived), last = a.length - 1;
    const open = h => `<button class="row grow rowbtn" data-act="open" data-arg="habit:${h.id}">${emoOf(h)}<b class="grow">${esc(h.name)}</b></button>`;
    return `${header('Gewohnheiten')}
      <button class="btn primary block xl" data-act="open" data-arg="habitEdit">Neue Gewohnheit</button>
      ${a.length ? `<div class="lbl mon">Reihenfolge auf „Heute“</div><div class="wlist">${a.map((h, i) => `<div class="srow">${open(h)}${upDown('moveHabit', i, last, esc(h.name))}</div>`).join('')}</div>` : ''}
      ${z.length ? `<div class="lbl mon">Archiviert</div><div class="wlist">${z.map(h => `<div class="srow">${open(h)}<span class="chev">›</span></div>`).join('')}</div>` : ''}`;
  }
  function screenRing() {
    const a = activeHabits(), ex = setting('ringExclude', []);
    return `${header('Wochenring')}
      <div class="wlist">${a.map(h => `<label class="srow" style="cursor:pointer">${emoOf(h)}<b class="grow">${esc(h.name)}</b><input type="checkbox" class="sw" ${ex.includes(h.id) ? '' : 'checked'} data-change="ringToggle" data-arg="${h.id}" aria-label="${esc(h.name)} im Wochenring zählen"></label>`).join('')}</div>
      <p class="faint small" style="margin:12px 4px">Ausgeschaltete Gewohnheiten bleiben auf „Heute“, zählen aber nicht im Ring.</p>`;
  }
  function screenCats() {
    const list = cats(), last = list.length - 1, n = c => S.exercises.filter(e => e.cat === c).length;
    return `${header('Kategorien')}
      <button class="btn primary block xl" data-act="open" data-arg="catEdit:">Neue Kategorie</button>
      <div class="wlist" style="margin-top:12px">${list.map((c, i) => `<div class="srow"><button class="row grow rowbtn" data-act="open" data-arg="catEdit:${i}"><span class="sn" style="background:color-mix(in srgb,${c.color} 30%,var(--s2))"><i class="cdot" style="--c:${c.color};margin:0;width:12px;height:12px"></i></span><span class="grow"><b>${esc(c.name)}</b> <span class="faint small num">${n(c.name)}</span></span></button>
        ${upDown('moveCat', i, last, esc(c.name))}</div>`).join('')}</div>
      <p class="faint small" style="margin:12px 4px">Die Reihenfolge gilt für alle Listen im Training.</p>`;
  }
  function screenCatEdit({ idx }) {
    const list = cats(), c = idx === null || idx === undefined ? null : list[idx];
    const used = c ? S.exercises.filter(e => e.cat === c.name).length : 0;
    ui.draftColor = ui.draftColor || (c ? c.color : CAT_COLORS[7]);
    return `${header(c ? 'Kategorie bearbeiten' : 'Neue Kategorie')}
      <label class="f"><span>Name</span><input type="text" id="cName" value="${c ? esc(c.name) : ''}" placeholder="Mobilität"></label>
      <label class="f"><span>Farbe</span><div class="swatches">${CAT_COLORS.map(col => `<button class="swatch" style="background:${col}" aria-pressed="${col === ui.draftColor}" data-act="color" data-arg="${col}" aria-label="Farbe ${col}"></button>`).join('')}</div></label>
      ${used ? `<p class="faint small">${used} Übungen · ein neuer Name gilt auch für sie</p>` : ''}
      <button class="btn primary block" data-act="saveCat" data-arg="${c ? idx : ''}">Speichern</button>
      ${c && !used ? `<div style="height:10px"></div><button class="btn danger block" data-act="deleteCat" data-arg="${idx}">Löschen</button>` : ''}`;
  }

  // ===== ZIELE =====
  const GTYPES = { habit: 'Gewohnheit: Tage im Jahr', trainings: 'Trainingseinheiten (Studio)', weight: 'Gewicht: 30-Tage-Ø am 31.12.' };
  function goalYears() { const y = Number(today().slice(0, 4)); return [String(y), String(y + 1)]; }
  function defaultGoalYear() { const [a, b] = goalYears(); return S.goals.some(g => String(g.year) === a) ? a : b; }
  function lockShort(lock) {
    if (lock.editable) return lock.needsReason ? 'Fenster bis 30.06.' : `offen bis ${lock.until.split('-').reverse().slice(0, 2).join('.')}.`;
    return `🔒 bis ${lock.next ? lock.next.split('-').reverse().slice(0, 2).join('.') + '.' : '31.12.'}`;
  }
  function goalCard(g, lock) {
    const p = C.goalProgress(S, g, today());
    const mon = s => `${MONTHS[C.parseDay(s).getMonth()].slice(0, 3)} ${s.slice(2, 4)}`;
    let frac = 0, soll = null, val = '', sub = '', color = 'var(--accent)';
    if (g.type === 'habit') {
      const h = S.habits.find(x => x.id === g.habitId);
      if (p.missing) { val = '–'; sub = 'Gewohnheit fehlt'; }
      else {
        color = h.color; val = `${p.started ? p.value : 0}<span> / ${g.target}</span>`;
        if (!p.started) sub = `${esc(h.emoji)} ab 01.01.${g.year}`;
        else { frac = p.value / g.target; soll = p.soll / g.target; sub = p.value >= p.soll ? `Serie ${p.streak} Tage` : `${p.soll - p.value} Tage offen · Serie ${p.streak}`; }
      }
    } else if (g.type === 'trainings') {
      val = `${p.started ? p.value : 0}<span> / ${g.target}</span>`;
      if (!p.started) sub = `ab 01.01. · ≈ ${C.fmt(g.target / 52, 1)} pro Woche`;
      else { const diff = p.value - Math.round(p.soll); frac = p.value / g.target; soll = p.soll / g.target; sub = `Soll ${Math.round(p.soll)} · ${diff === 0 ? 'im Plan' : diff > 0 ? `+${diff}` : `${diff}`}`; }
    } else if (g.type === 'weight') {
      val = `${C.fmt(p.value)}<span> / ${C.fmt(g.target)} kg</span>`;
      if (!p.started) sub = `Ø am 31.12.${g.year}`;
      else {
        if (p.startAvg !== null && p.startAvg > g.target) { frac = (p.startAvg - p.value) / (p.startAvg - g.target); soll = (C.diffDays(`${g.year}-01-01`, today()) + 1) / C.daysInYear(g.year); }
        sub = [p.soll !== null ? `Soll ${C.fmt(p.soll)}` : '', p.fc && p.fc.date ? `≈ ${mon(p.fc.date)}` : ''].filter(Boolean).join(' · ');
      }
    }
    const inner = p.started && !p.missing ? `<b class="num">${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%</b>` : '<b class="faint">–</b>';
    return `<div class="card goal-b">${ring(frac, 84, 9, color, inner, p.started ? soll : null)}
      <div class="grow"><h3>${esc(g.title)}</h3><div class="gval num">${val}</div><div class="gsub num">${sub}</div></div>
      ${lock.editable ? `<button class="iconbtn" data-act="open" data-arg="goalEdit:${g.id}" aria-label="Ändern">${PEN}</button>` : ''}</div>`;
  }
  function viewZiele() {
    const years = goalYears(); ui.goalYear = ui.goalYear || defaultGoalYear();
    const y = ui.goalYear, lock = C.lockState(y, today()), gs = S.goals.filter(g => String(g.year) === y);
    let out = `<div class="ph"><h1>Ziele</h1><div class="meta"><span class="pill">${lockShort(lock)}</span>${infoBtn('ziele')}</div></div>
      <div class="seg wide" style="margin:0 0 14px">${years.map(v => `<button aria-pressed="${v === y}" data-act="goalYear" data-arg="${v}">${v}</button>`).join('')}</div>`;
    out += gs.map(g => goalCard(g, lock)).join('');
    if (!gs.length) out += `<div class="card"><p class="muted" style="margin:0">Noch keine Ziele für ${y}.</p></div>`;
    if (lock.editable && gs.length < 3) out += `<button class="btn primary block" data-act="open" data-arg="goalEdit::${y}">Ziel hinzufügen · ${gs.length}/3</button>`;
    const log = S.goalLog.filter(l => String(l.year) === y).slice().reverse();
    if (log.length) out += `<div class="lbl mon">Änderungen</div><div class="wlist">` + log.map(l => `<div class="r" style="display:block"><b class="num">${dNum(l.t)}</b> <span class="muted small">${{ add: 'hinzugefügt', edit: 'geändert', delete: 'gelöscht' }[l.action]}: ${esc(l.title)}</span>${l.reason ? `<div class="faint small">${esc(l.reason)}</div>` : ''}</div>`).join('') + '</div>';
    return out;
  }
  function screenGoalEdit({ id, year }) {
    const g = id ? S.goals.find(x => x.id === id) : null;
    const y = g ? String(g.year) : year, lock = C.lockState(y, today());
    if (!lock.editable) return header('Ziel') + `<p class="muted">${lock.label}.</p>`;
    const v = g || { title: '', type: 'trainings', target: 100, habitId: '' };
    const habits = S.habits.filter(h => !h.archived && h.type === 'daily');
    const show = t => v.type === t ? '' : 'hidden';
    return `${header(g ? 'Ziel ändern' : `Neues Ziel ${y}`)}
      <label class="f"><span>Titel</span><input type="text" id="gTitle" value="${esc(v.title)}" placeholder="100 Trainingseinheiten"></label>
      <label class="f"><span>Art</span><select id="gType" data-change="goalType">${Object.entries(GTYPES).map(([k, l]) => `<option value="${k}" ${k === v.type ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f" data-gtype="habit" ${show('habit')}><span>Gewohnheit</span><select id="gHabit">${habits.map(h => `<option value="${h.id}" ${h.id === v.habitId ? 'selected' : ''}>${esc(h.emoji)} ${esc(h.name)}</option>`).join('')}</select></label>
      <label class="f" data-gtype="habit" ${show('habit')}><span>Ziel: Tage in ${y} (alle Tage = ${C.daysInYear(y)})</span><input type="text" inputmode="numeric" id="gTargetHabit" value="${v.type === 'habit' ? v.target : C.daysInYear(y)}"></label>
      <label class="f" data-gtype="trainings" ${show('trainings')}><span>Ziel: Studio-Einheiten in ${y}</span><input type="text" inputmode="numeric" id="gTargetTr" value="${v.type === 'trainings' ? v.target : 100}"></label>
      <label class="f" data-gtype="weight" ${show('weight')}><span>Ziel: 30-Tage-Ø am 31.12.${y} höchstens (kg)</span><input type="text" inputmode="decimal" id="gTargetW" value="${v.type === 'weight' ? C.fmt(v.target) : ''}" placeholder="92"></label>
      ${lock.needsReason ? `<label class="f"><span>Begründung (Pflicht im Halbjahresfenster)</span><textarea id="gReason" placeholder="Warum passt du das Ziel an?"></textarea></label>` : ''}
      <button class="btn primary block" data-act="saveGoal" data-arg="${g ? g.id : ''}:${y}">Speichern</button>
      ${g ? `<div style="height:10px"></div><button class="btn danger block" data-act="deleteGoal" data-arg="${g.id}">Ziel löschen</button>` : ''}`;
  }
  function logGoal(year, action, title, reason) { S.goalLog.push({ t: C.nowLocal(), year: String(year), action, title, reason: reason || '' }); }

  const TABS = { heute: viewHeute, ziele: viewZiele, training: viewTraining, gewicht: viewGewicht, mehr: viewMehr };
  const SCREENS = { tabOrder: screenTabOrder, ring: screenRing, cats: screenCats, catEdit: screenCatEdit, habit: screenHabit, habitEdit: screenHabitEdit, session: screenSession, move: screenMove, exercises: screenExercises, exEdit: screenExEdit, pauses: screenPauses, weights: screenWeights, measure: screenMeasure, habits: screenHabits, goalEdit: screenGoalEdit, progress: screenProgress, exStats: screenExStats };

  // ---------- Sheets ----------
  const INFOS = {
    ziele: ['Wie Ziele funktionieren', () => `<p><b>Arten:</b> ${Object.values(GTYPES).join(' · ')}.</p>
      <p><b>Ring:</b> Anteil am Jahresziel. Der Strich zeigt, wo du heute laut gleichmäßigem Plan stehen solltest.</p>
      <p><b>Gewicht:</b> Es zählt der 30-Tage-Ø am 31.12. Der Plan läuft linear vom Ø am Jahresanfang bis zum Ziel; die Prognose schreibt dein Tempo der letzten 8 Wochen fort.</p>
      <p><b>Sperre:</b> Bis 31.12. des Vorjahres frei änderbar, höchstens drei Ziele. Ab 01.01. gesperrt, außer vom 24. bis 30.06. mit schriftlicher Begründung.</p>`],
    backup: ['Backup', () => `<p>Deine Daten liegen nur auf diesem Handy. ${backupDays() === 1 ? 'Jeden Tag' : `Alle ${backupDays()} Tage`} speichert die App beim ersten Tippen nach dem Öffnen automatisch ein Backup in „Downloads“.</p>
      <p><b>Wiederherstellen</b> ersetzt alle Daten in der App durch die gewählte Datei.</p>`],
    habit: ['Gewohnheit', () => `<p><b>Kalender:</b> Tippe auf einen Tag, um ihn nachzutragen oder zu entfernen. Sport ergibt sich automatisch aus Trainings und Bewegung ab 60 Minuten.</p>
      <p><b>Quote:</b> Bei „X-mal pro Woche“ zählen Monat und Jahr den Anteil der Wochen mit erreichtem Ziel.</p>`],
    measure: ['Navy-Methode', () => `<p>Hals knapp unter dem Kehlkopf, Bauch auf Nabelhöhe messen. Immer gleich messen, dann ist der Verlauf aussagekräftig.</p><p>Der Wert ist eine Schätzung mit einigen Prozentpunkten Unsicherheit.</p>`],
    pauses: ['Pausen', () => `<p>Pausierte Kategorien erscheinen in Einheiten markiert. Du beendest eine Pause selbst.</p>`],
    ex: ['Kennzahlen', () => `<p><b>Geschätztes 1RM:</b> Epley-Formel aus dem besten Satz, ab etwa 12 Wiederholungen ungenauer.</p><p><b>Volumen:</b> Gewicht × Wiederholungen über alle Sätze.</p><p><b>Gegengewicht:</b> Achse umgekehrt, weniger Hilfe liegt oben, weil es der Fortschritt ist.</p><p><b>Gelber Punkt:</b> Bestwert.</p>`]
  };
  const SHEETS = {
    info: ({ sid }) => `<h3>${INFOS[sid][0]}</h3><div class="ex-txt">${INFOS[sid][1]()}</div><button class="btn block" data-act="closeSheet">Verstanden</button>`,
    infoWeight: () => {
      const d = today(), ws = C.weightStatus(S.weights, d), th = C.thresholds(ws.phase, ws), tp = C.tempo(ws.daily, d);
      const fcs = weightTargets(ws).map(k => { const f = C.forecast(ws.avg, tp, k, d); return f && f.date ? `${C.fmt(k)} kg voraussichtlich ${MONTHS[C.parseDay(f.date).getMonth()]} ${f.date.slice(0, 4)}` : null; }).filter(Boolean);
      return `<h3>So rechnet diese Seite</h3><div class="ex-txt">
        <p><b>Ø 30 Tage:</b> Durchschnitt der letzten 30 Tage. Pro Tag zählt nur die erste Messung.</p>
        <p><b>Phasen:</b> ${[th.down ? 'Weiter: ' + th.down : '', th.up ? 'Zurück: ' + th.up : ''].filter(Boolean).join('<br>')}</p>
        <p><b>Tempo und Prognose:</b> Trend der Tageswerte der letzten 8 Wochen, linear fortgeschrieben. Abnehmen wird mit der Zeit meist langsamer.${fcs.length ? '<br>' + fcs.join('<br>') : ''}</p>
        <p><b>Diagramm:</b> Punkte sind Tageswerte, die Linie ist der 30-Tage-Ø${weightLines().length ? `, gestrichelt deine Marken ${weightLines().map(C.fmtW).join(' · ')} kg` : ''}.</p>
        <p><b>Körperfett:</b> Navy-Methode aus Hals- und Bauchumfang, einmal pro Quartal.</p>
        <p><b>Einträge löschen:</b> unter „Alle Einträge“.</p></div>
        <button class="btn block" data-act="closeSheet">Verstanden</button>`;
    },
    sport: ({ date }) => `<h3>Sport am ${dNum(date)}</h3>
      <button class="btn primary block" data-act="startTraining" data-arg="repeat:${date}">Letzte Einheit wiederholen</button>
      <button class="btn block" data-act="startTraining" data-arg="empty:${date}">Leer starten</button>
      <button class="btn block" data-act="newMove" data-arg="${date}">Bewegung eintragen</button>
      <button class="btn ghost block" data-act="closeSheet">Abbrechen</button>`,
    startTraining: () => SHEETS.sport({ date: today() }).replace(/<h3>.*<\/h3>/, '<h3>Einheit starten</h3>'),
    picker: ({ sid }) => {
      const s = S.sessions.find(x => x.id === sid);
      let out = `<h3>Übung hinzufügen</h3>`;
      for (const cat of catNames()) {
        const list = S.exercises.filter(e => e.cat === cat).sort((a, b) => a.name.localeCompare(b.name, 'de'));
        if (!list.length) continue;
        const paused = C.pauseFor(S, cat, s ? s.date : today());
        out += `<h2 style="margin:16px 0 4px">${cat}${paused ? ' <span class="badge pause">pausiert</span>' : ''}</h2>` +
          list.map(e => `<button class="pick" data-act="addItem" data-arg="${sid}:${e.id}"><span>${esc(e.name)}</span><span class="faint">+</span></button>`).join('');
      }
      return out + `<div style="height:12px"></div><button class="btn block" data-act="open" data-arg="exEdit::${sid}">Neue Übung anlegen</button><button class="btn ghost block" data-act="closeSheet">Schließen</button>`;
    }
  };

  // ---------- Aktionen ----------
  function findSet(arg) { const [sid, idx, si, k] = arg.split(':'); const s = S.sessions.find(x => x.id === sid); return { s, it: s && s.items[Number(idx)], si: Number(si), k }; }
  function toggleCheck(hid, day) {
    const h = S.habits.find(x => x.id === hid); if (!h || h.link === 'sport' || day > today() || day < h.start) return;
    S.checks[hid] = S.checks[hid] || {};
    if (S.checks[hid][day]) delete S.checks[hid][day]; else S.checks[hid][day] = 1;
    save(); render();
  }
  function cloneSets(sets) { return sets.map(x => ({ ...x })); }
  function newSession(mode, date) {
    const year = date.slice(0, 4);
    const s = { id: uid('s'), kind: 'training', date, num: C.nextNum(S, year), items: [], note: '', done: false, startedAt: C.nowLocal() };
    if (mode === 'repeat') {
      const prev = C.trainings(S).filter(x => x.date <= date).pop();
      if (prev) s.items = prev.items.map(i => { const l = C.lastItem(S, i.ex); return { ex: i.ex, sets: l ? cloneSets(l.item.sets) : [], note: '', done: false }; });
    }
    S.sessions.push(s); save(); push('session', { id: s.id });
  }
  function download(name, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const backupText = () => { S.lastBackup = C.nowLocal(); save(); return JSON.stringify({ ...S, exported: C.nowLocal() }); };
  const backupName = () => `dein-leben-backup-${today()}.json`;

  const ACTIONS = {
    tab: a => {
      const pg = document.getElementById('pager');
      ui.tab = a;
      if (ui.stack.length || !pg) { ui.stack = []; render(); return; }
      ui.jumping = true; clearTimeout(ui.jumpT); ui.jumpT = setTimeout(() => { ui.jumping = false; }, 700);
      syncTabbar();
      pg.scrollTo({ left: tabOrder().indexOf(a) * pg.clientWidth, behavior: 'smooth' });
    },
    goalYear: a => { ui.goalYear = a; render(); },
    saveGoal: a => {
      const [id, y] = a.split(':'); const lock = C.lockState(y, today());
      if (!lock.editable) return toast('Die Ziele sind gerade gesperrt.');
      const title = document.getElementById('gTitle').value.trim(); if (!title) return toast('Gib dem Ziel einen Titel.');
      const type = document.getElementById('gType').value;
      const reasonEl = document.getElementById('gReason'), reason = reasonEl ? reasonEl.value.trim() : '';
      if (lock.needsReason && reason.length < 10) return toast('Bitte begründe die Änderung in einem Satz.');
      let target;
      if (type === 'habit') { target = Math.round(C.num(document.getElementById('gTargetHabit').value) || 0); if (!document.getElementById('gHabit').value) return toast('Lege zuerst eine tägliche Gewohnheit an.'); }
      if (type === 'trainings') target = Math.round(C.num(document.getElementById('gTargetTr').value) || 0);
      if (type === 'weight') target = C.num(document.getElementById('gTargetW').value);
      if (!target || target <= 0 || (type === 'habit' && target > C.daysInYear(y)) || (type === 'weight' && (target < 30 || target > 300))) return toast('Prüfe den Zielwert.');
      if (!id && S.goals.filter(g => String(g.year) === y).length >= 3) return toast('Maximal drei Ziele pro Jahr.');
      const g = id ? S.goals.find(x => x.id === id) : { id: uid('g'), year: y, createdAt: C.nowLocal() };
      g.title = title; g.type = type; g.target = target; g.habitId = type === 'habit' ? document.getElementById('gHabit').value : null;
      if (!id) S.goals.push(g);
      logGoal(y, id ? 'edit' : 'add', title, reason);
      save(); pop(); toast('Ziel gespeichert');
    },
    deleteGoal: a => {
      const g = S.goals.find(x => x.id === a); const lock = C.lockState(g.year, today());
      if (!lock.editable) return toast('Die Ziele sind gerade gesperrt.');
      const reasonEl = document.getElementById('gReason'), reason = reasonEl ? reasonEl.value.trim() : '';
      if (lock.needsReason && reason.length < 10) return toast('Bitte begründe das Löschen im Feld „Begründung“.');
      if (!confirm('Ziel löschen?')) return;
      S.goals = S.goals.filter(x => x.id !== a); logGoal(g.year, 'delete', g.title, reason); save(); pop();
    },
    back: () => pop(),
    open: a => { const [n, ...rest] = a.split(':'); const v = rest.join(':');
      if (n === 'habit' || n === 'session' || n === 'move' || n === 'habitEdit') { ui.draftColor = null; push(n, { id: v || null }); }
      else if (n === 'goalEdit') { const [id, y] = v.split(':'); push('goalEdit', { id: id || null, year: y || null }); }
      else if (n === 'exEdit') { const [id, sid] = v.split(':'); push('exEdit', { id: id || null, sessionId: sid || null }); }
      else if (n === 'exStats') push('exStats', { id: v });
      else if (n === 'catEdit') { ui.draftColor = null; push('catEdit', { idx: v === '' ? null : Number(v) }); }
      else push(n); },
    dismiss: a => { S.notices.splice(Number(a), 1); save(); render(); },
    startEmpty: () => { S = C.emptyState(); save(); render(); },
    toggle: a => { const [h, d] = a.split(':'); toggleCheck(h, d); },
    sportSheet: a => openSheet({ name: 'sport', date: a.split(':')[1] }),
    sheet: a => { const [n, sid] = a.split(':'); openSheet({ name: n, sid }); },
    closeSheet: () => closeSheet(),
    cal: a => { const [h, m] = a.split(':'); if (m > today()) return; ui.cal[h] = m; render(); },
    year: a => { const [h, y] = a.split(':'); if (y > today().slice(0, 4)) return; ui.cal[h + 'y'] = y; render(); },
    color: a => { ui.draftColor = a; document.querySelectorAll('.swatch').forEach(b => b.setAttribute('aria-pressed', b.dataset.arg === a)); },
    saveHabit: a => {
      const name = document.getElementById('hName').value.trim(); if (!name) return toast('Gib der Gewohnheit einen Namen.');
      const h = a ? S.habits.find(x => x.id === a) : { id: uid('h'), link: null, archived: false };
      h.name = name; h.emoji = document.getElementById('hEmoji').value.trim() || '✓';
      h.start = document.getElementById('hStart').value || today(); h.color = ui.draftColor || h.color || COLORS[3];
      const t = document.getElementById('hType');
      const tIn = document.getElementById('hTarget');
      const newT = tIn ? Math.max(1, Math.min(7, Math.round(C.num(tIn.value) || 3))) : null;
      const wasWeekly = h.type === 'weekly';
      if (t) { const v = t.value; h.type = v === 'weekly' ? 'weekly' : 'daily'; h.kind = v === 'verzicht' ? 'verzicht' : undefined; }
      if (h.type === 'weekly' && newT) {
        const ws = C.weekStart(today()), from = document.getElementById('hTargetFrom');
        if (!a || !wasWeekly || (from && from.value === 'all')) { h.target = newT; h.targets = []; }
        else if (C.targetAt(h, ws) !== newT) { h.targets = (h.targets || []).filter(x => x.from < ws); h.targets.push({ from: ws, target: newT }); }
      } else if (h.type !== 'weekly') { h.target = 1; h.targets = []; }
      if (h.link === 'weightgoal') {
        const kg = C.num(document.getElementById('hGoalKg').value), dl = document.getElementById('hGoalDate').value;
        if (!kg || kg < 30 || kg > 300) return toast('Prüfe das Zielgewicht.');
        if (!dl) return toast('Gib einen Stichtag an.');
        h.goal = { kg, deadline: dl };
      }
      if (!a) S.habits.push(h);
      for (const n of C.checkGoals(S)) S.notices.push(n);
      save(); pop(); toast('Gespeichert');
    },
    archiveHabit: a => { const h = S.habits.find(x => x.id === a); h.archived = !h.archived; h.archivedOn = h.archived ? today() : undefined; save(); pop(); },
    deleteHabit: a => { if (!confirm('Gewohnheit samt Historie löschen?')) return; S.habits = S.habits.filter(x => x.id !== a); delete S.checks[a]; save(); pop(ui.stack.filter(x => x.id === a).length); },
    startTraining: a => { const [mode, date] = a.split(':'); newSession(mode, date || today()); },
    newMove: a => { const m = { id: uid('m'), kind: 'move', date: a || today(), activity: 'Spaziergang', min: 60, note: '', done: true }; S.sessions.push(m); save(); push('move', { id: m.id }); },
    finish: a => { const s = S.sessions.find(x => x.id === a); s.done = true; s.endedAt = C.nowLocal(); save(); pop(); toast(`Einheit ${s.num} gespeichert`); },
    deleteSession: a => { if (!confirm('Wirklich löschen?')) return; S.sessions = S.sessions.filter(x => x.id !== a); save(); pop(); },
    trainMore: () => { ui.trainMore = true; render(); },
    addItem: a => {
      const [sid, ex] = a.split(':'); const s = S.sessions.find(x => x.id === sid);
      const e = C.exById(S, ex); const l = C.lastItem(S, ex, sid);
      s.items.push({ ex, sets: l ? cloneSets(l.item.sets) : (e.type === 'done' ? [] : [{}]), note: '', done: false });
      save(); closeSheet(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 150);
    },
    addSet: a => { const [sid, idx] = a.split(':'); const it = S.sessions.find(x => x.id === sid).items[Number(idx)]; it.sets.push(it.sets.length ? { ...it.sets[it.sets.length - 1] } : {}); save(); render(); },
    delSet: a => { const { it, si } = findSet(a + ':x'); it.sets.splice(si, 1); save(); render(); },
    delItem: a => { const [sid, idx] = a.split(':'); if (!confirm('Übung aus dieser Einheit entfernen?')) return; S.sessions.find(x => x.id === sid).items.splice(Number(idx), 1); save(); render(); },
    moveItem: a => { const [sid, idx, dir] = a.split(':'); const it = S.sessions.find(x => x.id === sid).items; const i = Number(idx), j = i + Number(dir); if (j < 0 || j >= it.length) return; [it[i], it[j]] = [it[j], it[i]]; save(); render(); },
    saveEx: a => {
      const [id, sid] = a.split(':'); const name = document.getElementById('eName').value.trim(); if (!name) return toast('Gib der Übung einen Namen.');
      const e = id ? C.exById(S, id) : { id: uid('e') };
      e.name = name; e.cat = document.getElementById('eCat').value; e.type = document.getElementById('eType').value; e.uni = document.getElementById('eUni').checked;
      if (!id) S.exercises.push(e);
      if (sid) { const s = S.sessions.find(x => x.id === sid); s.items.push({ ex: e.id, sets: e.type === 'done' ? [] : [{}], note: '', done: false }); }
      save(); pop(); toast('Gespeichert');
    },
    deleteEx: a => { if (!confirm('Übung löschen?')) return; S.exercises = S.exercises.filter(x => x.id !== a); save(); pop(); },
    endPause: a => { const p = S.pauses.find(x => x.id === a); p.to = C.addDays(today(), -1) < p.from ? today() : C.addDays(today(), -1); save(); render(); toast(`${p.cat}übungen wieder aktiv`); },
    addPause: () => { const cat = document.getElementById('pCat').value; if (C.pauseFor(S, cat)) return toast(`${cat} ist schon pausiert.`); S.pauses.push({ id: uid('p'), cat, from: today(), to: null }); save(); render(); },
    quickWeight: () => addWeight(document.getElementById('quickKg').value, C.nowLocal()),
    addWeight: () => { const w = document.getElementById('wWhen'); addWeight(document.getElementById('wKg').value, w && !w.hidden && w.value ? w.value : C.nowLocal()); },
    toggleWhen: () => { const w = document.getElementById('wWhen'); if (w) w.hidden = !w.hidden; },
    theme: a => { S.settings.theme = a; save(); render(); },
    accent: a => { if (!ACCENTS[a]) return; S.settings.accent = a; save(); render(); },
    moveTab: a => {
      const [i, dir] = a.split(':').map(Number), o = [...tabOrderAll()], j = i + dir;
      if (j < 0 || j >= o.length) return;
      [o[i], o[j]] = [o[j], o[i]]; S.settings.tabOrder = o; save(); render();
    },
    resetTabs: () => { delete S.settings.tabOrder; delete S.settings.tabHidden; save(); render(); },
    setting: a => {
      const i = a.indexOf(':'), k = a.slice(0, i); let v = a.slice(i + 1);
      if (k === 'backupDays') v = Number(v);
      if (!SETTABLE[k] || !SETTABLE[k].includes(v)) return;
      S.settings[k] = v; if (k === 'weightRange') ui.range = null; save(); render();
    },
    moveHabit: a => {
      const [i, dir] = a.split(':').map(Number), ids = activeHabits().map(h => h.id), j = i + dir;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]]; S.settings.habitOrder = ids; save(); render();
    },
    saveCat: a => {
      const name = document.getElementById('cName').value.trim(); if (!name) return toast('Gib der Kategorie einen Namen.');
      const list = cats(), i = a === '' ? -1 : Number(a);
      if (list.some((c, k) => k !== i && c.name.toLowerCase() === name.toLowerCase())) return toast('Diese Kategorie gibt es schon.');
      const color = ui.draftColor || CAT_COLORS[7];
      if (i < 0) list.push({ name, color });
      else {
        const old = list[i].name; list[i] = { name, color };
        if (old !== name) { S.exercises.forEach(e => { if (e.cat === old) e.cat = name; }); S.pauses.forEach(p => { if (p.cat === old) p.cat = name; }); }
      }
      S.settings.cats = list; save(); pop(); toast('Gespeichert');
    },
    deleteCat: a => {
      const list = cats(), i = Number(a), c = list[i]; if (!c) return;
      if (S.exercises.some(e => e.cat === c.name)) return toast('Zu dieser Kategorie gehören noch Übungen.');
      if (!confirm(`Kategorie „${c.name}“ löschen?`)) return;
      list.splice(i, 1); S.settings.cats = list; save(); pop();
    },
    moveCat: a => {
      const [i, dir] = a.split(':').map(Number), list = cats(), j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]]; S.settings.cats = list; save(); render();
    },
    delWeight: a => { const i = a.lastIndexOf(':'); const t = a.slice(0, i), kg = Number(a.slice(i + 1)); if (!confirm(`Eintrag ${C.fmt(kg)} kg vom ${dNum(t)} löschen?`)) return; const k = S.weights.findIndex(w => w.t === t && w.kg === kg); if (k >= 0) S.weights.splice(k, 1); save(); render(); },
    range: a => { ui.range = a; render(); },
    metric: a => { const i = a.indexOf(':'); ui.metric[a.slice(0, i)] = a.slice(i + 1); render(); },
    saveMeasure: () => {
      const hEl = document.getElementById('mH'); if (hEl) { const hv = C.num(hEl.value); if (!hv) return toast('Gib deine Körpergröße an.'); S.settings.heightCm = hv; }
      const neck = C.num(document.getElementById('mNeck').value), waist = C.num(document.getElementById('mWaist').value);
      const fat = C.navyFat(S.settings.heightCm, neck, waist); if (fat === null) return toast('Prüfe die Umfänge: Bauch muss größer als Hals sein.');
      S.measurements.push({ t: (document.getElementById('mDate').value || today()) + 'T12:00', neck, waist, fat: Math.round(fat * 10) / 10 });
      save(); render(); toast(`Körperfett ${C.fmt(fat)} % gespeichert`);
    },
    delMeasure: a => { if (!confirm('Messung löschen?')) return; S.measurements = S.measurements.filter(m => m.t !== a); save(); render(); },
    backup: () => { download(backupName(), backupText()); toast('Backup gespeichert (Ordner Downloads)'); render(); },
    shareBackup: async () => {
      const file = new File([backupText()], backupName(), { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Dein Leben Backup' }); } catch (e) { /* abgebrochen */ } }
      else toast('Teilen wird hier nicht unterstützt. Nutze „Backup speichern“.');
      render();
    }
  };
  function addWeight(v, when) {
    const kg = C.num(v); if (kg === null || kg < 30 || kg > 300) return toast('Gib dein Gewicht in kg an, z. B. 111,2.');
    const before = C.weightStatus(S.weights).phase;
    S.weights.push({ t: when, kg, src: 'app', note: '' });
    const after = C.weightStatus(S.weights).phase;
    for (const n of C.checkGoals(S)) S.notices.push(n);
    if (after !== before) S.notices.push(`Neue Phase: ${C.PHASES[after].label}, ab jetzt ${C.PHASES[after].rhythm}.`);
    save(); render(); toast(`${C.fmt(kg)} kg gespeichert`);
  }

  // Eingaben ohne Neuaufbau (Fokus bleibt)
  const INPUTS = {
    set: (el, a) => {
      const { s, it, si, k } = findSet(a); if (!it) return;
      let v = k === 'incl' ? (el.value.trim() || null) : C.num(el.value);
      const ex = C.exById(S, it.ex);
      if (ex && ex.type === 'assist' && k === 'w' && v !== null) v = -Math.abs(v);
      it.sets[si][k] = v; saveSoon();
    },
    itemNote: (el, a) => { const [sid, idx] = a.split(':'); S.sessions.find(x => x.id === sid).items[Number(idx)].note = el.value; saveSoon(); },
    sessNote: (el, a) => { S.sessions.find(x => x.id === a).note = el.value; saveSoon(); },
    moveField: (el, a) => { const [id, k] = a.split(':'); const m = S.sessions.find(x => x.id === id); m[k] = k === 'min' ? (C.num(el.value) || 0) : el.value; saveSoon(); },
    navyPreview: () => {
      const h = S.settings.heightCm || C.num((document.getElementById('mH') || {}).value);
      const f = C.navyFat(h, C.num(document.getElementById('mNeck').value), C.num(document.getElementById('mWaist').value));
      document.getElementById('navyOut').textContent = f === null ? '– %' : `${C.fmt(f)} %`;
    }
  };
  const CHANGES = {
    restore: el => {
      const f = el.files && el.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = C.validate(JSON.parse(r.result));
          if (S && !confirm('Alle Daten in der App werden durch diese Datei ersetzt. Fortfahren?')) return;
          S = data; S.notices = S.notices || []; for (const n of C.checkGoals(S)) S.notices.push(n);
          save(); ui.tab = tabOrder()[0]; if (ui.stack.length) pop(ui.stack.length); else render(); toast('Daten geladen');
        } catch (e) { toast(e.message || 'Die Datei konnte nicht gelesen werden.'); }
      };
      r.readAsText(f);
    },
    sessDate: (el, a) => { const s = S.sessions.find(x => x.id === a); if (!el.value) return; const y = el.value.slice(0, 4); if (y !== s.date.slice(0, 4)) s.num = C.nextNum(S, y); s.date = el.value; save(); render(); },
    moveField: (el, a) => INPUTS.moveField(el, a),
    itemDone: (el, a) => { const [sid, idx] = a.split(':'); S.sessions.find(x => x.id === sid).items[Number(idx)].done = el.checked; save(); },
    goalType: el => { document.querySelectorAll('[data-gtype]').forEach(x => { x.hidden = x.dataset.gtype !== el.value; }); },
    ringToggle: (el, a) => { const ex = setting('ringExclude', []).filter(x => x !== a); if (!el.checked) ex.push(a); S.settings.ringExclude = ex; save(); },
    tabShow: (el, a) => {
      const h = tabHidden().filter(x => x !== a); if (!el.checked) h.push(a);
      S.settings.tabHidden = h; if (h.includes(ui.tab)) ui.tab = tabOrder()[0]; save(); render();
    },
    weightLines: el => {
      const v = el.value.split(/[\s;]+/).map(x => C.num(x.replace(/,+$/, ''))).filter(x => x !== null && x >= 30 && x <= 300);
      S.settings.weightLines = [...new Set(v)].sort((x, y) => y - x).slice(0, 6); save(); render();
      toast(S.settings.weightLines.length ? `Markierungen: ${S.settings.weightLines.map(C.fmtW).join(' · ')} kg` : 'Keine Markierungen');
    },
    height: el => { const v = C.num(el.value); S.settings.heightCm = v; save(); toast(v ? `Körpergröße ${C.fmt(v, 0)} cm` : 'Körpergröße entfernt'); }
  };

  // Automatisches Backup beim ersten Tippen (Downloads brauchen eine Nutzeraktion)
  const backupDue = () => S && (!S.lastBackup || C.diffDays(S.lastBackup.slice(0, 10), today()) >= backupDays());
  document.addEventListener('click', e => { if (backupDue() && !e.target.closest('[data-act=backup],[data-act=shareBackup]')) { download(backupName(), backupText()); toast('Automatisches Backup gespeichert (Downloads)'); } }, true);
  // Aktive Seite aus der Scrollposition ableiten (ohne Neuaufbau)
  document.addEventListener('scroll', e => {
    const pg = e.target; if (!pg || pg.id !== 'pager' || ui.jumping) return;
    const k = tabOrder()[Math.round(pg.scrollLeft / pg.clientWidth)];
    if (k && k !== ui.tab) { ui.tab = k; syncTabbar(); }
  }, true);
  document.addEventListener('scrollend', e => { if (e.target && e.target.id === 'pager') { ui.jumping = false; } }, true);
  window.addEventListener('resize', () => { const pg = document.getElementById('pager'); if (pg && !ui.jumping) pg.scrollLeft = tabOrder().indexOf(ui.tab) * pg.clientWidth; });

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.dataset.act === 'closeSheet' && e.target.closest('[data-stop]') && el.classList.contains('scrim')) return;
    if (el.disabled) return;
    const fn = ACTIONS[el.dataset.act]; if (fn) { e.preventDefault(); fn(el.dataset.arg); }
  });
  document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INPUTS[el.dataset.input]) INPUTS[el.dataset.input](el, el.dataset.arg); });
  document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el, el.dataset.arg); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { clearTimeout(saveTimer); if (S) save(); } else if (S && !document.activeElement.matches('input,textarea')) render(); });
  window.addEventListener('popstate', e => {
    const st = e.state || { depth: 0, sheet: false };
    if (!st.sheet) ui.sheet = null;
    ui.stack = ui.stack.slice(0, st.depth);
    render();
  });
  history.replaceState({ depth: 0, sheet: false }, '');

  // Start
  if (S) { const n = C.checkGoals(S); if (n.length) { S.notices.push(...n); save(); } }
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) location.reload(); });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
