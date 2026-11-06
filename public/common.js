'use strict';

/* =========================================================================
   FUNZIONI COMUNI A TUTTE LE PAGINE (menu iniziale e giochi)
   Script classico: le funzioni sono globali e si usano anche da onclick="...".
========================================================================= */

const SHARED_KEYS = {
  PLAYERS: 'cincin_players_v1', // nomi dei giocatori, condivisi tra i giochi
  UPDATES: 'cincin_updates_v1'
};

const UPDATE_API_URL = 'https://api.github.com/repos/Nikcirri/cincin/releases/latest';
const UPDATE_PAGE_URL = 'https://github.com/Nikcirri/cincin/releases/latest';
const UPDATE_AUTO_CHECK_HOURS = 24;

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

function vibrate(kind) {
  const app = nativeApp();
  if (app && app.isNative && app.vibrate) {
    app.vibrate(kind);
  } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(kind === 'long' ? [300, 120, 300] : 30); } catch (e) {}
  }
}

function goHome() {
  window.location.href = './index.html';
}

function openExternalLink(url) {
  const app = nativeApp();
  if (app && app.openExternal) {
    app.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener');
}

/* ---------- Avvisi in alto (al posto di alert) ---------- */
function showToast(message, type = 'info') {
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

  toast.className = `px-4 py-2.5 rounded-2xl border backdrop-blur-md text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-300 transform translate-y-0 opacity-100 ${colorClasses}`;
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
  }, 2600);
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

/* ---------- Aggiornamenti dell'app (funzioni pure) ---------- */
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

/** Dati utili dalla risposta di GitHub (null se non è una Release valida). */
function parseRelease(json) {
  if (!json || typeof json !== 'object' || typeof json.tag_name !== 'string' || !parseVersion(json.tag_name)) return null;
  const assets = Array.isArray(json.assets) ? json.assets : [];
  const apk = assets.find(a => a && typeof a.name === 'string' && a.name.endsWith('.apk') && typeof a.browser_download_url === 'string');
  return {
    version: json.tag_name.replace(/^v/, ''),
    apkUrl: apk ? apk.browser_download_url : null,
    pageUrl: typeof json.html_url === 'string' ? json.html_url : UPDATE_PAGE_URL
  };
}

/** Controllo automatico al massimo una volta ogni 24 ore. */
function shouldAutoCheck(lastCheckIso, now) {
  if (!lastCheckIso) return true;
  const last = new Date(lastCheckIso).getTime();
  return !Number.isFinite(last) || now.getTime() - last >= UPDATE_AUTO_CHECK_HOURS * 3600000;
}
