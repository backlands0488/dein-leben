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
    s.goals = s.goals || []; s.goalLog = s.goalLog || [];
    migrateKfa(s);
    return s;
  }
  // Alte KFA-Werte (selbst nach Navy gemessen) ab 06.05.2026 als Messungen übernehmen, nur echte Änderungen
  function migrateKfa(s) {
    if (s.settings.kfaMigrated) return;
    let last = null;
    for (const w of [...s.weights].filter(w => w.src === 'alt' && w.fat).sort((a, b) => a.t.localeCompare(b.t))) {
      if (w.t.slice(0, 10) < '2026-05-06') { last = w.fat; continue; }
      if (w.fat !== last && !s.measurements.some(m => m.t.slice(0, 10) === w.t.slice(0, 10)))
        s.measurements.push({ t: w.t.slice(0, 10) + 'T12:00', neck: null, waist: null, fat: w.fat, src: 'alt' });
      last = w.fat;
    }
    s.settings.kfaMigrated = true;
  }

  // ---------- Gewicht und Phasen ----------
  const PHASES = {
    1: { label: 'Phase 1', rhythm: 'täglich wiegen' },
    3: { label: 'Phase 2', rhythm: 'monatlich wiegen' }
  };
  // Täglich, bis der 30-Tage-Ø ≤ 88 kg ist; dann monatlich.
  // Erste Messung eines Tages über 89,9 kg in der Monatsphase -> wieder täglich (Rückfall).
  // Nach einem Rückfall frühestens nach 14 Wiegetagen zurück auf monatlich, wenn der 30-Tage-Ø ≤ 88 kg ist.
  // Interne Codes: 1 = täglich, 3 = monatlich
  const T = { p1to3: 88.0, relapse: 89.9, relapseDays: 14 };

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
    if (a !== null && phase === 1 && a <= T.p1to3) return 3;
    return phase;
  }
  function weightStatus(weights, today = todayStr()) {
    const daily = dailyFirst(weights);
    if (!daily.length) return { phase: 1, avg: null, daily, switches: [], due: true, lastDay: null };
    let phase = 1, relapse = null; const switches = [];
    const first = new Map(daily.map(x => [x.d, x.kg]));
    // Fenster gleitend über alle Tage
    let i0 = 0, i1 = 0, sum = 0, last = null;
    for (const d of dayRange(daily[0].d, today)) {
      while (i1 < daily.length && daily[i1].d <= d) { sum += daily[i1].kg; last = daily[i1].kg; i1++; }
      const from = addDays(d, -29);
      while (i0 < i1 && daily[i0].d < from) { sum -= daily[i0].kg; i0++; }
      const n = i1 - i0; const a = n ? sum / n : last;
      let p = phase;
      if (phase === 3 && first.has(d) && first.get(d) > T.relapse) { p = 1; relapse = { d, n: 1 }; }
      else if (phase === 1) {
        if (relapse && first.has(d) && d !== relapse.d) relapse.n++;
        if ((!relapse || relapse.n >= T.relapseDays) && step(phase, a) === 3) { p = 3; relapse = null; }
      }
      if (p !== phase) { switches.push({ d, from: phase, to: p, avg: a }); phase = p; }
    }
    const avg = avg30(daily, today);
    const lastDay = daily[daily.length - 1].d;
    const since = phase === 1 ? today : monthStart(today);
    const due = lastDay < since;
    return { phase, avg, daily, switches, due, lastDay, since, relapse };
  }
  function thresholds(phase, ws) {
    if (phase === 1 && ws && ws.relapse) {
      const left = Math.max(0, T.relapseDays - ws.relapse.n);
      return { down: left ? `Rückfallphase seit ${ws.relapse.d.split('-').reverse().join('.')}: noch ${left} Wiegetage, danach 30-Tage-Ø ≤ ${fmt(T.p1to3)} kg → Phase 2 (monatlich)` : `30-Tage-Ø ≤ ${fmt(T.p1to3)} kg → Phase 2 (monatlich)`, up: null };
    }
    if (phase === 1) return { down: `30-Tage-Ø ≤ ${fmt(T.p1to3)} kg → Phase 2 (monatlich)`, up: null };
    return { down: null, up: `erste Messung eines Tages über ${fmt(T.relapse)} kg → Phase 1 (täglich, mindestens ${T.relapseDays} Wiegetage)` };
  }
  // Tempo: lineare Regression der Tageswerte der letzten 8 Wochen, in kg pro Woche
  function tempo(daily, today = todayStr(), days = 56) {
    const from = addDays(today, -days + 1);
    const pts = daily.filter(x => x.d >= from && x.d <= today).map(x => [diffDays(from, x.d), x.kg]);
    if (pts.length < 4 || pts[pts.length - 1][0] - pts[0][0] < 14) return null;
    const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    let sxy = 0, sxx = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
    return sxx ? (sxy / sxx) * 7 : null;
  }
  // Prognose: ab heutigem 30-Tage-Ø mit aktuellem Tempo bis Zielgewicht
  function forecast(avg, kgPerWeek, target, today = todayStr()) {
    if (avg === null || kgPerWeek === null || avg <= target) return null;
    if (kgPerWeek >= -0.01) return { none: true };
    const weeks = (avg - target) / -kgPerWeek;
    if (weeks > 520) return { none: true };
    return { date: addDays(today, Math.round(weeks * 7)), weeks };
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

  // ---------- Jahresziele ----------
  const daysInYear = y => diffDays(`${y}-01-01`, `${y}-12-31`) + 1;
  // Bis 31.12. des Vorjahres frei; 24.–30.06. Fenster mit Begründung; sonst gesperrt
  function lockState(year, today = todayStr()) {
    const y = String(year);
    if (today < `${y}-01-01`) return { editable: true, needsReason: false, until: `${Number(y) - 1}-12-31`, label: `Änderbar bis 31.12.${Number(y) - 1}` };
    if (today >= `${y}-06-24` && today <= `${y}-06-30`) return { editable: true, needsReason: true, until: `${y}-06-30`, label: `Halbjahresfenster: änderbar bis 30.06.${y}, mit Begründung` };
    if (today < `${y}-06-24`) return { editable: false, next: `${y}-06-24`, label: `Gesperrt bis 24.06.${y}` };
    return { editable: false, next: null, label: `Gesperrt bis Jahresende` };
  }
  function goalProgress(state, g, today = todayStr()) {
    const y = String(g.year), start = `${y}-01-01`, end = `${y}-12-31`;
    const started = today >= start, endDay = today < end ? today : end;
    const elapsed = started ? diffDays(start, endDay) + 1 : 0, total = daysInYear(y);
    if (g.type === 'habit') {
      const h = state.habits.find(x => x.id === g.habitId);
      if (!h) return { started, missing: true };
      const days = checkedDays(state, h); let n = 0;
      if (started) for (const d of dayRange(start, endDay)) if (days.has(d)) n++;
      const st = habitStats(state, h, today);
      return { started, value: n, target: g.target, soll: elapsed, streak: st.cur, done: n >= g.target };
    }
    if (g.type === 'trainings') {
      const n = state.sessions.filter(s => s.kind === 'training' && s.date >= start && s.date <= endDay && (s.done || (s.items && s.items.length))).length;
      const soll = g.target * elapsed / total;
      return { started, value: n, target: g.target, soll, done: n >= g.target };
    }
    if (g.type === 'weight') {
      const ws = weightStatus(state.weights, today);
      const startAvg = started ? avg30(ws.daily, addDays(start, -1)) : null;
      const soll = startAvg !== null ? startAvg + (g.target - startAvg) * elapsed / total : null;
      const tp = tempo(ws.daily, today);
      return { started, value: ws.avg, target: g.target, soll, startAvg, tempo: tp, fc: forecast(ws.avg, tp, g.target, today), done: today >= end && ws.avg !== null && avg30(ws.daily, end) <= g.target };
    }
    return { started };
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
    checkedDays, habitStats, targetAt, tempo, forecast, lockState, goalProgress, daysInYear, checkGoals, weekCount, TYPES, CATS, exById, nextNum, trainings, lastItem, pauseFor, setSummary
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
