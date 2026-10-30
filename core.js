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
      sessions: [], pauses: [], vacations: [], templates: [], lastBackup: null, notices: []
    };
  }
  function validate(s) {
    if (!s || s.app !== 'dein-leben') throw new Error('Das ist keine Sicherung von „Dein Leben“.');
    for (const k of ['habits', 'weights', 'exercises', 'sessions']) if (!Array.isArray(s[k])) throw new Error(`Die Datei ist unvollständig (${k} fehlt).`);
    s.checks = s.checks || {}; s.measurements = s.measurements || []; s.pauses = s.pauses || [];
    s.settings = s.settings || {}; s.notices = s.notices || [];
    s.goals = s.goals || []; s.goalLog = s.goalLog || []; s.vacations = s.vacations || []; s.templates = s.templates || [];
    migrateKfa(s);
    migrateCatalog(s);
    migrateHard(s);
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

  // ---------- Urlaub ----------
  // state.vacations = [{ id, from, to }] (beide Tage eingeschlossen). Eine Gewohnheit mit h.vac === false pausiert im Urlaub:
  // Urlaubstage zählen dann weder als erledigt noch als verpasst; Erledigtes zählt trotzdem. Ohne Angabe läuft sie weiter.
  // Eintragen höchstens VAC_BACK Tage rückwirkend, damit sich gerissene Serien nicht nachträglich retten lassen.
  const VAC_BACK = 3, NONE = new Set();
  let vacMemo = { k: null, set: NONE };
  function vacSet(state) {
    const k = JSON.stringify(state.vacations || []);
    if (vacMemo.k !== k) { const s = new Set(); for (const v of state.vacations || []) for (const d of dayRange(v.from, v.to)) s.add(d); vacMemo = { k, set: s }; }
    return vacMemo.set;
  }
  const offDays = (state, h) => h && h.vac === false ? vacSet(state) : NONE;
  const vacOn = (state, day) => (state.vacations || []).find(v => v.from <= day && v.to >= day) || null;
  // Ganze Woche (Mo–So) frei: nur dann zählt eine „X-mal pro Woche“-Gewohnheit in dieser Woche nicht
  const weekOff = (off, ws) => { if (!off.size) return false; for (let i = 0; i < 7; i++) if (!off.has(addDays(ws, i))) return false; return true; };
  // Neue oder geänderte Zeiträume prüfen; liefert eine Fehlermeldung oder null
  function vacCheck(state, v, old, today = todayStr()) {
    if (!v.from || !v.to) return 'Bitte beide Daten angeben.';
    if (v.to < v.from) return 'Das Ende liegt vor dem Beginn.';
    const min = addDays(today, -VAC_BACK);
    const added = [...dayRange(v.from, v.to)].filter(d => !old || d < old.from || d > old.to);
    if (added.some(d => d < min)) return `Urlaub lässt sich höchstens ${VAC_BACK} Tage rückwirkend eintragen.`;
    if ((state.vacations || []).some(x => x !== old && x.id !== (old && old.id) && x.from <= v.to && x.to >= v.from)) return 'Überschneidet sich mit einem anderen Urlaub.';
    return null;
  }

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
  // Urlaubstage (off) ohne Haken unterbrechen keine Serie und zählen nicht mit
  function streaksDaily(days, start, today, off = NONE) {
    let best = 0, run = 0;
    for (const d of dayRange(start, today)) { if (days.has(d)) { run++; best = Math.max(best, run); } else if (!off.has(d)) run = 0; }
    let cur = 0; let d = days.has(today) ? today : addDays(today, -1);
    while (d >= start) { if (days.has(d)) cur++; else if (!off.has(d)) break; d = addDays(d, -1); }
    return { cur, best };
  }
  function weekCount(days, ws) { let n = 0; for (let i = 0; i < 7; i++) if (days.has(addDays(ws, i))) n++; return n; }
  // Wochenziel kann sich ändern: gilt jeweils ab einer bestimmten Woche
  function targetAt(h, ws) {
    const list = (h.targets || []).filter(x => x.from <= ws).sort((a, b) => a.from.localeCompare(b.from));
    return list.length ? list[list.length - 1].target : h.target;
  }
  // Ganze Urlaubswochen ohne erreichtes Ziel werden übersprungen
  function streaksWeekly(days, start, today, tgt, off = NONE) {
    const w0 = weekStart(start), wNow = weekStart(today);
    let best = 0, run = 0;
    for (let w = w0; w <= wNow; w = addDays(w, 7)) {
      if (weekCount(days, w) >= tgt(w)) { run++; best = Math.max(best, run); } else if (w !== wNow && !weekOff(off, w)) run = 0;
    }
    let cur = 0; let w = weekCount(days, wNow) >= tgt(wNow) ? wNow : addDays(wNow, -7);
    while (w >= w0) { if (weekCount(days, w) >= tgt(w)) cur++; else if (!weekOff(off, w)) break; w = addDays(w, -7); }
    return { cur, best };
  }
  function quotaDaily(days, start, a, b, today, off = NONE) {
    const from = a > start ? a : start, to = b < today ? b : today;
    if (from > to) return null;
    let n = 0, t = 0; for (const d of dayRange(from, to)) { if (days.has(d)) { t++; n++; } else if (!off.has(d)) t++; }
    return t ? { n, t, pct: n / t } : null;
  }
  function quotaWeekly(days, start, a, b, today, tgt, off = NONE) {
    // Wochen, die im Zeitraum beginnen; laufende Woche zählt nur, wenn schon erreicht
    let n = 0, t = 0; const wNow = weekStart(today);
    for (let w = weekStart(a < start ? start : a); w <= b && w <= wNow; w = addDays(w, 7)) {
      if (w < a) continue;
      const ok = weekCount(days, w) >= tgt(w);
      if (w === wNow && !ok) continue;
      if (!ok && weekOff(off, w)) continue;
      t++; if (ok) n++;
    }
    return t ? { n, t, pct: n / t } : null;
  }
  function habitStats(state, h, today = todayStr()) {
    const days = checkedDays(state, h), off = offDays(state, h);
    const end = h.archived && h.archivedOn && h.archivedOn < today ? h.archivedOn : today;
    const total = [...days].filter(d => d <= end).length;
    if (h.type === 'weekly') {
      const tgt = w => targetAt(h, w);
      const st = streaksWeekly(days, h.start, end, tgt, off);
      return {
        days, off, total, unit: 'Wochen', ...st,
        week: { n: weekCount(days, weekStart(end)), t: tgt(weekStart(end)) },
        month: quotaWeekly(days, h.start, monthStart(end), monthEnd(end), end, tgt, off),
        year: quotaWeekly(days, h.start, yearStart(end), yearEnd(end), end, tgt, off)
      };
    }
    const st = streaksDaily(days, h.start, end, off);
    return {
      days, off, total, unit: 'Tage', ...st,
      week: quotaDaily(days, h.start, weekStart(end), addDays(weekStart(end), 6), end, off),
      month: quotaDaily(days, h.start, monthStart(end), monthEnd(end), end, off),
      year: quotaDaily(days, h.start, yearStart(end), yearEnd(end), end, off)
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


  // ---------- Übungskatalog ----------
  // Schema: Bewegung [Variante] (Gerät). Felder: Schlüssel | Name | Hauptmuskel | Nebenmuskeln | Gerät | Messart | Kategorie | Suchbegriffe | einseitig
  const MUSCLES = {
    brust: 'Brust', ruecken: 'Rücken', trapez: 'Trapez', schultern: 'Schultern', bizeps: 'Bizeps', trizeps: 'Trizeps', unterarme: 'Unterarme',
    bauch: 'Bauch', ur: 'Unterer Rücken', gesaess: 'Gesäß', quad: 'Quadrizeps', beinbeuger: 'Beinbeuger', waden: 'Waden',
    ganz: 'Ganzkörper', ausdauer: 'Ausdauer', mobil: 'Mobilität'
  };
  // Netzdiagramm: sechs Achsen wie in der Vorlage
  const RADAR = [['Brust', ['brust']], ['Rumpf', ['bauch']], ['Schultern', ['schultern']], ['Arme', ['bizeps', 'trizeps', 'unterarme']], ['Beine', ['quad', 'beinbeuger', 'gesaess', 'waden']], ['Rücken', ['ruecken', 'trapez', 'ur']]];
  const EQUIP = { lh: 'Langhantel', kh: 'Kurzhantel', sz: 'SZ-Stange', kg: 'Körpergewicht', kabel: 'Kabel', ma: 'Maschine', sonst: 'Sonstiges' };
  const EQUIP_OFF = ['kabel', 'ma'];
  const CAT_SRC = `
bank-lh|Bankdrücken (Langhantel)|brust|trizeps,schultern|lh|weight|Druck|BP,Bench Press
bank-kh|Bankdrücken (Kurzhantel)|brust|trizeps,schultern|kh|weight|Druck|Flachbankdrücken,Dumbbell Press
schraeg-lh|Schrägbankdrücken (Langhantel)|brust|schultern,trizeps|lh|weight|Druck|Incline Bench,Schrägbank
schraeg-kh|Schrägbankdrücken (Kurzhantel)|brust|schultern,trizeps|kh|weight|Druck|Incline,Schrägbank
floor-lh|Floor Press (Langhantel)|brust|trizeps|lh|weight|Druck|Bodendrücken
floor-kh|Floor Press (Kurzhantel)|brust|trizeps|kh|weight|Druck|Bodendrücken
fly-kh|Fliegende (Kurzhantel)|brust|schultern|kh|weight|Druck|Flys,Butterfly
flyschraeg-kh|Fliegende schräg (Kurzhantel)|brust|schultern|kh|weight|Druck|Incline Flys
pullover-kh|Überzüge (Kurzhantel)|brust|ruecken,trizeps|kh|weight|Druck|Pullover
lst|Liegestütze (Körpergewicht)|brust|trizeps,schultern,bauch|kg|reps|Druck|Push-up,Liegestütz
lst-erh|Liegestütze erhöht (Körpergewicht)|brust|trizeps,schultern|kg|reps|Druck|Incline Push-up
lst-fe|Liegestütze Füße erhöht (Körpergewicht)|brust|schultern,trizeps|kg|reps|Druck|Decline Push-up
dips-kg|Dips (Körpergewicht)|brust|trizeps,schultern|kg|reps|Druck|Barrenstütz
dips-ass|Dips (unterstützt)|brust|trizeps,schultern|ma|assist|Druck|Dips,Barrenstütz
klimm|Klimmzug (Körpergewicht)|ruecken|bizeps,unterarme|kg|reps|Zug|Pull-up,Klimmzüge
klimm-ass|Klimmzug (unterstützt)|ruecken|bizeps|ma|assist|Zug|Pull-up,Klimmzüge
chin|Klimmzug Untergriff (Körpergewicht)|ruecken|bizeps|kg|reps|Zug|Chin Up,Chin Ups
chin-ass|Klimmzug Untergriff (unterstützt)|ruecken|bizeps|ma|assist|Zug|Chin Up,Chin Ups
klimm-neg|Klimmzug negativ (Körpergewicht)|ruecken|bizeps|kg|reps|Zug|Negatives
rud-lh|Rudern vorgebeugt (Langhantel)|ruecken|bizeps,ur,trapez|lh|weight|Zug|Rudern,Barbell Row,Langhantelrudern
pendlay|Pendlay-Rudern (Langhantel)|ruecken|bizeps,ur,trapez|lh|weight|Zug|Rudern
rud-kh|Rudern vorgebeugt (Kurzhantel)|ruecken|bizeps,trapez|kh|weight|Zug|Rudern
rud-1|Rudern einarmig (Kurzhantel)|ruecken|bizeps|kh|weight|Zug|Einarmrudern,Ein-Arm-Rudern|1
rud-brust|Rudern brustgestützt (Kurzhantel)|ruecken|trapez,bizeps|kh|weight|Zug|Rudern,Chest Supported Row
rud-inv|Rudern invertiert (Körpergewicht)|ruecken|bizeps|kg|reps|Zug|Australian Pull-up,Inverted Row
shrug-lh|Schulterheben (Langhantel)|trapez|unterarme|lh|weight|Zug|Shrugs
shrug-kh|Schulterheben (Kurzhantel)|trapez|unterarme|kh|weight|Zug|Shrugs
latzug|Latzug (Maschine)|ruecken|bizeps|ma|weight|Zug|Freie Latzugmaschine,Lat Pulldown
rud-kabel|Rudern sitzend (Kabel)|ruecken|bizeps|kabel|weight|Zug|Rudern,Seated Row
facepull|Face Pull (Kabel)|schultern|trapez,ruecken|kabel|weight|Zug|Facepulls
ohp-lh|Schulterdrücken stehend (Langhantel)|schultern|trizeps|lh|weight|Druck|MP,Military Press,Overhead Press,OHP
ohp-kh-sitz|Schulterdrücken sitzend (Kurzhantel)|schultern|trizeps|kh|weight|Druck|Shoulder Press
ohp-kh|Schulterdrücken stehend (Kurzhantel)|schultern|trizeps|kh|weight|Druck|Shoulder Press
arnold|Arnold Press (Kurzhantel)|schultern|trizeps|kh|weight|Druck|Schulterdrücken
landmine|Landmine Press (Langhantel)|schultern|brust,trizeps|lh|weight|Druck|Schulterdrücken
seit|Seitheben (Kurzhantel)|schultern||kh|weight|Druck|Lateral Raise
front|Frontheben (Kurzhantel)|schultern||kh|weight|Druck|Front Raise
revfly|Reverse Flys (Kurzhantel)|schultern|trapez,ruecken|kh|weight|Zug|Vorgebeugtes Seitheben,Rear Delt
pike|Pike-Liegestütze (Körpergewicht)|schultern|trizeps|kg|reps|Druck|Pike Push-up
aussenrot|Außenrotation (Kurzhantel)|schultern||kh|weight|Reha|External Rotation,Rotatoren|1
yheben|Y-Heben (Kurzhantel)|schultern|trapez|kh|weight|Reha|Y-Raise
curl-lh|Bizepscurls (Langhantel)|bizeps|unterarme|lh|weight|Zug|Curls
curl-sz|Bizepscurls (SZ-Stange)|bizeps|unterarme|sz|weight|Zug|Curls,EZ
curl-kh|Bizepscurls (Kurzhantel)|bizeps|unterarme|kh|weight|Zug|Curls
hammer|Hammercurls (Kurzhantel)|bizeps|unterarme|kh|weight|Zug|Curls
curl-schraeg|Schrägbankcurls (Kurzhantel)|bizeps||kh|weight|Zug|Curls,Incline Curl
curl-konz|Konzentrationscurls (Kurzhantel)|bizeps||kh|weight|Zug|Curls|1
curl-rev|Reverse Curls (SZ-Stange)|unterarme|bizeps|sz|weight|Zug|Curls,EZ
stirn|Stirndrücken (SZ-Stange)|trizeps||sz|weight|Druck|French Press,Skullcrusher,EZ
tri-kopf|Trizepsdrücken über Kopf (Kurzhantel)|trizeps||kh|weight|Druck|Overhead Extension
kickback|Kickbacks (Kurzhantel)|trizeps||kh|weight|Druck|Trizeps|1
bank-eng|Bankdrücken eng (Langhantel)|trizeps|brust,schultern|lh|weight|Druck|Close Grip,BP eng
bankdips|Bankdips (Körpergewicht)|trizeps|schultern|kg|reps|Druck|Bench Dips
diamond|Diamond-Liegestütze (Körpergewicht)|trizeps|brust|kg|reps|Druck|Push-up eng
handgelenk|Handgelenkcurls (Kurzhantel)|unterarme||kh|weight|Zug|Wrist Curls
squat-lh|Kniebeuge (Langhantel)|quad|gesaess,ur|lh|weight|Beine|Squat,Back Squat
front-squat|Frontkniebeuge (Langhantel)|quad|gesaess,bauch|lh|weight|Beine|Front Squat
goblet|Goblet Squat (Kurzhantel)|quad|gesaess|kh|weight|Beine|Kniebeuge
squat-kg|Kniebeuge (Körpergewicht)|quad|gesaess|kg|reps|Beine|Air Squat
bss-kh|Bulgarian Split Squat (Kurzhantel)|quad|gesaess|kh|weight|Beine|Bulgarische Kniebeuge,BSS|1
bss-kg|Bulgarian Split Squat (Körpergewicht)|quad|gesaess|kg|reps|Beine|Bulgarische Kniebeuge,BSS|1
ausf-kh|Ausfallschritte (Kurzhantel)|quad|gesaess|kh|weight|Beine|Lunges|1
ausf-kg|Ausfallschritte (Körpergewicht)|quad|gesaess|kg|reps|Beine|Lunges|1
ausf-rueck|Ausfallschritte rückwärts (Kurzhantel)|quad|gesaess|kh|weight|Beine|Reverse Lunges|1
stepup-kh|Step-up (Kurzhantel)|quad|gesaess|kh|weight|Beine|Step Up,Step Up einbeinig|1
stepup-kg|Step-up (Körpergewicht)|quad|gesaess|kg|reps|Beine|Step Up,Step Up einbeinig|1
dl|Kreuzheben (Langhantel)|gesaess|beinbeuger,ur,trapez,unterarme|lh|weight|Beine|DL,Deadlift
sumo|Sumo-Kreuzheben (Langhantel)|gesaess|quad,beinbeuger,ur|lh|weight|Beine|Sumo Deadlift,DL
rdl-lh|Rumänisches Kreuzheben (Langhantel)|beinbeuger|gesaess,ur|lh|weight|Beine|RDL,Romanian Deadlift
rdl-kh|Rumänisches Kreuzheben (Kurzhantel)|beinbeuger|gesaess,ur|kh|weight|Beine|RDL
rdl1-kh|Rumänisches Kreuzheben einbeinig (Kurzhantel)|beinbeuger|gesaess|kh|weight|Beine|Single Leg RDL,RDL|1
rdl1-kg|Rumänisches Kreuzheben einbeinig (Körpergewicht)|beinbeuger|gesaess|kg|reps|Beine|Single Leg RDL,RDL|1
goodmorning|Good Morning (Langhantel)|beinbeuger|ur,gesaess|lh|weight|Beine|
hipthrust|Hip Thrust (Langhantel)|gesaess|beinbeuger|lh|weight|Beine|Beckenheben
becken|Beckenheben (Körpergewicht)|gesaess|beinbeuger|kg|reps|Beine|Glute Bridge
becken1|Beckenheben einbeinig (Körpergewicht)|gesaess|beinbeuger|kg|reps|Beine|Glute Bridge|1
nordic|Nordic Curls (Körpergewicht)|beinbeuger||kg|reps|Beine|Nordic Hamstring
waden-kh|Wadenheben (Kurzhantel)|waden||kh|weight|Beine|Calf Raise
waden1|Wadenheben einbeinig (Körpergewicht)|waden||kg|reps|Beine|Calf Raise|1
wandsitz|Wandsitzen (Körpergewicht)|quad||kg|time|Beine|Wall Sit
lp-schwarz|Beinpresse schwarz (Maschine)|quad|gesaess|ma|weight|Beine|Leg Press,Leg Press Schwarz
lp1-schwarz|Beinpresse schwarz einbeinig (Maschine)|quad|gesaess|ma|weight|Beine|Single Leg Press,Single Leg Press Schwarz|1
lp-grau|Beinpresse grau (Maschine)|quad|gesaess|ma|weight|Beine|Leg Press
lp1-grau|Beinpresse grau einbeinig (Maschine)|quad|gesaess|ma|weight|Beine|Single Leg Press|1
beinbeuger|Beinbeuger (Maschine)|beinbeuger||ma|weight|Beine|Beinbeuger-Maschine,Leg Curl
plank|Unterarmstütz (Körpergewicht)|bauch|schultern|kg|time|Rumpf|Plank,Planks
seitstuetz|Seitstütz (Körpergewicht)|bauch||kg|time|Rumpf|Side Plank|1
deadbug|Dead Bug (Körpergewicht)|bauch||kg|reps|Rumpf|
birddog|Bird Dog (Körpergewicht)|ur|bauch,gesaess|kg|reps|Rumpf|Vierfüßlerstand
hollow|Hollow Hold (Körpergewicht)|bauch||kg|time|Rumpf|
crunch|Crunches (Körpergewicht)|bauch||kg|reps|Rumpf|Bauchpresse
beinheben|Beinheben hängend (Körpergewicht)|bauch|unterarme|kg|reps|Rumpf|Hanging Leg Raise
rueckenstr|Rückenstrecker (Körpergewicht)|ur|gesaess,beinbeuger|kg|reps|Rumpf|Hyperextensions
russian|Russian Twist (Kurzhantel)|bauch||kh|weight|Rumpf|
suitcase|Suitcase Carry (Kurzhantel)|bauch|unterarme,trapez|kh|wtime|Rumpf|Koffer tragen|1
pallof|Pallof Press (Kabel)|bauch||kabel|weight|Rumpf|
farmer|Farmer's Walk (Kurzhantel)|unterarme|trapez,bauch,gesaess|kh|wtime|Rumpf|Farmers Walk,Bauerngang
thruster|Thruster (Kurzhantel)|ganz|quad,schultern,gesaess,trizeps|kh|weight|Beine|
burpees|Burpees (Körpergewicht)|ganz|brust,quad|kg|reps|Ausdauer|
mountain|Mountain Climbers (Körpergewicht)|bauch|schultern,quad|kg|time|Ausdauer|
deadhang|Dead Hang (Körpergewicht)|unterarme|ruecken|kg|time|Zug|Hängen
laufband|Laufband|ausdauer||sonst|cardio|Ausdauer|
laufband-r|Laufband rückwärts|ausdauer||sonst|cardio|Ausdauer|
seil|Seilspringen|ausdauer|waden|sonst|cardio|Ausdauer|Springseil
treppe|Treppensteiger|ausdauer||ma|cardio|Ausdauer|Stairmaster
schlitten|Gewichtsschlitten|ausdauer|quad,gesaess|sonst|sled|Ausdauer|Sled
shoulder-rehab|Shoulder Rehab|mobil|schultern|sonst|done|Reha|Schulter-Reha
bruecke|Brücke (Körpergewicht)|mobil|ur|kg|time|Reha|Rückbeuge
mob-huefte|Mobility – Hüfte|mobil||sonst|done|Reha|Mobilität,Hüfte
mob-ober|Mobility – Oberkörper|mobil||sonst|done|Reha|Mobilität,Stretching,Brustöffner
mob-unter|Mobility – Unterkörper|mobil||sonst|done|Reha|Mobilität,Beine`;
  const CATALOG = CAT_SRC.trim().split('\n').map(l => {
    const [key, name, muscle, m2, equip, type, cat, al, uni] = l.split('|');
    return { key, name, muscle, m2: m2 ? m2.split(',') : [], equip, type, cat, aliases: al ? al.split(',') : [], uni: uni === '1' };
  });
  const catByKey = k => CATALOG.find(x => x.key === k);
  const low = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').trim();
  // Umbenennung der importierten Übungen (Oktober 2026, mit Landry abgestimmt)
  const RENAME = {
    'bp': 'bank-lh', 'mp': 'ohp-lh', 'dips': 'dips-ass', 'chin ups': 'chin-ass', 'rudern': 'rud-lh', 'einarmrudern': 'rud-1',
    'freie latzugmaschine': 'latzug', 'facepulls': 'facepull', 'kreuzheben': 'dl', 'rdl': 'rdl-lh', 'single leg rdl': 'rdl1-kg',
    'beinbeuger-maschine': 'beinbeuger', 'leg press schwarz': 'lp-schwarz', 'single leg press schwarz': 'lp1-schwarz',
    'step up einbeinig': 'stepup-kg', 'planks': 'plank', 'brucke': 'bruecke', 'stretching': 'mob-ober'
  };
  const ADD_NOW = ['lp-grau', 'lp1-grau', 'stepup-kh', 'mob-huefte', 'mob-unter'];
  const exFromCat = (k, id) => ({ id: id || 'c-' + k.key, ref: k.key, name: k.name, cat: k.cat, type: k.type, uni: k.uni, muscle: k.muscle, m2: [...k.m2], equip: k.equip, aliases: [] });
  const adoptedRef = (state, k) => state.exercises.find(e => e.ref === k.key || low(e.name) === low(k.name));
  function adopt(state, key) {
    const k = catByKey(key); if (!k) return null;
    const have = adoptedRef(state, k); if (have) return have;
    const e = exFromCat(k); state.exercises.push(e); return e;
  }
  function migrateCatalog(s) {
    if (s.settings.catalog1) return;
    const used = id => s.sessions.some(x => x.items && x.items.some(i => i.ex === id));
    for (const e of s.exercises) {
      const key = RENAME[low(e.name)];
      const k = key ? catByKey(key) : CATALOG.find(x => low(x.name) === low(e.name));
      if (!k) continue;
      if (key && low(e.name) !== low(k.name)) e.aliases = [...new Set([...(e.aliases || []), e.name])];
      e.name = k.name; e.ref = k.key; e.muscle = k.muscle; e.m2 = [...k.m2]; e.equip = k.equip;
      if (key === 'bruecke') e.cat = 'Reha';
      if (key === 'mob-ober') {
        const items = s.sessions.flatMap(x => (x.items || []).filter(i => i.ex === e.id));
        if (items.every(i => !i.sets || !i.sets.length)) e.type = 'done';
      }
    }
    for (const key of ADD_NOW) {
      const k = catByKey(key);
      if (key.startsWith('mob-') && !s.exercises.some(e => e.ref === 'mob-ober')) continue;
      if (key.startsWith('lp') && !s.exercises.some(e => e.ref === 'lp-schwarz')) continue;
      if (key === 'stepup-kh' && !s.exercises.some(e => e.ref === 'stepup-kg')) continue;
      if (!adoptedRef(s, k)) s.exercises.push(exFromCat(k));
    }
    s.settings.catalog1 = true;
    return used;
  }
  // Suche: alle Wörter müssen in Name, Suchbegriffen, Muskel oder Gerät vorkommen
  function matches(e, q) {
    const toks = low(q).split(/\s+/).filter(Boolean); if (!toks.length) return true;
    const hay = low([e.name, ...(e.aliases || []), MUSCLES[e.muscle] || '', EQUIP[e.equip] || ''].join(' '));
    return toks.every(t => hay.includes(t));
  }

  // ---------- Zeit: Sekunden oder Minuten ----------
  // Gespeichert wird immer in Sekunden. Eingabe: „90“, „1,5“ oder „1:30“ je nach Einheit.
  function parseTime(v, unit) {
    const s = String(v ?? '').trim().replace(',', '.'); if (!s) return null;
    const m = s.match(/^(\d+):(\d{1,2})$/); if (m) return Number(m[1]) * 60 + Number(m[2]);
    if (!/^\d*\.?\d+$/.test(s)) return null;
    return Math.round(Number(s) * (unit === 'min' ? 60 : 1));
  }
  function timeInput(sec, unit) {
    if (!isNum(sec)) return '';
    if (unit !== 'min') return String(sec);
    return sec % 6 === 0 ? String(sec / 60).replace('.', ',') : `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
  }
  const timeTxt = (v, unit) => unit === 'min' ? (v % 6 === 0 ? `${fmtW(v / 60)} Min.` : `${Math.floor(v / 60)}:${pad(v % 60)} Min.`) : secTxt(v);

  // ---------- Trainingsstatistik ----------
  const counted = s => s.kind === 'training' && (s.done || (s.items && s.items.length));
  const sessMin = s => { if (!s.startedAt || !s.endedAt) return null; const m = (new Date(s.endedAt) - new Date(s.startedAt)) / 6e4; return m > 0 && m <= 240 ? Math.round(m) : null; };
  const setCount = (ex, it) => ex && ex.type !== 'done' && ex.type !== 'cardio' ? (it.sets || []).filter(x => !x.pre && Object.values(x).some(v => v !== null && v !== undefined && v !== '')).length : 0;
  // Sätze je Muskel: Hauptmuskel zählt ganz, Nebenmuskeln halb
  function trainStats(state, a, b) {
    const out = { n: 0, min: 0, minN: 0, vol: 0, sets: 0, muscles: {}, ex: new Map(), days: new Set() };
    for (const s of state.sessions) {
      if (s.date < a || s.date > b || !counted(s)) continue;
      out.n++; out.days.add(s.date);
      const m = sessMin(s); if (m !== null) { out.min += m; out.minN++; }
      for (const it of s.items || []) {
        const ex = exById(state, it.ex); if (!ex) continue;
        const n = setCount(ex, it); out.sets += n;
        if (ex.type === 'weight') for (const x of it.sets || []) if (isNum(x.w) && isNum(x.r)) out.vol += x.w * x.r;
        if (n && ex.muscle && MUSCLES[ex.muscle]) {
          out.muscles[ex.muscle] = (out.muscles[ex.muscle] || 0) + n;
          for (const m2 of ex.m2 || []) out.muscles[m2] = (out.muscles[m2] || 0) + n / 2;
        }
        if (n || it.done || (it.sets && it.sets.length)) { const c = out.ex.get(ex.id) || { n: 0, last: '' }; c.n++; if (s.date > c.last) c.last = s.date; out.ex.set(ex.id, c); }
      }
    }
    return out;
  }
  const radarOf = mus => RADAR.map(([l, ks]) => [l, ks.reduce((a, k) => a + (mus[k] || 0), 0)]);
  // Rekorde: jedes Mal, wenn die Hauptkennzahl einer Übung den bisherigen Bestwert übertrifft
  function records(state) {
    const out = [];
    for (const ex of state.exercises) {
      const m = (METRICS[ex.type] || [])[0]; if (!m) continue;
      let best = null;
      for (const h of exHistory(state, ex.id)) {
        const v = h.v[m[0]]; if (!isNum(v)) continue;
        if (best !== null && (m[3] ? v < best : v > best)) out.push({ ex: ex.id, d: h.d, v, prev: best, m });
        if (best === null || (m[3] ? v < best : v > best)) best = v;
      }
    }
    return out.sort((x, y) => y.d.localeCompare(x.d));
  }
  // Wochenserie: aufeinanderfolgende Wochen mit mindestens einer Einheit bis zum Stichtag
  function weekStreak(state, day) {
    const wk = new Set(state.sessions.filter(s => counted(s) && s.date <= day).map(s => weekStart(s.date)));
    let w = weekStart(day); if (!wk.has(w)) w = addDays(w, -7);
    let n = 0; while (wk.has(w)) { n++; w = addDays(w, -7); }
    return n;
  }

  // ---------- Gewichtete Gewohnheiten ----------
  // Schwierigkeit 1–5 (Standard 3) -> Anteil am Wochenring, zusammen 100 %
  const diffOf = h => Number.isInteger(h.diff) && h.diff >= 1 && h.diff <= 5 ? h.diff : 3;
  function shares(habits) { const t = habits.reduce((a, h) => a + diffOf(h), 0); return new Map(habits.map(h => [h.id, t ? diffOf(h) / t : 0])); }

  // ---------- Feste Regeln für schwere Gewohnheiten ----------
  // Stufe 5 „sehr schwer“: höchstens eine aktive. Sie bleibt mindestens 4 Monate auf 5; auf 4 herabstufen darf man,
  // sobald die letzten 4 Monate zu mindestens 98 % erfüllt sind (rollierend). Danach 2 Monate auf 4; sind die letzten
  // 2 Monate zu mindestens 98 % erfüllt, ist die Bewährung bestanden. Bis dahin keine weitere Stufe 4 oder 5.
  // Wird die Gewohnheit vorher archiviert, gilt die Sperre bis 6 Monate nach ihrem Beginn. Höchstens 5 aktive Gewohnheiten.
  // h.prob = { start5, ok5?, start4?, done? } (Tage als JJJJ-MM-TT)
  const HARD = { m5: 4, m4: 2, quota: 98, maxActive: 5, block: 6 };
  function addMonths(s, n) {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    const t = new Date(y, m - 1 + n, 1, 12), last = new Date(t.getFullYear(), t.getMonth() + 1, 0, 12).getDate();
    t.setDate(Math.min(d, last)); return iso(t);
  }
  // Beginn des Fensters von m Monaten, das am Tag e endet
  const winStart = (e, m) => addMonths(addDays(e, 1), -m);
  // Mit Urlaub (Gewohnheit pausiert): Das Fenster reicht so weit zurück, dass es so viele zählende Tage bzw. Wochen enthält
  // wie m Kalendermonate. Urlaub verlängert die Fristen also, statt sie zu verkürzen.
  function winFrom(h, e, m, days, off) {
    const a0 = winStart(e, m);
    if (!off.size) return a0;
    if (h.type === 'weekly') {
      let K = 0; for (let w = weekStart(a0); w <= e; w = addDays(w, 7)) if (w >= a0 && addDays(w, 6) <= e) K++;
      let w = weekStart(e); if (addDays(w, 6) > e) w = addDays(w, -7);
      let k = 0, a = a0;
      for (let i = 0; i < 2000 && k < K; i++, w = addDays(w, -7)) { if (!(weekOff(off, w) && weekCount(days, w) < targetAt(h, w))) k++; a = w; }
      return a < a0 ? a : a0;
    }
    const L = diffDays(a0, e) + 1;
    let a = e, k = 0;
    for (let i = 0; i < 5000; i++) { if (!off.has(a) || days.has(a)) k++; if (k >= L) return a; a = addDays(a, -1); }
    return a;
  }
  // Erfüllung im Fenster [a, b]. Offenes (heute, laufende Woche, Zukunft) zählt bei assume als erledigt, sonst gar nicht.
  // Täglich: Tage. X-mal pro Woche: Einheiten bis zum Wochenziel, nur ganze Wochen im Fenster. Urlaub ohne Haken zählt nicht.
  function winQuota(state, h, a, b, today, assume, days = checkedDays(state, h), off = offDays(state, h)) {
    let n = 0, t = 0;
    if (h.type === 'weekly') {
      for (let w = weekStart(a); w <= b; w = addDays(w, 7)) {
        if (w < a || addDays(w, 6) > b) continue;
        const T = targetAt(h, w), c = Math.min(T, weekCount(days, w));
        if (c < T && weekOff(off, w)) continue;
        if (addDays(w, 6) < today || c >= T) { t += T; n += c; } else if (assume) { t += T; n += T; }
      }
    } else {
      for (const d of dayRange(a, b)) {
        if (off.has(d) && !days.has(d)) continue;
        if (d < today || days.has(d)) { t++; if (days.has(d)) n++; } else if (assume) { t++; n++; }
      }
    }
    return { n, t };
  }
  const needFor = t => Math.ceil(t * HARD.quota / 100);
  // Letzter abgeschlossener Tag bzw. letzte abgeschlossene Woche (heute zählt, sobald erledigt)
  function doneEnd(h, today, days) {
    if (h.type === 'weekly') { const w = weekStart(today); return weekCount(days, w) >= targetAt(h, w) ? addDays(w, 6) : addDays(w, -1); }
    return days.has(today) ? today : addDays(today, -1);
  }
  function passes(state, h, s, m, today, days = checkedDays(state, h), off = offDays(state, h)) {
    const b = doneEnd(h, today, days), a = winFrom(h, b, m, days, off);
    if (a < s) return false;
    const q = winQuota(state, h, a, b, today, false, days, off);
    return q.t > 0 && q.n >= needFor(q.t);
  }
  // Frühestes Ende eines vollen Fensters ab s (Urlaub verlängert es)
  function minEnd(h, s, m, days, off) {
    let e = addDays(addMonths(s, m), -1);
    if (h.type === 'weekly') e = addDays(weekStart(e), 6);
    if (!off.size) return e;
    const st = h.type === 'weekly' ? 7 : 1;
    for (let i = 0; i < 1000 && winFrom(h, e, m, days, off) < s; i++) e = addDays(e, st);
    return e;
  }
  // Frühestes Fensterende: volle m Monate ab s und nicht vor dem laufenden Tag bzw. der laufenden Woche
  function firstEnd(h, s, m, today, days = NONE, off = NONE) {
    const e = minEnd(h, s, m, days, off);
    if (h.type === 'weekly') { const now = addDays(weekStart(today), 6); return e > now ? e : now; }
    return e > today ? e : today;
  }
  // Ab wann die Mindestdauer erfüllt ist (ohne Urlaub: genau m Monate nach s)
  function hardFrom(state, h, s, m) {
    const off = offDays(state, h);
    return off.size ? addDays(minEnd(h, s, m, checkedDays(state, h), off), 1) : addMonths(s, m);
  }
  // Puffer: wie viele Fehltage (bzw. Einheiten) noch erlaubt sind, und ab wann es frühestens reicht, wenn ab jetzt alles klappt
  function bufferInfo(state, h, s, m, today) {
    const days = checkedDays(state, h), off = offDays(state, h), wk = h.type === 'weekly', step = wk ? 7 : 1;
    let e = firstEnd(h, s, m, today, days, off);
    const q = winQuota(state, h, winFrom(h, e, m, days, off), e, today, true, days, off), need = needFor(q.t);
    const out = { rest: q.n - need, t: q.t, miss: q.t - need, unit: wk ? 'Einheiten' : 'Tage', at: null };
    for (let i = 0; i < 800 / step; i++, e = addDays(e, step)) {
      const r = winQuota(state, h, winFrom(h, e, m, days, off), e, today, true, days, off);
      if (r.t > 0 && r.n >= needFor(r.t)) { out.at = wk ? addDays(weekStart(e), Math.max(0, targetAt(h, weekStart(e)) - 1)) : e; break; }
    }
    if (out.at && wk && out.at < today) out.at = today;
    return out;
  }
  // Stand einer Gewohnheit in den festen Regeln; null = keine Bindung
  function hardStatus(state, h, today = todayStr()) {
    const p = h.prob; if (!p || !p.start5) return null;
    if (p.done) return { phase: 'done', p };
    const until = addMonths(p.start5, HARD.block);
    if (h.archived) return { phase: 'arch', p, until, blocks: today < until };
    const pend = today < p.start5; // Bedenkzeit: Beginn liegt noch vor uns
    if (diffOf(h) === 5) return { phase: 5, p, pend, blocks: true, ok: !!p.ok5, from: hardFrom(state, h, p.start5, HARD.m5), until, buf: pend ? null : bufferInfo(state, h, p.start5, HARD.m5, today) };
    if (p.start4) return { phase: 4, p, blocks: true, from: hardFrom(state, h, p.start4, HARD.m4), buf: bufferInfo(state, h, p.start4, HARD.m4, today) };
    return null;
  }
  // Gebunden = Art und Wochenziel dürfen nicht leichter werden, Löschen nicht möglich
  const hardBound = st => !!st && ((st.phase === 5 && !st.pend) || st.phase === 4 || (st.phase === 'arch' && st.blocks));
  // Erlaubte Stufen für eine Gewohnheit (h = null: neue Gewohnheit)
  function diffGate(state, h, today = todayStr()) {
    const st = h ? hardStatus(state, h, today) : null, ok = new Set([1, 2, 3]);
    if (st && st.phase === 5 && !st.pend) return { ok: new Set(st.ok ? [4, 5] : [5]), st };
    if (st && st.phase === 4) return { ok: new Set([4]), st };
    const others = state.habits.filter(x => !h || x.id !== h.id);
    const blocker = others.find(x => { const s = hardStatus(state, x, today); return s && s.blocks; }) || null;
    const five = others.find(x => !x.archived && diffOf(x) === 5) || null;
    if (!blocker) ok.add(4);
    if (!blocker && !five) ok.add(5);
    if (h) ok.add(diffOf(h));
    return { ok, st, blocker, five };
  }
  const activeCount = (state, exceptId) => state.habits.filter(x => !x.archived && x.id !== exceptId).length;
  // Wieder aktivieren: Grenze von 5 und die Regeln für die eigene Stufe
  function activateBlock(state, h, today = todayStr()) {
    if (activeCount(state, h.id) >= HARD.maxActive) return `Schon ${HARD.maxActive} aktive Gewohnheiten.`;
    const d = diffOf(h), g = diffGate(state, h, today);
    if (d === 5 && g.five) return `„${g.five.name}“ ist schon sehr schwer.`;
    if (d >= 4 && g.blocker) return `Erst muss „${g.blocker.name}“ die Bewährung bestehen.`;
    return null;
  }
  // Fortschritt festhalten; liefert Hinweise für „Heute“
  function tickHard(state, today = todayStr()) {
    const out = [];
    for (const h of state.habits) {
      const p = h.prob; if (!p || !p.start5 || p.done || h.archived || today < p.start5) continue;
      const days = checkedDays(state, h);
      if (diffOf(h) === 5 && !p.ok5 && passes(state, h, p.start5, HARD.m5, today, days)) { p.ok5 = today; out.push(`„${h.name}“: 4 Monate mit mindestens 98 % geschafft. Du darfst sie jetzt auf „schwer“ herabstufen.`); }
      else if (diffOf(h) === 4 && p.start4 && passes(state, h, p.start4, HARD.m4, today, days)) { p.done = today; out.push(`„${h.name}“: Bewährung bestanden. Eine weitere schwere oder sehr schwere Gewohnheit ist jetzt möglich.`); }
    }
    return out;
  }
  // Verstöße im Bestand (z. B. aus der Zeit vor den Regeln); die App archiviert nichts von selbst
  function hardViolations(state) {
    const act = state.habits.filter(h => !h.archived), out = [];
    if (act.length > HARD.maxActive) out.push(`${act.length} aktive Gewohnheiten, erlaubt sind ${HARD.maxActive}. Bitte archiviere ${act.length - HARD.maxActive}.`);
    const fives = act.filter(h => diffOf(h) === 5);
    if (fives.length > 1) out.push(`${fives.length} sehr schwere Gewohnheiten, erlaubt ist eine. Bitte stufe ${fives.length - 1} herab.`);
    return out;
  }
  // Bestand: genau eine aktive Stufe 5 ohne Bindung bekommt sie ab heute; bei mehreren erst, wenn nur noch eine übrig ist
  function migrateHard(s, today = todayStr()) {
    const fives = s.habits.filter(h => !h.archived && diffOf(h) === 5);
    if (fives.length === 1 && !(fives[0].prob && fives[0].prob.start5 && !fives[0].prob.done)) fives[0].prob = { start5: today, migrated: true };
  }

  // ---------- Training ----------
  const TYPES = {
    weight: 'Gewicht × Wdh.', assist: 'Gegengewicht × Wdh.', reps: 'Nur Wiederholungen',
    time: 'Sätze × Zeit', wtime: 'Gewicht × Zeit', cardio: 'Dauer, Tempo, Steigung', sled: 'Gewicht × Strecke', done: 'Nur erledigt'
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
    for (const s of ts) { const it = s.items.find(i => i.ex === exId && (i.sets.some(x => !x.pre) || i.done)); if (it) return { session: s, item: it }; }
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
    if (ex.type === 'time') return groupRuns(sets.map(s => s.s)).filter(([v]) => isNum(v)).map(([v, n]) => `${n}× ${timeTxt(v, ex.unit)}`).join(', ');
    if (ex.type === 'sled') return sets.map(s => `${fmtW(s.w)} kg × ${fmtW(s.m)} m`).join(', ');
    if (ex.type === 'wtime') return sets.map(s => `${isNum(s.w) ? fmtW(s.w) + ' kg' : '? kg'} × ${isNum(s.s) ? timeTxt(s.s, ex.unit) : '?'}`).join(', ');
    if (ex.type === 'reps') return repsText(sets.map(s => s.r));
    // weight/assist: nach Gewicht gruppieren
    const groups = [];
    for (const s of sets) { const g = groups[groups.length - 1]; if (g && g.w === s.w) g.r.push(s.r); else groups.push({ w: s.w, r: [s.r] }); }
    return groups.map(g => `${g.w === null || g.w === undefined ? '? kg' : (ex.type === 'assist' ? (g.w === 0 ? 'ohne Hilfe' : fmtW(Math.abs(g.w)) + ' kg Hilfe') : fmtW(g.w) + ' kg')} · ${repsText(g.r)}`).join('; ');
  }
  // ---------- Leistungsentwicklung ----------
  // [Schlüssel, Bezeichnung, Einheit, weniger ist besser]
  const METRICS = {
    weight: [['max', 'Höchstes Gewicht', 'kg'], ['e1rm', 'Geschätztes 1RM', 'kg'], ['vol', 'Volumen', 'kg']],
    assist: [['assist', 'Geringste Hilfe', 'kg', true], ['reps', 'Wiederholungen gesamt', 'Wdh.']],
    reps: [['maxr', 'Meiste Wdh. im Satz', 'Wdh.'], ['reps', 'Wiederholungen gesamt', 'Wdh.']],
    time: [['maxs', 'Längster Satz', 'Sek.'], ['tots', 'Gesamtzeit', 'Sek.']],
    cardio: [['min', 'Dauer', 'Min.'], ['kmh', 'Tempo', 'km/h']],
    sled: [['max', 'Höchstes Gewicht', 'kg'], ['m', 'Strecke gesamt', 'm']],
    wtime: [['max', 'Höchstes Gewicht', 'kg'], ['maxs', 'Längster Satz', 'Sek.'], ['tots', 'Gesamtzeit', 'Sek.']],
    done: []
  };
  const isNum = x => typeof x === 'number' && !Number.isNaN(x);
  // Epley-Formel; bei mehr als 12 Wdh. ungenauer
  const e1rm = (w, r) => r <= 1 ? w : w * (1 + r / 30);
  function metricValues(ex, sets) {
    const v = {}, mx = a => a.length ? Math.max(...a) : undefined, sum = a => a.length ? a.reduce((x, y) => x + y, 0) : undefined;
    const wr = sets.filter(x => isNum(x.w) && isNum(x.r) && x.r > 0);
    const rs = sets.map(x => x.r).filter(isNum);
    if (ex.type === 'weight') { if (wr.length) { v.max = mx(wr.map(x => x.w)); v.e1rm = mx(wr.map(x => e1rm(x.w, x.r))); v.vol = sum(wr.map(x => x.w * x.r)); } }
    else if (ex.type === 'assist') { if (wr.length) v.assist = Math.min(...wr.map(x => Math.abs(x.w))); v.reps = sum(rs); }
    else if (ex.type === 'reps') { v.maxr = mx(rs); v.reps = sum(rs); }
    else if (ex.type === 'time') { const t = sets.map(x => x.s).filter(isNum); v.maxs = mx(t); v.tots = sum(t); }
    else if (ex.type === 'cardio') { v.min = sum(sets.map(x => x.min).filter(isNum)); v.kmh = mx(sets.map(x => x.kmh).filter(isNum)); }
    else if (ex.type === 'wtime') { v.max = mx(sets.map(x => x.w).filter(isNum)); const t = sets.map(x => x.s).filter(isNum); v.maxs = mx(t); v.tots = sum(t); }
    else if (ex.type === 'sled') { v.max = mx(sets.map(x => x.w).filter(isNum)); v.m = sum(sets.map(x => x.m).filter(isNum)); }
    for (const k of Object.keys(v)) if (!isNum(v[k])) delete v[k];
    return v;
  }
  function exHistory(state, exId) {
    const ex = exById(state, exId); if (!ex) return [];
    const out = [];
    for (const s of trainings(state)) for (const it of s.items) {
      const sets = it.sets.filter(x => !x.pre);
      if (it.ex !== exId || !(sets.length || it.done || ex.type === 'done')) continue;
      out.push({ d: s.date, num: s.num, sid: s.id, v: metricValues(ex, sets), sets, note: it.note || '' });
    }
    return out;
  }
  // Bestes Gewicht je Wiederholungszahl (nur Gewichtsübungen)
  function repRecords(hist) {
    const best = new Map();
    for (const h of hist) for (const x of h.sets) {
      if (!isNum(x.w) || !isNum(x.r) || x.r <= 0) continue;
      const b = best.get(x.r); if (!b || x.w > b.w) best.set(x.r, { r: x.r, w: x.w, d: h.d });
    }
    return [...best.values()].sort((a, b) => a.r - b.r);
  }

  // ---------- Progression (mit Landry abgestimmt, Oktober 2026) ----------
  // Vorschlag, nie automatisch. Steigerung, wenn in den letzten n Einheiten (Standard 4) innerhalb von days Tagen (30)
  // mit demselben Arbeitsgewicht alle Arbeitssätze (mind. 2) die Obergrenze erreicht haben. Immer nur der kleinste Schritt.
  // 10-%-Grenze: Ist der Schritt größer als 10 % des Gewichts, erst Obergrenze + 2 Wdh. (bei Zeit/Strecke × 1,2).
  // Höchstens eine Steigerung je 4 Wochen. Beschwerden sperren 4 Wochen, danach zählt neu. Kategorie pausiert: nichts.
  // Lücke über 3 Wochen: Wiedereinstieg mit etwa 90 % (Vorsichtsregel). Rückschritt: in 2 Einheiten nacheinander mit
  // demselben Gewicht lag mindestens die Hälfte der Arbeitssätze unter der Untergrenze.
  const PROG = { n: 4, days: 30, cap: 0.10, extraR: 2, extraF: 1.2, gap: 21, back: 0.9, pain: 28, once: 28, minSets: 2, lowR: 2, lowF: 0.8 };
  const LOADED = { weight: ['w', 'r'], assist: ['w', 'r'], wtime: ['w', 's'], sled: ['w', 'm'] };
  const UNLOADED = { reps: 'r', time: 's' };
  const progable = ex => !!ex && !!(LOADED[ex.type] || UNLOADED[ex.type]);
  const perfKey = ex => LOADED[ex.type] ? LOADED[ex.type][1] : UNLOADED[ex.type];
  const PERF_UNIT = { r: 'Wdh.', s: 'Sek.', m: 'm' };
  function stepDefault(ex) {
    if (ex.type === 'reps') return 1;
    if (ex.type === 'time') return 5;
    if (ex.type === 'assist' || ex.type === 'sled') return 5;
    return ex.equip === 'lh' || ex.equip === 'sz' ? 1 : 2.5;
  }
  const progDefaultOn = ex => progable(ex) && !['Reha', 'Ausdauer'].includes(ex.cat) && ex.muscle !== 'mobil';
  const loadOf = (ex, x) => ex.type === 'assist' ? Math.abs(x.w) : x.w;
  // schwerer = mehr Gewicht, beim Gegengewicht weniger Hilfe
  const harder = (ex, a, b) => ex.type === 'assist' ? a < b : a > b;
  const rnd = (v, st) => Math.round(Math.round(v / st) * st * 100) / 100;
  // Arbeitssätze: alle Sätze mit dem schwersten Gewicht der Einheit; leichtere (Aufwärmen) zählen nicht
  function workSets(ex, sets) {
    const pk = perfKey(ex), lk = LOADED[ex.type] ? 'w' : null;
    const ok = (sets || []).filter(x => isNum(x[pk]) && x[pk] > 0 && (!lk || isNum(x.w)));
    if (!ok.length) return null;
    if (!lk) return { load: null, perf: ok.map(x => x[pk]) };
    const ls = ok.map(x => loadOf(ex, x)), best = ex.type === 'assist' ? Math.min(...ls) : Math.max(...ls);
    return { load: best, perf: ok.filter(x => loadOf(ex, x) === best).map(x => x[pk]) };
  }
  // Einträge einer Übung vor einer Einheit (sess = { id, date }; id null = nächste Einheit)
  function progHist(state, ex, sess) {
    const ts = trainings(state), i = sess.id ? ts.findIndex(s => s.id === sess.id) : -1;
    const out = [];
    for (const s of (i < 0 ? ts : ts.slice(0, i))) {
      if (s.date > sess.date || s.id === sess.id) continue;
      for (const it of s.items || []) if (it.ex === ex.id) { const w = workSets(ex, it.sets); if (w || it.pain) out.push({ d: s.date, w, pain: !!it.pain }); }
    }
    return out;
  }
  const median = a => { const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  // Bereich aus den letzten 8 Einheiten ableiten: Obergrenze = Median der Arbeitssätze, Untergrenze 2 Wdh. (bzw. 20 %) darunter
  function progDerive(state, ex) {
    const h = progHist(state, ex, { id: null, date: '9999-12-31' }).filter(x => x.w).slice(-8);
    if (h.length < 3) return null;
    const pk = perfKey(ex), m = median(h.flatMap(x => x.w.perf));
    const hi = pk === 'r' ? Math.max(1, Math.round(m)) : Math.max(5, rnd(m, 5));
    return { hi, lo: pk === 'r' ? Math.max(1, hi - PROG.lowR) : rnd(hi * PROG.lowF, 1), src: 'abg' };
  }
  function progStd(ex) {
    const pk = perfKey(ex);
    if (pk === 'r') return ex.type === 'reps' ? { lo: 8, hi: 10 } : { lo: 8, hi: 12 };
    if (pk === 's') return { lo: 24, hi: 30 };
    return { lo: 16, hi: 20 };
  }
  // Einstellungen einer Übung mit Standardwerten
  function progCfg(state, ex) {
    const p = ex.prog || {}, r = p.hi ? { lo: p.lo, hi: p.hi } : (progDerive(state, ex) || progStd(ex));
    return { on: p.on === undefined ? progDefaultOn(ex) : !!p.on, lo: r.lo, hi: r.hi, step: p.step || stepDefault(ex), n: p.n || PROG.n, days: p.days || PROG.days, src: p.hi ? (p.src || 'user') : (r.src || 'std'), raised: p.raised || null };
  }
  // Abgeleitete Bereiche festschreiben, sobald es genug Daten gibt; später ändert nur Landry sie
  function settleProg(state) {
    let ch = false;
    for (const ex of state.exercises) {
      if (!progable(ex) || (ex.prog && ex.prog.hi)) continue;
      const d = progDerive(state, ex); if (!d) continue;
      ex.prog = { ...(ex.prog || {}), lo: d.lo, hi: d.hi, src: 'abg' }; ch = true;
    }
    return ch;
  }
  const stepUp = (ex, w, st) => ex.type === 'assist' ? Math.max(0, rnd(w - st, 0.01)) : rnd(w + st, 0.01);
  const stepDown = (ex, w, st) => ex.type === 'assist' ? rnd(w + st, 0.01) : Math.max(0, rnd(w - st, 0.01));
  // Wiedereinstieg: etwa 90 %, auf den Schritt abgerundet, mindestens ein Schritt leichter
  function backLoad(ex, w, st) {
    if (ex.type === 'assist') return rnd(w + st, 0.01);
    const v = Math.floor(w * PROG.back / st + 1e-9) * st;
    return Math.max(0, rnd(v < w ? v : w - st, 0.01));
  }
  // Ergebnis: null (aus/nicht möglich) oder { k: 'up'|'down'|'back'|'goal'|'pain'|'pause'|'wait'|'once', … }
  function progFor(state, exId, sess, item) {
    const ex = exById(state, exId); if (!progable(ex)) return null;
    const c = progCfg(state, ex); if (!c.on) return null;
    const loaded = !!LOADED[ex.type], pk = perfKey(ex);
    if (pauseFor(state, ex.cat, sess.date)) return { k: 'pause', c };
    // Beschwerden sperren nur Steigerungen; Wiedereinstieg und Rückschritt (leichter) bleiben möglich
    const H = progHist(state, ex, sess), all = H.filter(x => x.w);
    const pain = [...H].reverse().find(x => x.pain);
    const painUntil = item && item.pain ? addDays(sess.date, PROG.pain) : pain && diffDays(pain.d, sess.date) < PROG.pain ? addDays(pain.d, PROG.pain) : null;
    if (!all.length) return painUntil ? { k: 'pain', until: painUntil, c } : { k: 'wait', have: 0, n: c.n, c };
    const last = all[all.length - 1];
    if (diffDays(last.d, sess.date) > PROG.gap) {
      return loaded ? { k: 'back', last: last.d, from: last.w.load, w: backLoad(ex, last.w.load, c.step), c }
        : { k: 'back', last: last.d, hi: pk === 'r' ? Math.max(1, Math.floor(c.hi * PROG.back)) : rnd(c.hi * PROG.back, 1), c };
    }
    if (loaded && all.length >= 2) {
      const [a, b] = all.slice(-2), low = e => e.w.perf.filter(p => p < c.lo).length * 2 >= e.w.perf.length;
      if (a.w.load === b.w.load && low(a) && low(b)) {
        let prev = null;
        for (let i = all.length - 3; i >= 0; i--) if (harder(ex, b.w.load, all[i].w.load)) { prev = all[i].w.load; break; }
        return { k: 'down', from: b.w.load, w: prev === null ? stepDown(ex, b.w.load, c.step) : prev, c };
      }
    }
    if (painUntil) return { k: 'pain', until: painUntil, c };
    const D = all.filter(x => !pain || x.d > pain.d);
    const W = last.w.load;
    const big = loaded && ex.type !== 'assist' && W > 0 && c.step / W > PROG.cap;
    const need = big ? (pk === 'r' ? c.hi + PROG.extraR : Math.ceil(c.hi * PROG.extraF)) : c.hi;
    const ok = e => e.w.perf.length >= PROG.minSets && e.w.perf.every(p => p >= need) && (!loaded || e.w.load === W);
    let have = 0;
    for (let i = D.length - 1; i >= 0 && ok(D[i]) && diffDays(D[i].d, last.d) < c.days; i--) have++;
    const base = { have: Math.min(have, c.n), n: c.n, need, big, W, c };
    if (have < c.n) return { k: 'wait', ...base };
    if (loaded) {
      let inc = null;
      for (let i = all.length - 1; i > 0; i--) if (harder(ex, all[i].w.load, all[i - 1].w.load)) { inc = all[i].d; break; }
      if (inc && diffDays(inc, sess.date) < PROG.once) return { k: 'once', until: addDays(inc, PROG.once), ...base };
      return { k: 'up', from: W, w: stepUp(ex, W, c.step), ...base };
    }
    if (c.raised && diffDays(c.raised, sess.date) < PROG.once) return { k: 'once', until: addDays(c.raised, PROG.once), ...base };
    const st = pk === 'r' ? c.step : Math.min(c.step, Math.max(1, Math.round(c.hi * PROG.cap)));
    return { k: 'goal', from: c.hi, hi: rnd(c.hi + st, 0.01), lo: rnd(c.lo + st, 0.01), ...base };
  }


  // ---------- Vorlagen ----------
  // Vorlage: { id, name, rot, archived, items: [{ ex, sets, note }] }; Einheiten aus einer Vorlage tragen tpl, tplItems (Stand beim Start) und je Übung ti
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const tplOf = (state, id) => (state.templates || []).find(t => t.id === id) || null;
  const rotTemplates = state => (state.templates || []).filter(t => t.rot && !t.archived);
  function tplLetter(state, t) { const i = rotTemplates(state).indexOf(t); return i < 0 ? '' : LETTERS[i] || ''; }
  // Runden: Eine Runde ist fertig, wenn jede Vorlage der Rotation mindestens einmal trainiert wurde.
  // Vorgeschlagen wird die erste noch offene in der Reihenfolge, Ausgelassenes bleibt also als Nächstes stehen.
  function rotation(state) {
    const list = rotTemplates(state); if (!list.length) return null;
    const ids = new Set(list.map(t => t.id));
    let done = new Set(), round = 1;
    for (const s of trainings(state)) {
      if (!s.done || !ids.has(s.tpl)) continue;
      done.add(s.tpl);
      if (list.every(t => done.has(t.id))) { done = new Set(); round++; }
    }
    return { list, done, round, next: list.find(t => !done.has(t.id)) };
  }
  function tplLast(state, id) { const ts = trainings(state).filter(s => s.tpl === id && s.done); return ts.length ? ts[ts.length - 1].date : null; }
  // Satz zählt, sobald irgendein Wert eingetragen ist
  const filled = x => Object.keys(x).some(k => k !== 'pre' && x[k] !== null && x[k] !== undefined && x[k] !== '');
  // Abweichungen einer Einheit von ihrer Vorlage (Stand beim Start)
  function tplDiff(state, s) {
    const t = tplOf(state, s.tpl);
    if (!t || !Array.isArray(s.tplItems) || JSON.stringify(t.items) !== JSON.stringify(s.tplItems)) return [];
    const out = [], seen = [];
    let anchor = -1;
    for (const it of s.items) {
      if (it.ti === undefined || it.ti === null) {
        const ex = exById(state, it.ex);
        out.push({ k: 'add', ex: it.ex, after: anchor, n: Math.max(1, it.sets.filter(filled).length), on: true, ...(ex && ex.type === 'done' ? { n: 1 } : {}) });
        continue;
      }
      anchor = it.ti; seen.push(it.ti);
      const ti = t.items[it.ti]; if (!ti) continue;
      if (it.skip) { out.push({ k: 'skip', ti: it.ti, ex: ti.ex, on: false }); continue; }
      if (it.from) out.push({ k: 'swap', ti: it.ti, ex: it.ex, old: ti.ex, on: true });
      const ex = exById(state, it.ex);
      if (ex && ex.type !== 'done') {
        const n = it.sets.filter(filled).length;
        if (n > 0 && n !== ti.sets) out.push({ k: 'sets', ti: it.ti, ex: it.ex, n, old: ti.sets, on: n > ti.sets });
      }
    }
    if (seen.some((v, i) => i && v < seen[i - 1])) out.push({ k: 'order', on: false });
    return out;
  }
  // Ausgewählte Abweichungen in die Vorlage übernehmen
  function tplApply(state, s, sel) {
    const t = tplOf(state, s.tpl); if (!t) return false;
    const items = t.items.map(x => ({ ...x })), drop = new Set();
    for (const c of sel) {
      if (c.k === 'swap') { items[c.ti].ex = c.ex; items[c.ti].note = ''; }
      if (c.k === 'sets') items[c.ti].sets = c.n;
      if (c.k === 'skip') drop.add(c.ti);
    }
    const seq = sel.some(c => c.k === 'order') ? s.items.filter(it => it.ti !== undefined && it.ti !== null).map(it => it.ti) : items.map((_, i) => i);
    const adds = sel.filter(c => c.k === 'add');
    const out = [];
    for (const c of adds.filter(c => c.after < 0)) out.push({ ex: c.ex, sets: c.n, note: '' });
    for (const i of seq) {
      if (!drop.has(i)) out.push(items[i]);
      for (const c of adds.filter(c => c.after === i)) out.push({ ex: c.ex, sets: c.n, note: '' });
    }
    t.items = out;
    return true;
  }
  // Hinweis bei großem Sprung: mehr als 10 % über dem letzten Arbeitsgewicht und mehr als ein Schritt
  function capLimit(state, exId, sess) {
    const ex = exById(state, exId); if (!ex || !LOADED[ex.type] || ex.type === 'assist') return null;
    const h = progHist(state, ex, sess).filter(x => x.w && isNum(x.w.load) && x.w.load > 0);
    if (!h.length) return null;
    const W = h[h.length - 1].w.load, st = progCfg(state, ex).step;
    return Math.max(rnd(W * (1 + PROG.cap), 0.01), rnd(W + st, 0.01));
  }

  const secTxt = v => v >= 60 && v % 60 === 0 ? v / 60 + ' Min.' : v + ' Sek.';
  function groupRuns(arr) { const out = []; for (const v of arr) { const g = out[out.length - 1]; if (g && g[0] === v) g[1]++; else out.push([v, 1]); } return out; }
  function repsText(r) { r = r.filter(x => x !== null && x !== undefined); if (!r.length) return ''; return r.every(x => x === r[0]) ? `${r.length}×${r[0]}` : r.join('/'); }

  const api = {
    pad, iso, parseDay, addDays, diffDays, weekStart, monthStart, monthEnd, yearStart, quarterStart, todayStr, nowLocal, dayRange,
    num, fmt, fmtW, emptyState, validate, PHASES, T, dailyFirst, avg30, weightStatus, thresholds, navyFat, measurementDue,
    checkedDays, habitStats, targetAt, tempo, forecast, lockState, goalProgress, daysInYear, checkGoals, weekCount, TYPES, CATS, exById, nextNum, trainings, lastItem, pauseFor, setSummary,
    METRICS, metricValues, exHistory, repRecords,
    MUSCLES, RADAR, EQUIP, EQUIP_OFF, CATALOG, catByKey, low, adopt, adoptedRef, migrateCatalog, matches, parseTime, timeInput, timeTxt,
    trainStats, radarOf, records, weekStreak, sessMin, counted, diffOf, shares,
    HARD, addMonths, winQuota, passes, bufferInfo, hardStatus, hardBound, diffGate, activeCount, activateBlock, tickHard, hardViolations, migrateHard,
    PROG, LOADED, progable, perfKey, PERF_UNIT, stepDefault, progDefaultOn, workSets, progHist, progDerive, progStd, progCfg, settleProg, progFor, backLoad, stepUp, stepDown,
    VAC_BACK, vacSet, offDays, vacOn, weekOff, vacCheck, winFrom, minEnd, hardFrom,
    LETTERS, tplOf, rotTemplates, tplLetter, rotation, tplLast, filled, tplDiff, tplApply, capLimit
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
