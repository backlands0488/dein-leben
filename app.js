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

  let S = load();
  const ui = { tab: 'heute', stack: [], sheet: null, range: '3M', cal: {} };

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
    if (!S) { $app.innerHTML = viewWelcome(); return; }
    const t = top();
    let html;
    if (t) html = `<main>${SCREENS[t.name](t)}</main>`;
    else html = `<main>${TABS[ui.tab]()}</main>${tabbar()}`;
    if (ui.sheet) html += `<div class="scrim" data-act="closeSheet"><div class="sheet" data-stop>${SHEETS[ui.sheet.name](ui.sheet)}</div></div>`;
    $app.innerHTML = html;
    const ps = document.getElementById('persist');
    if (ps && navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { ps.textContent = p ? 'Dauerhafter Speicher ist aktiv.' : 'Dauerhafter Speicher ist nicht bestätigt. Regelmäßige Backups sind deshalb besonders wichtig.'; });
    else if (ps) ps.textContent = '';
  }
  function tabbar() {
    const b = (id, ic, l) => `<button data-act="tab" data-arg="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}><span class="ic">${ic}</span>${l}</button>`;
    return `<nav class="tabs">${b('heute', '◎', 'Heute')}${b('training', '▤', 'Training')}${b('gewicht', '◢', 'Gewicht')}${b('mehr', '⋯', 'Mehr')}</nav>`;
  }

  function viewWelcome() {
    return `<main class="welcome"><div class="big">Dein Leben</div>
      <p class="sub">Gewohnheiten, Gewicht und Training an einem Ort. Alles bleibt auf diesem Handy.</p>
      <label class="btn primary block" style="display:grid;place-items:center;margin:0 0 10px">Importdatei oder Backup laden
        <input type="file" accept=".json,application/json" data-change="restore" hidden></label>
      <button class="btn ghost block" data-act="startEmpty">Ohne Daten beginnen</button></main>`;
  }

  // ===== HEUTE =====
  function viewHeute() {
    const d = today();
    const ws = C.weightStatus(S.weights, d);
    let out = `<h1>${DAYS[C.parseDay(d).getDay()]}</h1><p class="sub">${C.parseDay(d).getDate()}. ${MONTHS[C.parseDay(d).getMonth()]} ${d.slice(0, 4)}</p>`;
    for (const [i, n] of (S.notices || []).entries()) out += `<div class="notice good row"><span class="grow">${esc(n)}</span><button class="btn sm ghost" data-act="dismiss" data-arg="${i}">OK</button></div>`;
    const running = S.sessions.find(s => s.kind === 'training' && !s.done);
    if (running) out += `<button class="notice due row" style="width:100%;border:0;text-align:left" data-act="open" data-arg="session:${running.id}"><span class="grow">Einheit #${C.pad(running.num).padStart(3, '0')} läuft noch</span><b>Fortsetzen</b></button>`;
    if (ws.due) out += `<div class="notice due"><div class="row between"><span>Wiegen fällig · ${C.PHASES[ws.phase].rhythm}</span></div>
      <div class="row" style="margin-top:10px"><input type="text" inputmode="decimal" placeholder="kg" id="quickKg" aria-label="Gewicht in kg"><button class="btn primary" data-act="quickWeight">Speichern</button></div></div>`;
    if (S.settings.heightCm && C.measurementDue(S.measurements, d)) out += `<button class="notice due row" style="width:100%;border:0;text-align:left" data-act="open" data-arg="measure"><span class="grow">Umfänge messen: neues Quartal</span><b>Messen</b></button>`;
    const days = S.lastBackup ? C.diffDays(S.lastBackup.slice(0, 10), d) : null;
    if (days === null || days > 14) out += `<button class="notice row" style="width:100%;border:0;text-align:left;color:var(--mu)" data-act="tab" data-arg="mehr"><span class="grow">${days === null ? 'Noch kein Backup erstellt' : `Letztes Backup vor ${days} Tagen`}</span><b>Sichern</b></button>`;
    const active = S.habits.filter(h => !h.archived);
    if (!active.length) out += `<div class="card"><p class="muted" style="margin:0 0 12px">Lege deine erste Gewohnheit an.</p><button class="btn primary" data-act="open" data-arg="habitEdit">Gewohnheit anlegen</button></div>`;
    out += active.map(habitCard).join('');
    return out;
  }
  function habitCard(h) {
    const d = today(), st = C.habitStats(S, h, d), ws = C.weekStart(d);
    const on = st.days.has(d);
    const dots = WD.map(w => `<span class="dl">${w}</span>`).join('') + WD.map((_, i) => {
      const day = C.addDays(ws, i); const fut = day > d, before = day < h.start;
      const cls = ['dot', st.days.has(day) ? 'on' : '', day === d ? 'today' : '', fut ? 'future' : '', before ? 'before' : ''].join(' ');
      const dis = fut || before || h.link === 'sport';
      return `<button class="${cls}" ${dis ? 'disabled' : ''} data-act="toggle" data-arg="${h.id}:${day}" aria-label="${day}${st.days.has(day) ? ' erledigt' : ''}"></button>`;
    }).join('');
    const prog = h.type === 'weekly' ? `${st.week.n}/${st.week.t} diese Woche` : `${on ? 1 : 0}/1 heute`;
    const streak = h.type === 'weekly' ? `${st.cur} ${st.cur === 1 ? 'Woche' : 'Wochen'} in Folge` : `${st.cur} ${st.cur === 1 ? 'Tag' : 'Tage'} in Folge`;
    return `<div class="habit" style="--hc:${h.color}">
      <button class="hab-ico ${on ? 'on' : ''}" data-act="${h.link === 'sport' ? 'sportSheet' : 'toggle'}" data-arg="${h.id}:${d}" aria-label="${esc(h.name)} heute abhaken">${esc(h.emoji)}</button>
      <div><button class="hab-name" data-act="open" data-arg="habit:${h.id}">${esc(h.name)}</button>
      <div class="dots">${dots}</div>
      <div class="hab-meta"><span class="chip">${prog}</span><span class="chip">${streak}</span><span class="chip">🏆 ${st.total}</span></div></div></div>`;
  }

  // ===== GEWOHNHEIT DETAIL =====
  function screenHabit({ id }) {
    const h = S.habits.find(x => x.id === id); if (!h) return header('Nicht gefunden');
    const d = today(), st = C.habitStats(S, h, d);
    const unit = h.type === 'weekly' ? 'Wochen' : 'Tage';
    let goal = '';
    if (h.link === 'weightgoal' && h.goal) {
      const ws = C.weightStatus(S.weights, d);
      goal = `<div class="card"><div class="muted small">30-Tage-Durchschnitt</div><div class="big num">${C.fmt(ws.avg)} kg</div>
        <p class="muted" style="margin:8px 0 0">${ws.avg !== null && ws.avg > h.goal.kg ? `Noch ${C.fmt(ws.avg - h.goal.kg)} kg bis ${C.fmt(h.goal.kg)} kg. ` : ''}Stichtag ${dNum(h.goal.deadline)}, noch ${Math.max(0, C.diffDays(d, h.goal.deadline))} Tage.</p></div>`;
    }
    const tNow = C.targetAt(h, C.weekStart(d));
    const kind = h.link === 'sport' ? `${tNow}× pro Woche. Wird automatisch durch Trainings und Bewegung ab 60 Min. abgehakt.` : (h.type === 'weekly' ? `${tNow}× pro Woche.` : (h.kind === 'verzicht' ? 'Täglich bestätigen (Verzicht)' : 'Täglich'));
    const q = (lbl, v, w) => `<div class="stat"><b class="num">${v}</b><span>${lbl}</span>${w ? `<span class="faint"> · ${w}</span>` : ''}</div>`;
    const wk = h.type === 'weekly' ? `${st.week.n}/${st.week.t}` : pct(st.week);
    const mo = st.month ? `${pct(st.month)}` : '–', yr = st.year ? pct(st.year) : '–';
    return `${header(esc(h.emoji) + ' Gewohnheit', `<button class="btn sm ghost" data-act="open" data-arg="habitEdit:${h.id}">Bearbeiten</button>`)}
      <div style="--hc:${h.color}">
      <h2 style="margin-top:6px">${esc(h.name)}</h2>
      <p class="muted" style="margin:-4px 0 16px">${kind} Seit ${dNum(h.start)}.${h.archived ? ` Archiviert${h.result ? ' (' + h.result + ')' : ''}.` : ''}</p>
      ${goal}
      <div class="stats">${q('Insgesamt', st.total)}${q('Aktuelle Serie', st.cur, unit)}${q('Beste Serie', st.best, unit)}</div>
      <h2>Quote</h2>
      <div class="stats">${q('Woche', wk)}${q('Monat', mo)}${q('Jahr', yr)}</div>
      ${h.type === 'weekly' ? '<p class="faint small">Monat und Jahr: Anteil der Wochen mit erreichtem Ziel.</p>' : ''}
      <h2>Kalender</h2>${calendar(h, st)}
      <h2>${(ui.cal[h.id + 'y'] || d.slice(0, 4))}</h2>${heatmap(h, st, ui.cal[h.id + 'y'] || d.slice(0, 4))}
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
      <div class="cal">${cells}</div>${h.link === 'sport' ? '<p class="faint small">Tage ergeben sich aus deinen Trainings. Nachtragen über Training.</p>' : '<p class="faint small">Tippe auf einen Tag, um ihn nachzutragen oder zu entfernen.</p>'}`;
  }
  function heatmap(h, st, y) {
    const start = C.weekStart(`${y}-01-01`), end = `${y}-12-31`, cell = 11, gap = 2;
    let x = 0, rects = '';
    for (let w = start; w <= end; w = C.addDays(w, 7), x++) {
      for (let i = 0; i < 7; i++) {
        const day = C.addDays(w, i); if (day.slice(0, 4) !== y) continue;
        const on = st.days.has(day);
        rects += `<rect x="${x * (cell + gap)}" y="${i * (cell + gap)}" width="${cell}" height="${cell}" rx="2.5" fill="${on ? h.color : '#2C2930'}"/>`;
      }
    }
    const W = x * (cell + gap), H = 7 * (cell + gap);
    const py = String(Number(y) - 1), ny = String(Number(y) + 1);
    return `<svg class="heat" viewBox="0 0 ${W} ${H}" role="img" aria-label="Jahresübersicht ${y}">${rects}</svg>
      <div class="row between" style="margin-top:8px"><button class="btn sm ghost" data-act="year" data-arg="${h.id}:${py}">${py}</button>
      <span class="faint small">${[...st.days].filter(d => d.startsWith(y)).length} Tage in ${y}</span>
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
    const d = today();
    const pauses = S.pauses.filter(p => !p.to || p.to >= d);
    let out = `<h1>Training</h1><p class="sub">${C.trainings(S).filter(s => s.date.startsWith(d.slice(0, 4))).length} Einheiten in ${d.slice(0, 4)}</p>
      <div class="row" style="margin:0 0 12px"><button class="btn primary grow" data-act="sheet" data-arg="startTraining">Einheit starten</button><button class="btn grow" data-act="newMove">Bewegung eintragen</button></div>`;
    for (const p of pauses) out += `<div class="notice row"><span class="grow">${esc(p.cat)}übungen pausiert seit ${dNum(p.from)}</span><button class="btn sm ghost" data-act="endPause" data-arg="${p.id}">Beenden</button></div>`;
    const list = [...S.sessions].sort((a, b) => (b.date + C.pad(b.num || 0)).localeCompare(a.date + C.pad(a.num || 0)));
    let month = '';
    for (const s of list.slice(0, ui.trainMore ? 9999 : 40)) {
      const m = s.date.slice(0, 7);
      if (m !== month) { month = m; out += `<h2>${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}</h2>`; }
      if (s.kind === 'move') {
        out += `<button class="list-item" data-act="open" data-arg="move:${s.id}"><span class="n" style="color:var(--sage)">${s.min} Min.</span><span class="grow"><b>${esc(s.activity)}</b><br><span class="muted small">${dShort(s.date)}${s.min >= 60 ? ' · zählt für Sport' : ''}</span></span></button>`;
      } else {
        const names = s.items.map(i => (C.exById(S, i.ex) || { name: '?' }).name).join(', ');
        out += `<button class="list-item" data-act="open" data-arg="session:${s.id}"><span class="n num">#${String(s.num).padStart(3, '0')}</span><span class="grow"><b>${dShort(s.date)}</b>${s.done ? '' : ' <span class="badge pause">läuft</span>'}<br><span class="muted small">${esc(names) || 'Noch keine Übungen'}</span></span></button>`;
      }
    }
    if (list.length > 40 && !ui.trainMore) out += `<button class="btn ghost block" style="margin-top:12px" data-act="trainMore">Alle ${list.length} Einträge zeigen</button>`;
    if (!list.length) out += `<p class="muted">Noch keine Einheiten. Starte deine erste.</p>`;
    return out;
  }
  const FIELDS = {
    weight: [['w', 'kg'], ['r', 'Wdh.']], assist: [['w', 'Hilfe kg'], ['r', 'Wdh.']], reps: [['r', 'Wdh.']],
    time: [['s', 'Sek.']], cardio: [['min', 'Min.'], ['kmh', 'km/h'], ['incl', 'Steig.'], ['km', 'km']], sled: [['w', 'kg'], ['m', 'Meter']]
  };
  function screenSession({ id }) {
    const s = S.sessions.find(x => x.id === id); if (!s) return header('Nicht gefunden');
    let out = header(`Einheit #${String(s.num).padStart(3, '0')}`, s.done ? '' : `<button class="btn sm primary" data-act="finish" data-arg="${s.id}">Abschließen</button>`);
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
    const lastTxt = last ? `Zuletzt ${dShort(last.session.date)}: ${esc(C.setSummary(ex, last.item.sets))}${last.item.note ? ' – ' + esc(last.item.note) : ''}` : 'Zum ersten Mal';
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
      <span>${paused ? '<span class="badge pause">pausiert</span> ' : ''}<span class="badge">${esc(ex.cat)}</span></span></div>
      <p class="last">${lastTxt}</p>${body}
      <input type="text" style="margin-top:10px;min-height:40px;font-size:14px" placeholder="Notiz zur Übung" value="${esc(it.note || '')}" data-input="itemNote" data-arg="${s.id}:${idx}">
      <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn sm ghost" data-act="moveItem" data-arg="${s.id}:${idx}:-1" aria-label="Nach oben">↑</button><button class="btn sm ghost" data-act="moveItem" data-arg="${s.id}:${idx}:1" aria-label="Nach unten">↓</button><button class="btn sm danger" data-act="delItem" data-arg="${s.id}:${idx}">Entfernen</button></div></div>`;
  }
  function screenMove({ id }) {
    const m = S.sessions.find(x => x.id === id); if (!m) return header('Nicht gefunden');
    return `${header('Bewegung')}
      <label class="f"><span>Datum</span><input type="date" value="${m.date}" data-change="moveField" data-arg="${m.id}:date"></label>
      <label class="f"><span>Aktivität</span><input type="text" value="${esc(m.activity)}" list="acts" data-input="moveField" data-arg="${m.id}:activity" placeholder="Spaziergang"></label>
      <datalist id="acts"><option>Spaziergang</option><option>Wandern</option><option>Radfahren</option><option>Schwimmen</option></datalist>
      <label class="f"><span>Dauer in Minuten (ab 60 zählt es für Sport)</span><input type="text" inputmode="numeric" value="${m.min || ''}" data-input="moveField" data-arg="${m.id}:min"></label>
      <label class="f"><span>Notiz</span><input type="text" value="${esc(m.note || '')}" data-input="moveField" data-arg="${m.id}:note"></label>
      <button class="btn primary block" data-act="back">Fertig</button><div style="height:10px"></div>
      <button class="btn danger block" data-act="deleteSession" data-arg="${m.id}">Löschen</button>`;
  }
  function screenExercises() {
    let out = header('Übungen', `<button class="btn sm ghost" data-act="open" data-arg="exEdit">Neu</button>`);
    for (const cat of C.CATS) {
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
      <div class="fields"><label class="f"><span>Kategorie</span><select id="eCat">${C.CATS.map(c => `<option ${c === e.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="f"><span>Messart</span><select id="eType">${Object.entries(C.TYPES).map(([k, v]) => `<option value="${k}" ${k === e.type ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <label class="check" style="margin:0 0 18px"><input type="checkbox" id="eUni" ${e.uni ? 'checked' : ''}> Einseitig (Gewicht pro Hantel, Wdh. pro Seite)</label>
      <button class="btn primary block" data-act="saveEx" data-arg="${id || ''}:${sessionId || ''}">Speichern</button>
      ${id && !used ? `<div style="height:10px"></div><button class="btn danger block" data-act="deleteEx" data-arg="${id}">Löschen</button>` : ''}
      ${used ? '<p class="faint small">Diese Übung kommt in Einheiten vor und kann deshalb nicht gelöscht werden.</p>' : ''}`;
  }
  function screenPauses() {
    const d = today();
    let out = header('Pausen');
    out += `<p class="muted">Pausierte Kategorien erscheinen in Einheiten markiert. Du beendest eine Pause selbst.</p>`;
    for (const p of [...S.pauses].reverse()) out += `<div class="card row between"><span><b>${esc(p.cat)}</b><br><span class="muted small">${dNum(p.from)} – ${p.to ? dNum(p.to) : 'offen'}</span></span>${!p.to || p.to >= d ? `<button class="btn sm ghost" data-act="endPause" data-arg="${p.id}">Beenden</button>` : ''}</div>`;
    out += `<h2>Neue Pause</h2><div class="fields"><select id="pCat">${C.CATS.map(c => `<option>${c}</option>`).join('')}</select><button class="btn primary" data-act="addPause">Pausieren</button></div>`;
    return out;
  }

  // ===== GEWICHT =====
  function viewGewicht() {
    const d = today(), ws = C.weightStatus(S.weights, d), th = C.thresholds(ws.phase);
    const lastNavy = [...S.measurements].sort((a, b) => b.t.localeCompare(a.t))[0];
    let out = `<h1>Gewicht</h1><p class="sub">${C.PHASES[ws.phase].label}: ${C.PHASES[ws.phase].rhythm}</p>
      <div class="card"><div class="muted small">30-Tage-Durchschnitt</div><div class="big num">${C.fmt(ws.avg)} <span style="font-size:22px">kg</span></div>
      <div class="phase" aria-hidden="true"><i class="${ws.phase >= 1 ? 'on' : ''}"></i><i class="${ws.phase >= 2 ? 'on' : ''}"></i><i class="${ws.phase >= 3 ? 'on' : ''}"></i></div>
      <p class="muted small" style="margin:10px 0 0">${[th.down ? 'Weiter: ' + th.down : '', th.up ? 'Zurück: ' + th.up : ''].filter(Boolean).join('<br>')}</p></div>
      <div class="card"><div class="row"><input type="text" inputmode="decimal" placeholder="kg" id="wKg" aria-label="Gewicht in kg"><button class="btn primary" data-act="addWeight">Speichern</button></div>
      <details style="margin-top:10px"><summary class="muted small">Für anderen Zeitpunkt eintragen</summary><input type="datetime-local" id="wWhen" style="margin-top:8px" value="${C.nowLocal()}"></details>
      <p class="faint small" style="margin:10px 0 0">${ws.due ? 'Heute fällig.' : `Nächste Messung fällig ${ws.phase === 1 ? 'morgen' : ws.phase === 2 ? 'ab Montag' : 'ab dem 1. des nächsten Monats'}.`} Für den Durchschnitt zählt die erste Messung eines Tages.</p></div>
      <div class="row between" style="margin:24px 0 0"><h2 style="margin:0">Verlauf</h2><div class="seg">${['3M', '1J', 'Alle'].map(r => `<button aria-pressed="${ui.range === r}" data-act="range" data-arg="${r}">${r}</button>`).join('')}</div></div>
      ${chart(ws, d)}
      <p class="faint small">Punkte: Tageswerte. Linie: 30-Tage-Durchschnitt. Gestrichelt: 99, 88 und 85 kg.</p>
      <h2>Körperfett (Navy)</h2>
      <div class="card">${lastNavy ? `<div class="big num">${C.fmt(lastNavy.fat)} <span style="font-size:22px">%</span></div><p class="muted small" style="margin:6px 0 12px">Gemessen am ${dNum(lastNavy.t)}: Hals ${C.fmt(lastNavy.neck)} cm, Bauch ${C.fmt(lastNavy.waist)} cm</p>` : '<p class="muted" style="margin:0 0 12px">Noch keine Navy-Messung.</p>'}
      <button class="btn block" data-act="open" data-arg="measure">Umfänge eintragen</button></div>
      <h2>Einträge</h2>${weightTable(12)}<button class="btn ghost block" data-act="open" data-arg="weights">Alle ${S.weights.length} Einträge</button>`;
    return out;
  }
  function weightTable(n) {
    const list = [...S.weights].sort((a, b) => b.t.localeCompare(a.t)).slice(0, n);
    return `<table class="t num">${list.map(w => `<tr><td>${dShort(w.t)} <span class="faint small">${w.t.slice(11, 16)}</span>${w.src === 'alt' ? ' <span class="badge">alte App</span>' : ''}</td><td>${w.fat ? `<span class="faint small">${C.fmt(w.fat)} %</span> ` : ''}<b>${C.fmt(w.kg)}</b> kg <button class="btn sm ghost" style="min-height:30px;padding:2px 8px;margin-left:6px" data-act="delWeight" data-arg="${w.t}:${w.kg}" aria-label="Eintrag löschen">×</button></td></tr>`).join('')}</table>`;
  }
  function chart(ws, d) {
    if (!ws.daily.length) return '<p class="muted">Noch keine Werte.</p>';
    const from = ui.range === '3M' ? C.addDays(d, -91) : ui.range === '1J' ? C.addDays(d, -365) : ws.daily[0].d;
    const pts = ws.daily.filter(x => x.d >= from);
    const avg = [];
    const step = ui.range === 'Alle' ? 3 : 1;
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
    for (let v = Math.ceil(lo / stepY) * stepY; v <= hi; v += stepY) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2C2930"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#76707A">${v}</text>`;
    for (const ref of [99, 88, 85]) if (ref >= lo && ref <= hi) g += `<line x1="${L}" x2="${W - R}" y1="${Y(ref)}" y2="${Y(ref)}" stroke="#E3B66F" stroke-dasharray="5 5" stroke-width="1.2"/>`;
    // Monatsmarken
    let mk = C.monthStart(C.addDays(from, 31)), lastLabel = -99;
    while (mk <= d) { const x = X(mk); if (x - lastLabel > 46) { g += `<text x="${x}" y="${H - 6}" font-size="11" fill="#76707A" text-anchor="middle">${MONTHS[Number(mk.slice(5, 7)) - 1].slice(0, 3)}${mk.slice(5, 7) === '01' ? ' ' + mk.slice(2, 4) : ''}</text>`; lastLabel = x; } mk = C.monthStart(C.addDays(C.monthEnd(mk), 1)); }
    const dots = pts.map(p => `<circle cx="${X(p.d).toFixed(1)}" cy="${Y(p.kg).toFixed(1)}" r="${pts.length > 150 ? 1.4 : 2.2}" fill="#8FB3A0" fill-opacity=".45"/>`).join('');
    const line = avg.map((a, k) => `${k ? 'L' : 'M'}${X(a.d).toFixed(1)},${Y(a.kg).toFixed(1)}`).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf">${g}${dots}<path d="${line}" fill="none" stroke="#8FB3A0" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  }
  function screenWeights() { return header('Alle Einträge') + weightTable(99999); }
  function screenMeasure() {
    const h = S.settings.heightCm;
    return `${header('Umfänge messen')}
      <p class="muted">Navy-Methode: Hals knapp unter dem Kehlkopf, Bauch auf Nabelhöhe. Immer gleich messen, dann ist der Verlauf aussagekräftig. Der Wert ist eine Schätzung mit einigen Prozentpunkten Unsicherheit.</p>
      ${h ? '' : `<label class="f"><span>Körpergröße in cm</span><input type="text" inputmode="decimal" id="mH" placeholder="188"></label>`}
      <div class="fields"><label class="f"><span>Hals (cm)</span><input type="text" inputmode="decimal" id="mNeck" data-input="navyPreview"></label>
      <label class="f"><span>Bauch (cm)</span><input type="text" inputmode="decimal" id="mWaist" data-input="navyPreview"></label></div>
      <label class="f"><span>Datum</span><input type="date" id="mDate" value="${today()}"></label>
      <p class="big num" id="navyOut" style="font-size:34px;margin:6px 0 18px">– %</p>
      <button class="btn primary block" data-act="saveMeasure">Speichern</button>
      ${S.measurements.length ? `<h2>Bisherige Messungen</h2><table class="t num">${[...S.measurements].sort((a, b) => b.t.localeCompare(a.t)).map(m => `<tr><td>${dNum(m.t)} <span class="faint small">Hals ${C.fmt(m.neck)}, Bauch ${C.fmt(m.waist)}</span></td><td><b>${C.fmt(m.fat)} %</b> <button class="btn sm ghost" style="min-height:30px;padding:2px 8px" data-act="delMeasure" data-arg="${m.t}" aria-label="Messung löschen">×</button></td></tr>`).join('')}</table>` : ''}`;
  }

  // ===== MEHR =====
  function viewMehr() {
    const bk = S.lastBackup ? `Letztes Backup: ${dNum(S.lastBackup)}` : 'Noch kein Backup erstellt.';
    return `<h1>Mehr</h1><p class="sub">Daten, Einstellungen und Verwaltung</p>
      <h2>Backup</h2><div class="card"><p class="muted" style="margin:0 0 12px">${bk} Deine Daten liegen nur auf diesem Handy. Ein Backup schützt sie, falls Chrome-Daten gelöscht werden.</p>
      <button class="btn primary block" data-act="backup">Backup speichern</button>
      ${navigator.canShare ? '<div style="height:10px"></div><button class="btn block" data-act="shareBackup">Backup teilen (z. B. in Google Drive)</button>' : ''}
      <div style="height:10px"></div><label class="btn ghost block" style="display:grid;place-items:center">Backup wiederherstellen<input type="file" accept=".json,application/json" data-change="restore" hidden></label>
      <p class="faint small" style="margin:10px 0 0">Wiederherstellen ersetzt alle Daten in der App durch die Datei.</p></div>
      <h2>Verwalten</h2>
      <button class="pick" data-act="open" data-arg="habits"><span>Gewohnheiten</span><span class="faint">${S.habits.length} ›</span></button>
      <button class="pick" data-act="open" data-arg="exercises"><span>Übungen</span><span class="faint">${S.exercises.length} ›</span></button>
      <button class="pick" data-act="open" data-arg="pauses"><span>Pausen</span><span class="faint">${S.pauses.filter(p => !p.to).length} aktiv ›</span></button>
      <h2>Einstellungen</h2>
      <label class="f"><span>Körpergröße in cm (für die Navy-Methode)</span><input type="text" inputmode="decimal" value="${S.settings.heightCm || ''}" data-change="height"></label>
      <p class="faint small" id="persist">Speicherstatus wird geprüft …</p>
      <p class="faint small">Dein Leben, Version 1.0.1</p>`;
  }
  function screenHabits() {
    const row = h => `<button class="pick" data-act="open" data-arg="habit:${h.id}"><span>${esc(h.emoji)} ${esc(h.name)}</span><span class="faint small">${h.archived ? 'archiviert' : ''} ›</span></button>`;
    const a = S.habits.filter(h => !h.archived), z = S.habits.filter(h => h.archived);
    return header('Gewohnheiten', `<button class="btn sm ghost" data-act="open" data-arg="habitEdit">Neu</button>`) + a.map(row).join('') + (z.length ? `<h2>Archiviert</h2>${z.map(row).join('')}` : '');
  }

  const TABS = { heute: viewHeute, training: viewTraining, gewicht: viewGewicht, mehr: viewMehr };
  const SCREENS = { habit: screenHabit, habitEdit: screenHabitEdit, session: screenSession, move: screenMove, exercises: screenExercises, exEdit: screenExEdit, pauses: screenPauses, weights: screenWeights, measure: screenMeasure, habits: screenHabits };

  // ---------- Sheets ----------
  const SHEETS = {
    sport: ({ date }) => `<h3>Sport am ${dNum(date)}</h3>
      <button class="btn primary block" data-act="startTraining" data-arg="repeat:${date}">Letzte Einheit wiederholen</button>
      <button class="btn block" data-act="startTraining" data-arg="empty:${date}">Leer starten</button>
      <button class="btn block" data-act="newMove" data-arg="${date}">Bewegung eintragen</button>
      <button class="btn ghost block" data-act="closeSheet">Abbrechen</button>`,
    startTraining: () => SHEETS.sport({ date: today() }).replace(/<h3>.*<\/h3>/, '<h3>Einheit starten</h3>'),
    picker: ({ sid }) => {
      const s = S.sessions.find(x => x.id === sid);
      let out = `<h3>Übung hinzufügen</h3>`;
      for (const cat of C.CATS) {
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
    tab: a => { ui.tab = a; ui.stack = []; render(); window.scrollTo(0, 0); },
    back: () => pop(),
    open: a => { const [n, ...rest] = a.split(':'); const v = rest.join(':');
      if (n === 'habit' || n === 'session' || n === 'move' || n === 'habitEdit') { ui.draftColor = null; push(n, { id: v || null }); }
      else if (n === 'exEdit') { const [id, sid] = v.split(':'); push('exEdit', { id: id || null, sessionId: sid || null }); }
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
    finish: a => { const s = S.sessions.find(x => x.id === a); s.done = true; s.endedAt = C.nowLocal(); save(); pop(); toast(`Einheit #${String(s.num).padStart(3, '0')} gespeichert`); },
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
    addWeight: () => { const w = document.getElementById('wWhen'); const det = w && w.closest('details'); addWeight(document.getElementById('wKg').value, det && det.open && w.value ? w.value : C.nowLocal()); },
    delWeight: a => { const i = a.lastIndexOf(':'); const t = a.slice(0, i), kg = Number(a.slice(i + 1)); if (!confirm(`Eintrag ${C.fmt(kg)} kg vom ${dNum(t)} löschen?`)) return; const k = S.weights.findIndex(w => w.t === t && w.kg === kg); if (k >= 0) S.weights.splice(k, 1); save(); render(); },
    range: a => { ui.range = a; render(); },
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
          save(); ui.tab = 'heute'; if (ui.stack.length) pop(ui.stack.length); else render(); toast('Daten geladen');
        } catch (e) { toast(e.message || 'Die Datei konnte nicht gelesen werden.'); }
      };
      r.readAsText(f);
    },
    sessDate: (el, a) => { const s = S.sessions.find(x => x.id === a); if (!el.value) return; const y = el.value.slice(0, 4); if (y !== s.date.slice(0, 4)) s.num = C.nextNum(S, y); s.date = el.value; save(); render(); },
    moveField: (el, a) => INPUTS.moveField(el, a),
    itemDone: (el, a) => { const [sid, idx] = a.split(':'); S.sessions.find(x => x.id === sid).items[Number(idx)].done = el.checked; save(); },
    height: el => { const v = C.num(el.value); S.settings.heightCm = v; save(); toast(v ? `Körpergröße ${C.fmt(v, 0)} cm` : 'Körpergröße entfernt'); }
  };

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
