'use strict';

/* =========================================================================
   FUNZIONI COMUNI A TUTTE LE PAGINE (menu iniziale e giochi)
   Script classico: le funzioni sono globali e si usano anche da onclick="...".
   Qui stanno anche suoni, vibrazione, finestre e passaggi tra pagine:
   così tutti i giochi suonano e si muovono allo stesso modo.
========================================================================= */

const SHARED_KEYS = {
  PLAYERS: 'cincin_players_v1', // nomi dei giocatori, condivisi tra i giochi
  UPDATES: 'cincin_updates_v1', // ultimo controllo aggiornamenti e ultima versione vista su GitHub
  SETTINGS: 'cincin_settings_v1', // suoni e vibrazione, uguali per tutti i giochi
  LAST_VERSION: 'cincin_last_version_v1' // versione dell'ultimo avvio (per "App aggiornata alla versione X")
};

const UPDATE_API_URL = 'https://api.github.com/repos/Nikcirri/cincin/releases/latest';
const UPDATE_PAGE_URL = 'https://github.com/Nikcirri/cincin/releases/latest';
/** L'app scarica aggiornamenti solo da qui (lo stesso controllo c'è nel plugin Android). */
const UPDATE_APK_PREFIX = 'https://github.com/Nikcirri/cincin/releases/download/';
/** Controllo automatico all'apertura e al ritorno nell'app, al massimo ogni 10 minuti. */
const UPDATE_AUTO_CHECK_MINUTES = 10;

/** Probabilità che una carta o domanda abbia un imprevisto (uguale in tutti i giochi). */
const TWIST_CHANCE = 0.15;

/* ---------- Memoria del telefono (localStorage) ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Memoria piena o non disponibile: il gioco continua, semplicemente non salva.
  }
}

function removeSaved(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

/** Nomi dei giocatori salvati (lista di stringhe, senza doppioni). */
function cleanPlayerNames(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach(item => {
    const name = String(typeof item === 'string' ? item : (item && item.name) || '').trim().slice(0, 18);
    const k = name.toLowerCase();
    if (name && !seen.has(k)) {
      seen.add(k);
      out.push(name);
    }
  });
  return out;
}

function loadSavedPlayerNames() {
  return cleanPlayerNames(loadJSON(SHARED_KEYS.PLAYERS, []));
}

function savePlayerNames(names) {
  saveJSON(SHARED_KEYS.PLAYERS, cleanPlayerNames(names));
}

/* ---------- Impostazioni comuni: suoni e vibrazione ---------- */
let cincinSettings = null;

/** Impostazioni pulite: valori strani diventano quelli di partenza (tutto acceso). */
function sanitizeAppSettings(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  return {
    sound: typeof s.sound === 'boolean' ? s.sound : true,
    haptics: typeof s.haptics === 'boolean' ? s.haptics : true
  };
}

function appSettings() {
  if (!cincinSettings) cincinSettings = sanitizeAppSettings(loadJSON(SHARED_KEYS.SETTINGS, null));
  return cincinSettings;
}

function setAppSetting(name, value) {
  appSettings()[name] = !!value;
  saveJSON(SHARED_KEYS.SETTINGS, appSettings());
}

/* ---------- Utilità ---------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Mescola una copia dell'elenco (Fisher-Yates). random() si può passare per i test. */
function shuffleArray(arr, random) {
  const rnd = typeof random === 'function' ? random : Math.random;
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Sceglie se arriva un imprevisto (uguale per tutti i giochi).
 * Mai due imprevisti di fila; allowed(twist) può escludere quelli che non c'entrano con la carta.
 * Restituisce l'id dell'imprevisto o null.
 */
function pickFromTwists(twists, enabled, previousTwistId, random, allowed) {
  const rnd = typeof random === 'function' ? random : Math.random;
  if (!enabled || previousTwistId) return null;
  if (rnd() >= TWIST_CHANCE) return null;
  const pool = typeof allowed === 'function' ? twists.filter(allowed) : twists;
  if (pool.length === 0) return null;
  const idx = Math.floor(rnd() * pool.length);
  return pool[Math.min(idx, pool.length - 1)].id;
}

/* ---------- Funzioni del telefono (arrivano da src/native.js) ---------- */
function nativeApp() {
  return (typeof window !== 'undefined' && window.CinCinApp) || null;
}

function getAppVersion() {
  const app = nativeApp();
  return app && app.version ? app.version : '0.0.0';
}

function isNativeApp() {
  const app = nativeApp();
  return !!(app && app.isNative);
}

/** Vibrazione: 'short' = tocco leggero (carta girata), 'long' = tempo scaduto. */
function vibrate(kind) {
  if (!appSettings().haptics) return;
  const app = nativeApp();
  if (app && app.isNative && app.vibrate) {
    app.vibrate(kind);
  } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(kind === 'long' ? [300, 120, 300] : 18); } catch (e) {}
  }
}

