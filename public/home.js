'use strict';

/* =========================================================================
   MENU INIZIALE: elenco dei giochi, informazioni e aggiornamenti.
   Per aggiungere un gioco: crea la sua pagina (es. nuovo-gioco.html),
   aggiungila in vite.config.js e aggiungi una voce qui sotto.
========================================================================= */
const GAMES = [
  {
    id: 'hai-mai',
    name: 'Hai Mai?',
    href: './hai-mai.html',
    icon: 'fa-hand',
    tagline: 'Il classico: chi l\'ha fatto beve!',
    description: 'Leggi la domanda ad alta voce: chi l\'ha fatto davvero beve un sorso. Con imprevisti a sorpresa e le vostre domande.',
    chips: ['120 domande', '4 categorie', 'Nessun nome da inserire'],
    color: '#22d3ee',
    glow: 'rgba(34, 211, 238, 0.32)',
    soft: 'rgba(34, 211, 238, 0.10)',
    gradient: 'from-cyan-300 to-sky-500',
    savedMatchKey: 'cincin_haimai_match_v1'
  },
  {
    id: 'neon-sips',
    name: 'Neon Sips',
    href: './neon-sips.html',
    icon: 'fa-bolt',
    tagline: 'Carte, sfide e maledizioni',
    description: 'Un mazzo di carte con i vostri nomi: catene a tempo, duelli 1 contro 1, scudi, nuove regole e la giuria.',
    chips: ['70 carte', '7 categorie', 'Da 2 giocatori'],
    color: '#d946ef',
    glow: 'rgba(217, 70, 239, 0.34)',
    soft: 'rgba(217, 70, 239, 0.10)',
    gradient: 'from-fuchsia-400 to-purple-500',
    savedMatchKey: 'cincin_neon_match_v1'
  }
];

window.addEventListener('DOMContentLoaded', () => {
  renderGamesList();
  document.getElementById('footer-version').textContent = `Versione ${getAppVersion()}`;
  renderUpdateBanner();
  setTimeout(autoCheckForUpdates, 1500);
});

// Tasto Indietro di Android (chiamato da src/native.js): true = gestito qui.
window.handleAndroidBack = function handleAndroidBack() {
  if (!document.getElementById('info-modal').classList.contains('hidden')) {
    closeInfoModal();
    return true;
  }
  return false;
};

function hasSavedMatch(key) {
  const match = loadJSON(key, null);
  return !!(match && typeof match === 'object' && match.active);
}

