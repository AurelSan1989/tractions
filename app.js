'use strict';

/* ---------- Élastiques (fourchettes fabricant, en kg) ---------- */
const BANDS = [
  { id: 'yellow', name: 'Jaune',  color: '#F2C200', text: '#3a2f00', min: 2,  max: 7 },
  { id: 'red',    name: 'Rouge',  color: '#D93025', text: '#ffffff', min: 7,  max: 16 },
  { id: 'black',  name: 'Noir',   color: '#222222', text: '#ffffff', min: 11, max: 30 },
  { id: 'purple', name: 'Violet', color: '#7B3FBF', text: '#ffffff', min: 16, max: 38 },
  { id: 'green',  name: 'Vert',   color: '#1E8E4E', text: '#ffffff', min: 23, max: 57 },
];
const BAND_ORDER = BANDS.map(b => b.id);

/* ---------- Utilitaires ---------- */
const KEY = 'tractions.v1';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const num = v => (Math.round(v * 10) / 10).toLocaleString('fr-FR');
const fmtKg = v => num(v) + ' kg';
const fmtDate = (d, opt = { day: 'numeric', month: 'short' }) =>
  new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', opt);
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;

/* ---------- Stockage ---------- */
function defaultDb() { return { version: 1, sessions: [], bandKg: {}, draft: null }; }
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.sessions)) return Object.assign(defaultDb(), d);
    }
  } catch (e) { /* stockage indisponible : on repart de zéro */ }
  return defaultDb();
}
let db = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { alert("Impossible d'enregistrer : le stockage du navigateur est indisponible."); }
}

/* ---------- Calculs ---------- */
const bandById = id => BANDS.find(b => b.id === id);
const defaultKg = b => (b.min + b.max) / 2;
const bandKg = id => {
  const v = db.bandKg[id];
  return typeof v === 'number' && isFinite(v) ? v : defaultKg(bandById(id));
};
const sortBands = bands => [...bands].sort((a, b) => BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b));
const assistOf = bands => bands.reduce((s, id) => s + bandKg(id), 0);
const comboKey = bands => sortBands(bands).join('+');
const comboName = key => key ? key.split('+').map(id => bandById(id).name).join(' + ') : 'Sans élastique';
const chips = bands => bands.length
  ? bands.map(id => { const b = bandById(id); return `<span class="chip" style="--c:${b.color}" title="${b.name}"></span>`; }).join('')
  : '<span class="chip chip-none" title="Sans élastique"></span>';

function sessionStats(s) {
  const reps = s.sets.reduce((a, x) => a + x.reps, 0);
  const weighted = s.sets.reduce((a, x) => a + x.reps * assistOf(x.bands), 0);
  return {
    reps,
    avgAssist: reps ? weighted / reps : 0,
    maxReps: Math.max(0, ...s.sets.map(x => x.reps)),
  };
}
const sortedSessions = () =>
  [...db.sessions].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));

/* ---------- UI générique ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

const TITLES = { log: 'Nouvelle séance', stats: 'Progrès', history: 'Historique', settings: 'Réglages' };
let currentTab = 'log';
function showTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + tab));
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render();
  window.scrollTo(0, 0);
}
function render() {
  if (currentTab === 'log') renderLog();
  else if (currentTab === 'stats') renderStats();
  else if (currentTab === 'history') renderHistory();
  else renderSettings();
  $('#title').textContent = currentTab === 'log' && db.draft && db.draft.id ? 'Modifier la séance' : TITLES[currentTab];
}

/* ---------- Saisie d'une séance ---------- */
let sel = new Set();
let reps = 5;

function ensureDraft() {
  if (!db.draft) db.draft = { id: null, date: today(), sets: [], note: '' };
  return db.draft;
}
function initSelection() {
  // Reprend la dernière configuration utilisée pour aller vite
  const d = ensureDraft();
  const last = d.sets[d.sets.length - 1] || (() => {
    const s = sortedSessions().pop();
    return s && s.sets[s.sets.length - 1];
  })();
  if (last) { sel = new Set(last.bands); reps = last.reps; }
}