function openExternalLink(url) {
  const app = nativeApp();
  if (app && app.openExternal) {
    app.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener');
}

/* ---------- Suoni (sintetizzati: niente file audio, uguali in tutti i giochi) ---------- */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** Ogni suono è una piccola sequenza di note: freq di partenza, to = dove scivola, start = ritardo. */
const SOUNDS = {
  tap: [{ freq: 520, to: 700, dur: 0.05, gain: 0.05 }],
  flip: [{ freq: 280, to: 620, dur: 0.12, gain: 0.11 }],
  back: [{ freq: 620, to: 280, dur: 0.12, gain: 0.1 }],
  start: [
    { freq: 392, dur: 0.14, type: 'triangle', gain: 0.12 },
    { freq: 523.25, start: 0.08, dur: 0.14, type: 'triangle', gain: 0.12 },
    { freq: 659.25, start: 0.16, dur: 0.14, type: 'triangle', gain: 0.12 },
    { freq: 783.99, start: 0.24, dur: 0.32, type: 'triangle', gain: 0.13 }
  ],
  twist: [
    { freq: 1046.5, dur: 0.09, type: 'triangle', gain: 0.07 },
    { freq: 1318.5, start: 0.06, dur: 0.09, type: 'triangle', gain: 0.07 },
    { freq: 1568, start: 0.12, dur: 0.09, type: 'triangle', gain: 0.07 },
    { freq: 2093, start: 0.18, dur: 0.28, type: 'triangle', gain: 0.08 }
  ],
  shield: [
    { freq: 440, dur: 0.12, type: 'triangle', gain: 0.15 },
    { freq: 554.37, start: 0.08, dur: 0.12, type: 'triangle', gain: 0.15 },
    { freq: 659.25, start: 0.16, dur: 0.22, type: 'triangle', gain: 0.15 }
  ],
  rule: [
    { freq: 320, to: 480, dur: 0.22, type: 'triangle', gain: 0.13 },
    { freq: 480, to: 640, start: 0.1, dur: 0.22, gain: 0.06 }
  ],
  success: [
    { freq: 659.25, dur: 0.1, type: 'triangle', gain: 0.12 },
    { freq: 880, start: 0.08, dur: 0.22, type: 'triangle', gain: 0.12 }
  ],
  remove: [{ freq: 300, to: 170, dur: 0.13, gain: 0.09 }],
  tick: [{ freq: 880, dur: 0.06, gain: 0.12 }],
  buzzer: [{ freq: 170, to: 125, dur: 0.42, type: 'sawtooth', gain: 0.2 }]
};

function playTone(ctx, note) {
  const t0 = ctx.currentTime + (note.start || 0);
  const dur = note.dur || 0.12;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = note.type || 'sine';
  osc.frequency.setValueAtTime(note.freq, t0);
  if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, t0 + dur);
  // Attacco e coda morbidi: niente "clic" all'inizio e alla fine delle note
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(note.gain || 0.1, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playSound(name) {
  if (!appSettings().sound) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    (SOUNDS[name] || []).forEach(note => playTone(ctx, note));
  } catch (e) {
    // Audio non disponibile: si gioca in silenzio.
  }
}

function toggleSound() {
  setAppSetting('sound', !appSettings().sound);
  renderSoundButtons();
  if (appSettings().sound) {
    playSound('tap');
    showToast('Suoni attivati 🔊', 'info');
  } else {
    showToast('Suoni disattivati 🔇', 'info');
  }
}

/** Aggiorna tutti i pulsanti dei suoni della pagina (classe sound-toggle-btn). */
function renderSoundButtons() {
  if (typeof document === 'undefined') return;
  const on = appSettings().sound;
  document.querySelectorAll('.sound-toggle-btn').forEach(btn => {
    btn.innerHTML = on ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    btn.classList.toggle('text-slate-500', !on);
    btn.setAttribute('aria-label', on ? 'Disattiva i suoni' : 'Attiva i suoni');
  });
}

/* ---------- Finestre (con animazione di apertura e chiusura) ---------- */
function isModalOpen(id) {
  const el = document.getElementById(id);
  return !!el && !el.classList.contains('hidden') && !el.classList.contains('modal-leave');
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  clearTimeout(el._closeTimer);
  el.classList.remove('hidden', 'modal-leave');
  el.classList.remove('modal-enter');
  void el.offsetWidth; // fa ripartire l'animazione
  el.classList.add('modal-enter');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el || el.classList.contains('hidden')) return;
  el.classList.remove('modal-enter');
  el.classList.add('modal-leave');
  clearTimeout(el._closeTimer);
  el._closeTimer = setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('modal-leave');
  }, 160);
}

