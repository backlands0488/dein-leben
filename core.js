/* Dein Leben – Kernlogik ohne DOM, testbar in Node */
(function (root) {
  'use strict';

  // ---------- Datum ----------
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDay = s => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
  const weekStart = s => { const d = parseDay(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); };
  const monthStart = s => s.slice(0, 8) + '01';
  const yearStart = s => s.slice(0, 4) + '-01-01';
  const quarterStart = s => { const m = Number(s.slice(5, 7)); const q = Math.floor((m - 1) / 3) * 3 + 1; return `${s.slice(0, 4)}-${pad(q)}-01`; };
  const monthEnd = s => { const d = parseDay(monthStart(s)); d.setMonth(d.getMonth() + 1); d.setDate(0); return iso(d); };
  const yearEnd = s => s.slice(0, 4) + '-12-31';
  const todayStr = () => iso(new Date());
  const nowLocal = () => { const d = new Date(); return `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  function* dayRange(a, b) { let d = a; while (d <= b) { yield d; d = addDays(d, 1); } }

  // ---------- Zahlen ----------
  const num = v => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().replace(',', '.');
    if (s === '' || !/^-?\d*\.?\d+$/.test(s)) return null;
    return Number(s);
  };
  const fmt = (n, d = 1) => n === null || n === undefined || Number.isNaN(n) ? '–'
    : n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtW = n => n === null || n === undefined ? '?' : (Number.isInteger(n) ? String(n) : n.toLocaleString('de-DE', { maximumFractionDigits: 2 }));

  // ---------- Leerer Zustand ----------
  const DEFAULT_EXERCISES = [
    ['laufband', 'Laufband', 'Ausdauer', 'cardio', false],
    ['seil', 'Seilspringen', 'Ausdauer', 'cardio', false],
    ['treppe', 'Treppensteiger', 'Ausdauer', 'cardio', false],
    ['schlitten', 'Gewichtsschlitten', 'Ausdauer', 'sled', false],
  ];
  function emptyState() {
    return {
      app: 'dein-leben', version: 1, settings: { heightCm: null }, habits: [], checks: {}, weights: [],
      measurements: [], exercises: DEFAULT_EXERCISES.map(([id, name, cat, type, uni]) => ({ id, name, cat, type, uni })),
      sessions: [], pauses: [], lastBackup: null, notices: []
    };
  }
  function validate(s) {
    if (!s || s.app !== 'dein-leben') throw new Error('Das ist keine Sicherung von „Dein Leben“.');
    for (const k of ['habits', 'weights', 'exercises', 'sessions']) if (!Array.isArray(s[k])) throw new Error(`Die Datei ist unvollständig (${k} fehlt).`);
    s.checks = s.checks || {}; s.measurements = s.measurements || []; s.pauses = s.pauses || [];
    s.settings = s.settings || {}; s.notices = s.notices || [];
    return s;
  }

  // ---------- Gewicht und Phasen ----------
  const PHASES = {
    1: { label: 'Phase 1', rhythm: 'täglich wiegen' },
    2: { label: 'Phase 2', rhythm: 'wöchentlich wiegen' },
    3: { label: 'Phase 3', rhythm: 'monatlich wiegen' }
  };
  const T = { p1to2: 99.0, p2to3: 88.0, p2to1: 100.0, p3to2: 89.0 };

  // erste Messung je Tag
  function dailyFirst(weights) {
    const byDay = new Map();
    for (const w of [...weights].sort((a, b) => a.t.localeCompare(b.t))) {
      const d = w.t.slice(0, 10);
      if (!byDay.has(d)) byDay.set(d, w.kg);
    }
    return [...byDay.entries()].map(([d, kg]) => ({ d, kg })).sort((a, b) => a.d.localeCompare(b.d));
  }
  // 30-Tage-Durchschnitt; leeres Fenster -> letzte Messung davor
  function avg30(daily, day) {
    const from = addDays(day, -29);
    let sum = 0, n = 0, last = null;
    for (const x of daily) {
      if (x.d > day) break;
      last = x.kg;
      if (x.d >= from) { sum += x.kg; n++; }
    }
    return n ? sum / n : last;
  }
  function step(phase, a) {
    if (a === null) return phase;
    for (let i = 0; i < 3; i++) {
      const before = phase;
      if (phase === 1 && a <= T.p1to2) phase = 2;
      else if (phase === 2 && a <= T.p2to3) phase = 3;
      else if (phase === 2 && a > T.p2to1) phase = 1;
      else if (phase === 3 && a > T.p3to2) phase = 2;
      if (phase === before) break;
    }
    return phase;
  }
  function weightStatus(weights, today = todayStr()) {
    const daily = dailyFirst(weights);
    if (!daily.length) return { phase: 1, avg: null, daily, switches: [], due: true, lastDay: null };
    let phase = 1; const switches = [];
    // Fenster gleitend über alle Tage
    let i0 = 0, i1 = 0, sum = 0, last = null;
    for (const d of dayRange(daily[0].d, today)) {
      while (i1 < daily.length && daily[i1].d <= d) { sum += daily[i1].kg; last = daily[i1].kg; i1++; }
      const from = addDays(d, -29);
      while (i0 < i1 && daily[i0].d < from) { sum -= daily[i0].kg; i0++; }
      const n = i1 - i0; const a = n ? sum / n : last;
      const p = step(phase, a);
      if (p !== phase) { switches.push({ d, from: phase, to: p, avg: a }); phase = p; }
    }
    const avg = avg30(daily, today);
    const lastDay = daily[daily.length - 1].d;
    const since = phase === 1 ? today : phase === 2 ? weekStart(today) : monthStart(today);
    const due = lastDay < since;
    return { phase, avg, daily, switches, due, lastDay, since };
  }
  function thresholds(phase) {
    if (phase === 1) return { down: `≤ ${fmt(T.p1to2)} kg → Phase 2`, up: null };
    if (phase === 2) return { down: `≤ ${fmt(T.p2to3)} kg → Phase 3`, up: `> ${fmt(T.p2to1)} kg → Phase 1` };
    return { down: null, up: `> ${fmt(T.p3to2)} kg → Phase 2` };
  }
  const navyFat = (height, neck, waist) => {
    if (!height || !neck || !waist || waist <= neck) return null;
    return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
  };
  const measurementDue = (ms, today = todayStr()) => !ms.some(m => m.t.slice(0, 10) >= quarterStart(today));

  // ---------- Gewohnheiten ----------
  function sportDays(state, from) {
    const set = new Set();
    for (const s of state.sessions) {
      if (s.date < from) continue;
      if (s.kind === 'training' && (s.done || (s.items && s.items.length))) set.add(s.date);
      if (s.kind === 'move' && (s.min || 0) >= 60) set.add(s.date);
    }
    return set;
  }
  function checkedDays(state, h) {
    if (h.link === 'sport') return sportDays(state, h.start);
    return new Set(Object.keys(state.checks[h.id] || {}).filter(d => d >= h.start));
  }
  function streaksDaily(days, start, today) {
    let best = 0, run = 0;
    for (const d of dayRange(start, today)) { if (days.has(d)) { run++; best = Math.max(best, run); } else run = 0; }
    let cur = 0; let d = days.has(today) ? today : addDays(today, -1);
    while (d >= start && days.has(d)) { cur++; d = addDays(d, -1); }
    return { cur, best };
  }
  function weekCount(days, ws) { let n = 0; for (let i = 0; i < 7; i++) if (days.has(addDays(ws, i))) n++; return n; }
  // Wochenziel kann sich ändern: gilt jeweils ab einer bestimmten Woche
  function targetAt(h, ws) {
    const list = (h.targets || []).filter(x => x.from <= ws).sort((a, b) => a.from.localeCompare(b.from));
    return list.length ? list[list.length - 1].target : h.target;
  }
  function streaksWeekly(days, start, today, tgt) {
    const w0 = weekStart(start), wNow = weekStart(today);
    let best = 0, run = 0;
    for (let w = w0; w <= wNow; w = addDays(w, 7)) {
      if (weekCount(days, w) >= tgt(w)) { run++; best = Math.max(best, run); } else if (w !== wNow) run = 0;
    }
    let cur = 0; let w = weekCount(days, wNow) >= tgt(wNow) ? wNow : addDays(wNow, -7);
    while (w >= w0 && weekCount(days, w) >= tgt(w)) { cur++; w = addDays(w, -7); }
    return { cur, best };
  }
  function quotaDaily(days, start, a, b, today) {
    const from = a > start ? a : start, to = b < today ? b : today;
    if (from > to) return null;
    let n = 0, t = 0; for (const d of dayRange(from, to)) { t++; if (days.has(d)) n++; }
    return { n, t, pct: n / t };
  }
  function quotaWeekly(days, start, a, b, today, tgt) {
    // Wochen, die im Zeitraum beginnen; laufende Woche zählt nur, wenn schon erreicht
    let n = 0, t = 0; const wNow = weekStart(today);
    for (let w = weekStart(a < start ? start : a); w <= b && w <= wNow; w = addDays(w, 7)) {
      if (w < a) continue;
      const ok = weekCount(days, w) >= tgt(w);
      if (w === wNow && !ok) continue;
      t++; if (ok) n++;
    }
    return t ? { n, t, pct: n / t } : null;
  }
  function habitStats(state, h, today = todayStr()) {
    const days = checkedDays(state, h);
    const end = h.archived && h.archivedOn && h.archivedOn < today ? h.archivedOn : today;
    const total = [...days].filter(d => d <= end).length;
    if (h.type === 'weekly') {
      const tgt = w => targetAt(h, w);
      const st = streaksWeekly(days, h.start, end, tgt);
      return {
        days, total, unit: 'Wochen', ...st,
        week: { n: weekCount(days, weekStart(end)), t: tgt(weekStart(end)) },
        month: quotaWeekly(days, h.start, monthStart(end), monthEnd(end), end, tgt),
        year: quotaWeekly(days, h.start, yearStart(end), yearEnd(end), end, tgt)
      };
    }
    const st = streaksDaily(days, h.start, end);
    return {
      days, total, unit: 'Tage', ...st,
      week: quotaDaily(days, h.start, weekStart(end), addDays(weekStart(end), 6), end),
      month: quotaDaily(days, h.start, monthStart(end), monthEnd(end), end),
      year: quotaDaily(days, h.start, yearStart(end), yearEnd(end), end)
    };
  }
  // Gewichtsziel: erreicht oder abgelaufen -> archivieren
  function checkGoals(state, today = todayStr()) {
    const out = [];
    const ws = weightStatus(state.weights, today);
    for (const h of state.habits) {
      if (h.archived || h.link !== 'weightgoal' || !h.goal) continue;
      if (ws.avg !== null && ws.avg <= h.goal.kg) {
        h.archived = true; h.archivedOn = today; h.result = 'erreicht';
        out.push(`Ziel erreicht: Dein 30-Tage-Durchschnitt liegt bei ${fmt(ws.avg)} kg. „${h.name}“ ist jetzt archiviert.`);
      } else if (today > h.goal.deadline) {
        h.archived = true; h.archivedOn = h.goal.deadline; h.result = 'abgelaufen';
        out.push(`Der Stichtag für „${h.name}“ ist vorbei. Die Gewohnheit ist archiviert, ihre Historie bleibt erhalten.`);
      }
    }
    return out;
  }

  // ---------- Training ----------
  const TYPES = {
    weight: 'Gewicht × Wdh.', assist: 'Gegengewicht × Wdh.', reps: 'Nur Wiederholungen',
    time: 'Sätze × Zeit', cardio: 'Dauer, Tempo, Steigung', sled: 'Gewicht × Strecke', done: 'Nur erledigt'
  };
  const CATS = ['Druck', 'Zug', 'Beine', 'Rumpf', 'Ausdauer', 'Reha'];
  const exById = (state, id) => state.exercises.find(e => e.id === id);
  function nextNum(state, year) {
    const ns = state.sessions.filter(s => s.kind === 'training' && s.date.startsWith(year)).map(s => s.num || 0);
    return (ns.length ? Math.max(...ns) : 0) + 1;
  }
  function trainings(state) {
    return state.sessions.filter(s => s.kind === 'training').sort((a, b) => (a.date + pad(a.num || 0)).localeCompare(b.date + pad(b.num || 0)));
  }
  function lastItem(state, exId, excludeId) {
    const ts = trainings(state).filter(s => s.id !== excludeId).reverse();
    for (const s of ts) { const it = s.items.find(i => i.ex === exId && (i.sets.length || i.done)); if (it) return { session: s, item: it }; }
    return null;
  }
  function pauseFor(state, cat, day = todayStr()) {
    return state.pauses.find(p => p.cat === cat && p.from <= day && (!p.to || p.to >= day)) || null;
  }
  // Sätze zusammenfassen: 2x8, 8/7/6 …
  function setSummary(ex, sets) {
    if (!ex) return '';
    if (ex.type === 'done') return 'erledigt';
    if (!sets.length) return '';
    if (ex.type === 'cardio') return sets.map(s => [s.min ? `${fmtW(s.min)} Min.` : '', s.kmh ? `${fmtW(s.kmh)} km/h` : '', s.incl ? `Steigung ${s.incl}` : '', s.km ? `${fmtW(s.km)} km` : ''].filter(Boolean).join(', ')).join(' + ');
    if (ex.type === 'time') return groupRuns(sets.map(s => s.s)).map(([v, n]) => `${n}× ${v >= 60 && v % 60 === 0 ? v / 60 + ' Min.' : v + ' Sek.'}`).join(', ');
    if (ex.type === 'sled') return sets.map(s => `${fmtW(s.w)} kg × ${fmtW(s.m)} m`).join(', ');
    if (ex.type === 'reps') return repsText(sets.map(s => s.r));
    // weight/assist: nach Gewicht gruppieren
    const groups = [];
    for (const s of sets) { const g = groups[groups.length - 1]; if (g && g.w === s.w) g.r.push(s.r); else groups.push({ w: s.w, r: [s.r] }); }
    return groups.map(g => `${g.w === null || g.w === undefined ? '? kg' : (ex.type === 'assist' && g.w === 0 ? 'ohne' : fmtW(g.w) + ' kg')} · ${repsText(g.r)}`).join('; ');
  }
  function groupRuns(arr) { const out = []; for (const v of arr) { const g = out[out.length - 1]; if (g && g[0] === v) g[1]++; else out.push([v, 1]); } return out; }
  function repsText(r) { r = r.filter(x => x !== null && x !== undefined); if (!r.length) return ''; return r.every(x => x === r[0]) ? `${r.length}×${r[0]}` : r.join('/'); }

  const api = {
    pad, iso, parseDay, addDays, diffDays, weekStart, monthStart, monthEnd, yearStart, quarterStart, todayStr, nowLocal, dayRange,
    num, fmt, fmtW, emptyState, validate, PHASES, T, dailyFirst, avg30, weightStatus, thresholds, navyFat, measurementDue,
    checkedDays, habitStats, targetAt, checkGoals, weekCount, TYPES, CATS, exById, nextNum, trainings, lastItem, pauseFor, setSummary
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