function renderLog() {
  const d = ensureDraft();
  $('#log-date').value = d.date;
  $('#log-note').value = d.note || '';

  const picker = BANDS.map(b => `
    <button type="button" class="band ${sel.has(b.id) ? 'on' : ''}" data-band="${b.id}"
      style="--c:${b.color};--t:${b.text}" aria-pressed="${sel.has(b.id)}">
      ${b.name}<small>${fmtKg(bandKg(b.id))}</small>
    </button>`).join('') + `
    <button type="button" class="band none ${sel.size ? '' : 'on'}" data-band="" aria-pressed="${!sel.size}">
      Sans<small>0 kg</small>
    </button>`;
  $('#band-picker').innerHTML = picker;

  const bands = sortBands(sel);
  $('#assist-label').innerHTML = bands.length
    ? `${esc(comboName(comboKey(bands)))} · aide ≈ <b>${fmtKg(assistOf(bands))}</b>`
    : '<b>Sans élastique</b> 💪';

  $('#reps').textContent = reps;

  $('#set-count').textContent = d.sets.length ? `(${d.sets.length})` : '';
  $('#set-list').innerHTML = d.sets.length
    ? d.sets.map((s, i) => `
      <li>
        <span class="n">${i + 1}</span>
        <span class="what">${chips(s.bands)}<small>${esc(comboName(comboKey(s.bands)))}</small></span>
        <span class="r">× ${s.reps}</span>
        <button type="button" class="icon-btn" data-del-set="${i}" aria-label="Supprimer la série ${i + 1}">✕</button>
      </li>`).join('')
    : '<li class="empty" style="border:0;background:none;padding:0">Aucune série pour l\'instant.</li>';

  const saveBtn = $('#save-session');
  saveBtn.disabled = !d.sets.length;
  saveBtn.textContent = d.id ? 'Mettre à jour la séance' : 'Enregistrer la séance';
  $('#cancel-edit').hidden = !d.id;
}

$('#band-picker').addEventListener('click', e => {
  const btn = e.target.closest('[data-band]');
  if (!btn) return;
  const id = btn.dataset.band;
  if (!id) sel.clear();
  else if (sel.has(id)) sel.delete(id);
  else sel.add(id);
  renderLog();
});
$('#reps-minus').addEventListener('click', () => { reps = Math.max(1, reps - 1); $('#reps').textContent = reps; });
$('#reps-plus').addEventListener('click', () => { reps = Math.min(99, reps + 1); $('#reps').textContent = reps; });
$('#log-date').addEventListener('change', e => { ensureDraft().date = e.target.value || today(); save(); });
$('#log-note').addEventListener('input', e => { ensureDraft().note = e.target.value; save(); });

$('#add-set').addEventListener('click', () => {
  ensureDraft().sets.push({ bands: sortBands(sel), reps });
  save();
  buzz(25);
  renderLog();
  toast(`Série ${db.draft.sets.length} ajoutée`);
});
$('#set-list').addEventListener('click', e => {
  const btn = e.target.closest('[data-del-set]');
  if (!btn) return;
  db.draft.sets.splice(Number(btn.dataset.delSet), 1);
  save();
  renderLog();
});

$('#save-session').addEventListener('click', () => {
  const d = db.draft;
  if (!d || !d.sets.length) return;
  const session = { id: d.id || uid(), date: d.date || today(), sets: d.sets, note: (d.note || '').trim() };
  const idx = db.sessions.findIndex(s => s.id === d.id);
  if (idx >= 0) {
    db.sessions[idx] = Object.assign({}, db.sessions[idx], session);
  } else {
    session.createdAt = Date.now();
    db.sessions.push(session);
  }
  const wasEdit = idx >= 0;
  db.draft = null;
  save();
  buzz([30, 60, 30]);
  toast(wasEdit ? 'Séance mise à jour' : 'Séance enregistrée 💪');
  showTab(wasEdit ? 'history' : 'stats');
});
$('#cancel-edit').addEventListener('click', () => {
  db.draft = null;
  save();
  initSelection();
  showTab('history');
});