/* ---------- Passaggio tra le pagine (dissolvenza) ---------- */
function navigateTo(url) {
  document.body.classList.add('page-leave');
  setTimeout(() => { window.location.href = url; }, 140);
}

function goHome() {
  playSound('back');
  navigateTo('./index.html');
}

if (typeof document !== 'undefined' && document.addEventListener) {
  // I link con data-nav (es. i giochi nel menu) passano dalla dissolvenza
  document.addEventListener('click', e => {
    const link = e.target.closest && e.target.closest('a[data-nav]');
    if (!link) return;
    e.preventDefault();
    playSound('tap');
    vibrate('short');
    navigateTo(link.getAttribute('href'));
  });
  // Tornando indietro con la cronologia la pagina deve ricomparire
  window.addEventListener('pageshow', () => document.body.classList.remove('page-leave'));
  document.addEventListener('DOMContentLoaded', renderSoundButtons);
}

/* ---------- Avvisi in alto (al posto di alert) ---------- */
function showToast(message, type = 'info', duration = 2600) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');

  let colorClasses = 'bg-slate-900/95 border-purple-500/50 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]';
  if (type === 'success') {
    colorClasses = 'bg-slate-900/95 border-emerald-400/60 text-emerald-200 shadow-[0_0_20px_rgba(74,222,128,0.3)]';
  } else if (type === 'warning') {
    colorClasses = 'bg-slate-900/95 border-amber-400/60 text-amber-200 shadow-[0_0_20px_rgba(250,204,21,0.3)]';
  } else if (type === 'danger') {
    colorClasses = 'bg-slate-900/95 border-rose-500/60 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.35)]';
  }

  toast.className = `toast-enter px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-300 ${colorClasses}`;
  const span = document.createElement('span');
  span.textContent = message;
  toast.appendChild(span);
  container.appendChild(toast);

  // Al massimo 3 avvisi insieme
  while (container.children.length > 3) container.firstElementChild.remove();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ---------- Imprevisti: lo stesso riquadro giallo in tutti i giochi ---------- */
/** ruleHtml deve essere già sicuro (testo passato da escapeHtml). */
function twistBoxHtml(twist, ruleHtml) {
  return `
    <div class="twist-box animate-twist-in">
      <div class="twist-icon"><i class="fa-solid ${escapeHtml(twist.icon)}"></i></div>
      <div class="min-w-0 text-left">
        <div class="twist-label">Imprevisto</div>
        <div class="twist-title">${escapeHtml(twist.title)}</div>
        <div class="twist-rule">${ruleHtml}</div>
      </div>
    </div>
  `;
}

/* ---------- Schermo sempre acceso nel browser (nell'app ci pensa Android) ---------- */
let wakeLockSentinel = null;

async function requestScreenWakeLock() {
  if (isNativeApp()) return;
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockSentinel) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => { wakeLockSentinel = null; });
    }
  } catch (e) {
    wakeLockSentinel = null;
  }
}

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestScreenWakeLock();
  });
  document.addEventListener('click', () => { requestScreenWakeLock(); }, { once: true });
}