function renderGamesList() {
  const list = document.getElementById('games-list');
  list.innerHTML = GAMES.map((g, idx) => {
    const resume = hasSavedMatch(g.savedMatchKey)
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
           <i class="fa-solid fa-play text-[8px]"></i> Partita in corso
         </span>`
      : '';
    return `
      <a
        href="${g.href}"
        class="home-game-card block rounded-3xl p-5 animate-pop-in"
        style="--card-color: ${g.color}; --card-glow: ${g.glow}; --card-soft: ${g.soft}; animation-delay: ${idx * 70}ms"
        data-game="${g.id}"
      >
        <div class="relative z-10 flex items-start gap-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${g.gradient} flex items-center justify-center text-2xl text-slate-950 shrink-0 shadow-lg" style="box-shadow: 0 0 22px ${g.glow}">
            <i class="fa-solid ${g.icon}"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-display text-2xl font-extrabold text-white tracking-tight leading-tight">${escapeHtml(g.name)}</h2>
              <i class="fa-solid fa-chevron-right text-slate-500"></i>
            </div>
            <div class="text-sm font-bold mt-0.5" style="color: ${g.color}">${escapeHtml(g.tagline)}</div>
          </div>
        </div>
        <p class="relative z-10 text-sm text-slate-300 leading-relaxed mt-3">${escapeHtml(g.description)}</p>
        <div class="relative z-10 flex flex-wrap items-center gap-1.5 mt-3">
          ${resume}
          ${g.chips.map(c => `<span class="px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-[11px] font-semibold">${escapeHtml(c)}</span>`).join('')}
        </div>
      </a>
    `;
  }).join('');
}

/* =========================================================================
   INFORMAZIONI E AGGIORNAMENTI DELL'APP
   L'unico collegamento a internet dell'app: chiede a GitHub qual è l'ultima versione.
========================================================================= */
function loadUpdateState() {
  const saved = loadJSON(SHARED_KEYS.UPDATES, null);
  if (saved && typeof saved === 'object') return saved;
  return { lastCheck: null, latestVersion: null, apkUrl: null, pageUrl: null, dismissedVersion: null };
}

function saveUpdateState(state) {
  saveJSON(SHARED_KEYS.UPDATES, state);
}

function getAvailableUpdate() {
  const state = loadUpdateState();
  if (state.latestVersion && isNewerVersion(state.latestVersion, getAppVersion())) return state;
  return null;
}

async function checkForUpdates() {
  if (navigator.onLine === false) return { kind: 'offline' };
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl && ctrl.abort(), 10000);
  try {
    const res = await fetch(UPDATE_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined
    });
    if (!res.ok) return { kind: 'error' };
    const release = parseRelease(await res.json());
    if (!release) return { kind: 'error' };
    const state = loadUpdateState();
    state.lastCheck = new Date().toISOString();
    state.latestVersion = release.version;
    state.apkUrl = release.apkUrl;
    state.pageUrl = release.pageUrl;
    saveUpdateState(state);
    return isNewerVersion(release.version, getAppVersion()) ? { kind: 'available', release } : { kind: 'current', release };
  } catch (e) {
    return { kind: navigator.onLine === false ? 'offline' : 'error' };
  } finally {
    clearTimeout(timer);
  }
}

// All'avvio, al massimo una volta al giorno, solo nell'app installata e solo con internet.
async function autoCheckForUpdates() {
  if (!isNativeApp()) return;
  const state = loadUpdateState();
  if (!shouldAutoCheck(state.lastCheck, new Date())) return;
  const result = await checkForUpdates();
  if (result.kind === 'available') renderUpdateBanner();
}

function renderUpdateBanner() {
  const banner = document.getElementById('update-banner');
  const update = getAvailableUpdate();
  if (!update || update.dismissedVersion === update.latestVersion) {
    banner.classList.add('hidden');
    return;
  }
  document.getElementById('update-banner-text').textContent =
    `È uscita la versione ${update.latestVersion} (tu hai la ${getAppVersion()}). Scaricala e installala sopra: giocatori, carte e domande restano.`;
  banner.classList.remove('hidden');
}

function dismissUpdateBanner() {
  const state = loadUpdateState();
  state.dismissedVersion = state.latestVersion;
  saveUpdateState(state);
  renderUpdateBanner();
}

function downloadUpdate() {
  const update = getAvailableUpdate();
  const url = (update && (update.apkUrl || update.pageUrl)) || UPDATE_PAGE_URL;
  openExternalLink(url);
  showToast('⬇️ Download avviato: quando finisce apri il file e tocca "Aggiorna".', 'info');
}

function openInfoModal() {
  document.getElementById('info-version').textContent = `Versione ${getAppVersion()}`;
  renderInfoUpdateStatus();
  document.getElementById('info-modal').classList.remove('hidden');
}

function closeInfoModal() {
  document.getElementById('info-modal').classList.add('hidden');
}

function renderInfoUpdateStatus(message) {
  const statusEl = document.getElementById('info-update-status');
  const downloadBtn = document.getElementById('info-download-btn');
  const update = getAvailableUpdate();
  if (message) {
    statusEl.textContent = message;
  } else if (update) {
    statusEl.textContent = `🆕 È disponibile la versione ${update.latestVersion}.`;
  } else {
    const state = loadUpdateState();
    statusEl.textContent = state.lastCheck
      ? `Ultimo controllo: ${new Date(state.lastCheck).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.`
      : 'Non hai ancora controllato gli aggiornamenti.';
  }
  downloadBtn.classList.toggle('hidden', !update);
}

async function manualCheckForUpdates() {
  const btn = document.getElementById('info-check-btn');
  const label = document.getElementById('info-check-label');
  btn.disabled = true;
  label.textContent = 'Controllo in corso...';
  const result = await checkForUpdates();
  btn.disabled = false;
  label.textContent = 'Controlla aggiornamenti';
  const messages = {
    available: `🆕 È disponibile la versione ${result.release ? result.release.version : ''}!`,
    current: '✅ Hai già l\'ultima versione.',
    offline: '📵 Sei offline: collegati a internet e riprova.',
    error: '⚠️ Non sono riuscito a controllare. Riprova tra poco.'
  };
  if (result.kind === 'available') {
    const state = loadUpdateState();
    state.dismissedVersion = null;
    saveUpdateState(state);
  }
  renderInfoUpdateStatus(messages[result.kind]);
  renderUpdateBanner();
}