/* ---------- Graphiques SVG ---------- */
function niceMax(v) {
  if (v <= 0) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}
const W = 340, H = 180, M = { l: 34, r: 10, t: 10, b: 24 };

function yAxis(yMax, Y, unit) {
  let out = '';
  for (let i = 0; i <= 4; i++) {
    const v = yMax * i / 4, y = Y(v);
    out += `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${y}" y2="${y}"/>`;
    out += `<text class="axis" x="${M.l - 6}" y="${y + 3}" text-anchor="end">${num(v)}${i === 4 && unit ? ' ' + unit : ''}</text>`;
  }
  return out;
}

function lineChart(points, unit) {
  if (points.length < 2) return '<p class="empty">La courbe apparaîtra après 2 séances.</p>';
  const ts = points.map(p => new Date(p.date + 'T00:00:00').getTime());
  let x0 = Math.min(...ts), x1 = Math.max(...ts);
  if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  const yMax = niceMax(Math.max(...points.map(p => p.y)));
  const X = t => M.l + (t - x0) / (x1 - x0) * (W - M.l - M.r);
  const Y = v => H - M.b - v / yMax * (H - M.t - M.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(ts[i]).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const dots = points.map((p, i) =>
    `<circle class="dot" cx="${X(ts[i]).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="4"><title>${fmtDate(p.date)} : ${fmtKg(p.y)}</title></circle>`).join('');
  const first = points[0].date, last = points[points.length - 1].date;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution de l'aide moyenne">
    ${yAxis(yMax, Y, unit)}
    <path class="line" d="${path}"/>${dots}
    <text class="axis" x="${M.l}" y="${H - 6}" text-anchor="start">${fmtDate(first)}</text>
    <text class="axis" x="${W - M.r}" y="${H - 6}" text-anchor="end">${fmtDate(last)}</text>
  </svg>`;
}

function barChart(points) {
  if (!points.length) return '<p class="empty">Aucune séance pour l\'instant.</p>';
  const pts = points.slice(-30);
  const yMax = niceMax(Math.max(...pts.map(p => p.y)));
  const Y = v => H - M.b - v / yMax * (H - M.t - M.b);
  const slot = (W - M.l - M.r) / pts.length;
  const bw = Math.min(28, slot * 0.7);
  const bars = pts.map((p, i) => {
    const x = M.l + slot * i + (slot - bw) / 2, y = Y(p.y);
    return `<rect class="bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - M.b - y).toFixed(1)}" rx="3"><title>${fmtDate(p.date)} : ${plural(p.y, 'rép.')}</title></rect>`;
  }).join('');
  const first = pts[0].date, last = pts[pts.length - 1].date;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Répétitions par séance">
    ${yAxis(yMax, Y, '')}${bars}
    <text class="axis" x="${M.l}" y="${H - 6}" text-anchor="start">${fmtDate(first)}</text>
    ${pts.length > 1 ? `<text class="axis" x="${W - M.r}" y="${H - 6}" text-anchor="end">${fmtDate(last)}</text>` : ''}
  </svg>`;
}

/* ---------- Tableau de bord ---------- */
function renderStats() {
  const sessions = sortedSessions();
  if (!sessions.length) {
    $('#kpis').innerHTML = '';
    $('#chart-assist').innerHTML = '<p class="empty">Enregistre une première séance pour voir tes progrès.</p>';
    $('#chart-volume').innerHTML = '';
    $('#records').innerHTML = '';
    $('#milestones').innerHTML = '';
    return;
  }
  const stats = sessions.map(s => ({ s, ...sessionStats(s) }));
  const first = stats[0], last = stats[stats.length - 1];
  const totalReps = stats.reduce((a, x) => a + x.reps, 0);
  const bestSet = Math.max(...stats.map(x => x.maxReps));
  const delta = last.avgAssist - first.avgAssist;

  $('#kpis').innerHTML = `
    <div class="kpi"><div class="v">${fmtKg(last.avgAssist)}</div><div class="l">Aide moyenne (dernière)</div>
      ${stats.length > 1 ? `<div class="d ${delta < 0 ? 'good' : ''}">${delta <= 0 ? '−' : '+'}${fmtKg(Math.abs(delta))} depuis le début</div>` : ''}</div>
    <div class="kpi"><div class="v">${sessions.length}</div><div class="l">${sessions.length > 1 ? 'Séances' : 'Séance'}</div>
      <div class="d">depuis le ${fmtDate(first.s.date)}</div></div>
    <div class="kpi"><div class="v">${bestSet}</div><div class="l">Record de rép. en une série</div></div>
    <div class="kpi"><div class="v">${totalReps}</div><div class="l">Tractions au total</div></div>`;

  $('#chart-assist').innerHTML = lineChart(stats.map(x => ({ date: x.s.date, y: x.avgAssist })), 'kg');
  $('#chart-volume').innerHTML = barChart(stats.map(x => ({ date: x.s.date, y: x.reps })));

  // Records par configuration d'élastiques
  const rec = new Map();
  const milestones = [];
  const seen = new Set();
  const repGoals = [5, 10, 15, 20];
  let bestReps = 0;
  for (const { s } of stats) {
    for (const set of s.sets) {
      const key = comboKey(set.bands);
      const r = rec.get(key);
      if (!r || set.reps > r.reps) rec.set(key, { reps: set.reps, date: s.date, bands: set.bands });
      if (!seen.has(key)) {
        seen.add(key);
        milestones.push({
          date: s.date,
          html: key ? `Première série avec ${chips(set.bands)} <b>${esc(comboName(key))}</b>` : '🎉 <b>Première traction sans élastique !</b>',
        });
      }
      for (const g of repGoals) {
        if (set.reps >= g && bestReps < g) milestones.push({ date: s.date, html: `Première série de <b>${g} répétitions</b>` });
      }
      bestReps = Math.max(bestReps, set.reps);
    }
  }
  const recs = [...rec.entries()].sort((a, b) => assistOf(b[1].bands) - assistOf(a[1].bands));
  $('#records').innerHTML = `<div class="records">${recs.map(([key, r]) => `
    <div class="record">
      <span>${chips(r.bands)}</span>
      <span class="name">${esc(comboName(key))}<small>aide ≈ ${fmtKg(assistOf(r.bands))} · ${fmtDate(r.date)}</small></span>
      <span class="r">${plural(r.reps, 'rép')}</span>
    </div>`).join('')}</div>`;

  $('#milestones').innerHTML = milestones.reverse().map(m =>
    `<li><span class="date">${fmtDate(m.date)}</span><span>${m.html}</span></li>`).join('');
}

/* ---------- Historique ---------- */
function renderHistory() {
  const sessions = sortedSessions().reverse();
  if (!sessions.length) {
    $('#history').innerHTML = '<li class="empty" style="border:0;background:none">Aucune séance enregistrée.</li>';
    return;
  }
  $('#history').innerHTML = sessions.map(s => {
    const st = sessionStats(s);
    return `<li>
      <div class="head">
        <span class="date">${esc(fmtDate(s.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }))}</span>
        <span class="meta">${plural(s.sets.length, 'série')} · ${st.reps} rép. · ${fmtKg(st.avgAssist)}</span>
      </div>
      <div class="sets">${s.sets.map(x => `<span class="set">${chips(x.bands)} ×${x.reps}</span>`).join('')}</div>
      ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
      <div class="actions">
        <button type="button" data-edit="${s.id}">Modifier</button>
        <button type="button" class="del" data-delete="${s.id}">Supprimer</button>
      </div>
    </li>`;
  }).join('');
}
$('#history').addEventListener('click', e => {
  const edit = e.target.closest('[data-edit]');
  const del = e.target.closest('[data-delete]');
  if (edit) {
    const s = db.sessions.find(x => x.id === edit.dataset.edit);
    if (!s) return;
    const d = db.draft;
    if (d && d.sets.length && d.id !== s.id &&
        !confirm('Une séance est en cours de saisie. La remplacer par celle-ci ?')) return;
    db.draft = JSON.parse(JSON.stringify({ id: s.id, date: s.date, sets: s.sets, note: s.note || '' }));
    save();
    initSelection();
    showTab('log');
  } else if (del) {
    const s = db.sessions.find(x => x.id === del.dataset.delete);
    if (!s || !confirm(`Supprimer la séance du ${fmtDate(s.date, { day: 'numeric', month: 'long' })} ?`)) return;
    db.sessions = db.sessions.filter(x => x.id !== s.id);
    if (db.draft && db.draft.id === s.id) db.draft = null;
    save();
    renderHistory();
    toast('Séance supprimée');
  }
});

/* ---------- Réglages ---------- */
function renderSettings() {
  $('#band-settings').innerHTML = BANDS.map(b => `
    <div class="band-row">
      <span class="chip" style="--c:${b.color}"></span>
      <span class="name">${b.name}<small>fabricant : ${b.min}–${b.max} kg</small></span>
      <input type="number" inputmode="decimal" step="0.5" min="0" max="100" data-kg="${b.id}" value="${bandKg(b.id)}" aria-label="Aide du ${b.name} en kg">
      <span>kg</span>
    </div>`).join('');
}
$('#band-settings').addEventListener('change', e => {
  const inp = e.target.closest('[data-kg]');
  if (!inp) return;
  const v = parseFloat(String(inp.value).replace(',', '.'));
  if (isFinite(v) && v >= 0) db.bandKg[inp.dataset.kg] = v;
  else delete db.bandKg[inp.dataset.kg];
  save();
  renderSettings();
  toast('Valeur enregistrée');
});
$('#reset-bands').addEventListener('click', () => {
  db.bandKg = {};
  save();
  renderSettings();
  toast('Valeurs par défaut restaurées');
});

$('#export').addEventListener('click', () => {
  const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sessions: db.sessions, bandKg: db.bandKg }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `tractions-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    const valid = d && Array.isArray(d.sessions) && d.sessions.every(s =>
      s && typeof s.date === 'string' && Array.isArray(s.sets) &&
      s.sets.every(x => x && Number.isFinite(x.reps) && Array.isArray(x.bands) && x.bands.every(bandById)));
    if (!valid) throw new Error('format');
    if (!confirm(`Importer ${plural(d.sessions.length, 'séance')} ? Les données actuelles seront remplacées.`)) return;
    db.sessions = d.sessions.map(s => ({ ...s, id: s.id || uid() }));
    db.bandKg = d.bandKg && typeof d.bandKg === 'object' ? d.bandKg : {};
    save();
    toast('Sauvegarde importée');
    showTab('stats');
  } catch (err) {
    alert("Ce fichier n'est pas une sauvegarde valide de l'appli Tractions.");
  }
});
$('#wipe').addEventListener('click', () => {
  if (!confirm('Effacer toutes les séances et réglages ? Cette action est définitive.')) return;
  db = defaultDb();
  save();
  sel = new Set(); reps = 5;
  toast('Données effacées');
  showTab('log');
});

/* ---------- Démarrage ---------- */
document.querySelector('.tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (b) showTab(b.dataset.tab);
});
initSelection();
showTab('log');

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