/* ---------- Aggiornamenti dell'app (funzioni pure, con i test in tests/common.test.js) ---------- */
/** "v1.2.3" o "1.2.3" → [1, 2, 3], altrimenti null. */
function parseVersion(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function isNewerVersion(candidate, current) {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

/** Solo file .apk delle Release di Nikcirri/cincin, senza trucchi nel percorso (come nel plugin Android). */
function isAllowedApkUrl(url) {
  return typeof url === 'string'
    && url.startsWith(UPDATE_APK_PREFIX)
    && url.endsWith('.apk')
    && !url.includes('..')
    && !url.includes('?')
    && !url.includes('#')
    && !/\s/.test(url);
}

/** Tra i file della Release sceglie l'APK di Cin Cin (prima quelli che si chiamano CinCin-…). */
function pickApkAsset(assets) {
  const apks = (Array.isArray(assets) ? assets : []).filter(a =>
    a && typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk') && isAllowedApkUrl(a.browser_download_url));
  const preferred = apks.find(a => a.name.startsWith('CinCin-')) || apks[0];
  return preferred ? preferred.browser_download_url : null;
}

/**
 * Le prime voci dell'elenco delle novità (dal CHANGELOG, copiato nella Release da GitHub Actions):
 * solo le righe dell'elenco principale che iniziano con "- " (non quelle rientrate), fino al primo titolo dopo l'elenco.
 */
function releaseNotes(body, max = 6) {
  const notes = [];
  const lines = String(body || '').replace(/\r/g, '').split('\n');
  for (const raw of lines) {
    if (raw.trim().startsWith('#') && notes.length > 0) break;
    if (!/^[-*] /.test(raw)) continue;
    let text = raw.slice(2).replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (text.length > 110) text = `${text.slice(0, 109).trimEnd()}…`;
    notes.push(text);
    if (notes.length >= max) break;
  }
  return notes;
}

/** Dati utili dalla risposta di GitHub (null se non è una Release valida). */
function parseRelease(json) {
  if (!json || typeof json !== 'object' || typeof json.tag_name !== 'string' || !parseVersion(json.tag_name)) return null;
  const pageOk = typeof json.html_url === 'string' && json.html_url.startsWith('https://github.com/Nikcirri/cincin/');
  return {
    version: json.tag_name.trim().replace(/^v/, ''),
    apkUrl: pickApkAsset(json.assets),
    pageUrl: pageOk ? json.html_url : UPDATE_PAGE_URL,
    notes: typeof json.body === 'string' ? releaseNotes(json.body) : []
  };
}

/** Controllo automatico al massimo ogni 10 minuti. */
function shouldAutoCheck(lastCheckIso, now) {
  if (!lastCheckIso) return true;
  const last = new Date(lastCheckIso).getTime();
  return !Number.isFinite(last) || now.getTime() - last >= UPDATE_AUTO_CHECK_MINUTES * 60000;
}

/** Stato degli aggiornamenti salvato sul telefono, ripulito (valori strani → vuoti). */
function sanitizeUpdateState(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  return {
    lastCheck: typeof s.lastCheck === 'string' ? s.lastCheck : null,
    latestVersion: typeof s.latestVersion === 'string' && parseVersion(s.latestVersion) ? s.latestVersion : null,
    apkUrl: isAllowedApkUrl(s.apkUrl) ? s.apkUrl : null,
    pageUrl: typeof s.pageUrl === 'string' && s.pageUrl.startsWith('https://github.com/Nikcirri/cincin/') ? s.pageUrl : UPDATE_PAGE_URL,
    notes: Array.isArray(s.notes) ? s.notes.filter(n => typeof n === 'string').slice(0, 6) : []
  };
}

/** L'ultima versione già vista su GitHub, se è più nuova di quella installata (senza chiedere di nuovo a GitHub). */
function cachedRelease(state, currentVersion) {
  const s = sanitizeUpdateState(state);
  if (!s.latestVersion || !isNewerVersion(s.latestVersion, currentVersion)) return null;
  return { version: s.latestVersion, apkUrl: s.apkUrl, pageUrl: s.pageUrl, notes: s.notes };
}

/**
 * Primo avvio dopo un aggiornamento? lastVersion = versione dell'avvio precedente (null se non salvata),
 * usedBefore = sul telefono c'erano già dati di Cin Cin (le versioni fino alla 1.1.0 non salvavano la versione).
 */
function shouldAnnounceUpdate(lastVersion, currentVersion, usedBefore) {
  if (!parseVersion(currentVersion)) return false;
  if (lastVersion) return isNewerVersion(currentVersion, lastVersion);
  return !!usedBefore;
}
