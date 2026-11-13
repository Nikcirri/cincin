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
  },
  {
    id: 'verita-o-bevi',
    name: 'Verità o Bevi',
    href: './verita-o-bevi.html',
    icon: 'fa-comments',
    tagline: 'Per conoscersi davvero',
    description: 'A turno una domanda per te: rispondi sinceramente o bevi. Sei livelli, da rompighiaccio a hot spinto (18+).',
    chips: ['240 domande', '6 livelli', 'Classifica della serata'],
    color: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.34)',
    soft: 'rgba(251, 146, 60, 0.10)',
    gradient: 'from-orange-300 to-rose-500',
    savedMatchKey: 'cincin_verita_match_v1'
  }
];

window.addEventListener('DOMContentLoaded', () => {
  renderGamesList();
  document.getElementById('footer-version').textContent = `Versione ${getAppVersion()}`;
  announceNewVersion();
  restorePendingUpdate();
  renderUpdates();
  refreshUpdate();
});

// Ritorno nell'app (src/native.js manda "cincin:resume"): si riprende l'aggiornamento e si ricontrolla
window.addEventListener('cincin:resume', () => {
  resumeUpdate().finally(refreshUpdate);
});

// Tasto Indietro di Android (chiamato da src/native.js): true = gestito qui.
window.handleAndroidBack = function handleAndroidBack() {
  if (isModalOpen('permission-modal')) {
    closePermissionModal();
    return true;
  }
  if (isModalOpen('updates-modal')) {
    closeUpdatesModal();
    return true;
  }
  if (isModalOpen('info-modal')) {
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
        data-nav
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
   INFORMAZIONI E IMPOSTAZIONI (suoni e vibrazione)
========================================================================= */
function openInfoModal() {
  playSound('tap');
  document.getElementById('info-version').textContent = `Versione ${getAppVersion()}`;
  document.getElementById('setting-sound').checked = appSettings().sound;
  document.getElementById('setting-haptics').checked = appSettings().haptics;
  openModal('info-modal');
}

function closeInfoModal() {
  closeModal('info-modal');
}

function setSoundFromSwitch(on) {
  setAppSetting('sound', on);
  renderSoundButtons();
  playSound('tap');
}

function setHapticsFromSwitch(on) {
  setAppSetting('haptics', on);
  vibrate('short');
  playSound('tap');
}

/* =========================================================================
   AGGIORNAMENTI DENTRO L'APP (modello: app Nutrizione)
   - controllo all'apertura e al ritorno nell'app, al massimo ogni 10 minuti (unica rete: GitHub);
   - "Aggiorna" scarica l'APK nella cache dell'app con la percentuale e apre l'installazione di Android
     (plugin Android AppUpdater, collegato in src/native.js come window.CinCinApp.updater);
   - se Android chiede "Installa app sconosciute", si spiega cosa toccare e si riparte da soli al ritorno.
   Le regole pure (versioni, Release, file .apk, novità) sono in common.js, con i test.
========================================================================= */
const UPDATE_SESSION_KEYS = {
  DISMISSED: 'cincin_update_dismissed', // versione per cui si è toccato "Dopo" (vale fino alla chiusura dell'app)
  PENDING: 'cincin_update_pending' // si è andati a dare il permesso: al ritorno l'aggiornamento riparte
};

const updateUi = {
  available: null, // { version, apkUrl, pageUrl, notes } se c'è una versione più nuova
  dismissed: false,
  phase: 'idle', // 'idle' | 'download' | 'install' | 'permission'
  percent: 0,
  checking: false
};

function sessionGet(key) {
  try { return sessionStorage.getItem(key); } catch (e) { return null; }
}

function sessionSet(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch (e) {
    // Non disponibile: si ricorda solo finché la pagina è aperta.
  }
}

function loadUpdateState() {
  return sanitizeUpdateState(loadJSON(SHARED_KEYS.UPDATES, null));
}

function updaterAvailable() {
  const app = nativeApp();
  return !!(app && app.isNative && app.updater);
}

/** Chiede a GitHub l'ultima Release (con un limite di 10 secondi). */
async function fetchLatestRelease() {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl && ctrl.abort(), 10000);
  try {
    const res = await fetch(UPDATE_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined
    });
    if (!res.ok) return null;
    return parseRelease(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

/** Controllo vero e proprio: risultato 'available' | 'current' | 'offline' | 'error'. */
async function checkForUpdates() {
  if (navigator.onLine === false) return { kind: 'offline' };
  let release;
  try {
    release = await fetchLatestRelease();
  } catch (e) {
    return { kind: navigator.onLine === false ? 'offline' : 'error' };
  }
  if (!release) return { kind: 'error' };
  saveJSON(SHARED_KEYS.UPDATES, {
    lastCheck: new Date().toISOString(),
    latestVersion: release.version,
    apkUrl: release.apkUrl,
    pageUrl: release.pageUrl,
    notes: release.notes
  });
  return isNewerVersion(release.version, getAppVersion()) ? { kind: 'available', release } : { kind: 'current', release };
}

function setAvailable(release) {
  const changed = !updateUi.available || updateUi.available.version !== release.version;
  updateUi.available = release;
  if (changed) updateUi.dismissed = sessionGet(UPDATE_SESSION_KEYS.DISMISSED) === release.version;
}

/** Controllo silenzioso (all'apertura e al ritorno nell'app): al massimo ogni 10 minuti, solo nell'app installata. */
async function refreshUpdate() {
  if (!isNativeApp() || updateUi.phase === 'download' || updateUi.checking) return;
  const state = loadUpdateState();
  let release = null;
  if (shouldAutoCheck(state.lastCheck, new Date())) {
    updateUi.checking = true;
    try {
      const result = await checkForUpdates();
      if (result.kind === 'available') release = result.release;
      else if (result.kind !== 'current') release = cachedRelease(loadUpdateState(), getAppVersion());
    } finally {
      updateUi.checking = false;
    }
  } else {
    release = cachedRelease(state, getAppVersion());
  }
  if (release) setAvailable(release);
  else if (updateUi.available && !isNewerVersion(updateUi.available.version, getAppVersion())) updateUi.available = null;
  renderUpdates();
}

/** "Aggiorna": scarica dentro l'app e apre l'installazione di Android (nel browser apre GitHub). */
async function installUpdate() {
  const release = updateUi.available;
  if (!release || updateUi.phase === 'download') return;
  if (!updaterAvailable() || !isAllowedApkUrl(release.apkUrl)) {
    openExternalLink(release.pageUrl || UPDATE_PAGE_URL);
    return;
  }
  const updater = nativeApp().updater;
  try {
    if (!(await updater.canInstall())) {
      openPermissionModal();
      return;
    }
    playSound('tap');
    updateUi.phase = 'download';
    updateUi.percent = 0;
    sessionSet(UPDATE_SESSION_KEYS.PENDING, null);
    renderUpdates();
    await updater.downloadAndInstall(release.apkUrl, percent => {
      updateUi.percent = Math.max(0, Math.min(100, Math.round(percent)));
      renderUpdateBanner();
    });
    updateUi.phase = 'install';
    vibrate('short');
  } catch (e) {
    updateUi.phase = 'idle';
    showToast('⚠️ Non riesco a scaricare l\'aggiornamento. Controlla internet e riprova.', 'danger', 4000);
  }
  renderUpdates();
}

/** Ritorno nell'app: se si era andati a dare il permesso, l'aggiornamento riparte da solo. */
async function resumeUpdate() {
  if (updateUi.phase === 'install') {
    updateUi.phase = 'idle';
    renderUpdates();
  }
  if (updateUi.phase !== 'permission') return;
  updateUi.phase = 'idle';
  sessionSet(UPDATE_SESSION_KEYS.PENDING, null);
  try {
    if (updaterAvailable() && await nativeApp().updater.canInstall()) {
      showToast('✅ Permesso dato: scarico l\'aggiornamento', 'success');
      await installUpdate();
    } else {
      showToast('Permesso non dato: puoi riprovare quando vuoi da "Aggiorna".', 'warning', 4000);
    }
  } catch (e) {
    showToast('⚠️ Qualcosa non va con l\'aggiornamento: riprova da "Aggiorna".', 'danger', 4000);
  }
  renderUpdates();
}

/** Se Android ha riaperto l'app dopo le impostazioni, si ricorda che si stava dando il permesso. */
function restorePendingUpdate() {
  const pending = sessionGet(UPDATE_SESSION_KEYS.PENDING);
  if (!pending) return;
  const release = cachedRelease(loadUpdateState(), getAppVersion());
  if (release && release.version === pending) {
    setAvailable(release);
    updateUi.phase = 'permission';
    // Il controllo del permesso arriva subito, come al ritorno nell'app
    setTimeout(() => { resumeUpdate().finally(refreshUpdate); }, 400);
  } else {
    sessionSet(UPDATE_SESSION_KEYS.PENDING, null);
  }
}

function dismissUpdate() {
  if (!updateUi.available) return;
  updateUi.dismissed = true;
  sessionSet(UPDATE_SESSION_KEYS.DISMISSED, updateUi.available.version);
  playSound('back');
  renderUpdates();
  showToast('Va bene! L\'aggiornamento lo ritrovi qui nel menu, alla voce "Aggiornamenti" in fondo.', 'info', 4500);
}

/** Dopo un aggiornamento: "App aggiornata alla versione X" (una volta sola). */
function announceNewVersion() {
  const current = getAppVersion();
  if (!parseVersion(current)) return;
  const last = loadJSON(SHARED_KEYS.LAST_VERSION, null);
  let usedBefore = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cincin_') && key !== SHARED_KEYS.LAST_VERSION) usedBefore = true;
    }
  } catch (e) {
    usedBefore = false;
  }
  const announce = shouldAnnounceUpdate(typeof last === 'string' ? last : null, current, usedBefore);
  if (last !== current) saveJSON(SHARED_KEYS.LAST_VERSION, current);
  if (announce) {
    setTimeout(() => {
      playSound('success');
      showToast(`🎉 App aggiornata alla versione ${current}`, 'success', 4500);
    }, 450);
  }
}

/* ---------- Permesso "Installa app sconosciute" ---------- */
function openPermissionModal() {
  playSound('tap');
  closeModal('updates-modal');
  openModal('permission-modal');
}

function closePermissionModal() {
  closeModal('permission-modal');
}

async function goToInstallSettings() {
  closeModal('permission-modal');
  if (!updaterAvailable() || !updateUi.available) return;
  updateUi.phase = 'permission';
  sessionSet(UPDATE_SESSION_KEYS.PENDING, updateUi.available.version);
  renderUpdates();
  try {
    await nativeApp().updater.openInstallSettings();
  } catch (e) {
    updateUi.phase = 'idle';
    sessionSet(UPDATE_SESSION_KEYS.PENDING, null);
    renderUpdates();
    showToast('⚠️ Non riesco ad aprire le impostazioni. Cerca "Installa app sconosciute" nelle impostazioni del telefono.', 'danger', 5000);
  }
}

/* ---------- Voce "Aggiornamenti" e sua finestra ---------- */
function openUpdatesModal() {
  playSound('tap');
  renderUpdatesModal();
  openModal('updates-modal');
}

function closeUpdatesModal() {
  closeModal('updates-modal');
}

async function manualCheckForUpdates() {
  if (updateUi.checking) return;
  updateUi.checking = true;
  renderUpdatesModal();
  const result = await checkForUpdates();
  updateUi.checking = false;
  const messages = {
    available: `🆕 È disponibile la versione ${result.release ? result.release.version : ''}!`,
    current: '✅ Hai già l\'ultima versione.',
    offline: '📵 Sei offline: collegati a internet e riprova.',
    error: '⚠️ Non riesco a controllare adesso. Riprova tra poco.'
  };
  if (result.kind === 'available') {
    setAvailable(result.release);
    updateUi.dismissed = false;
    sessionSet(UPDATE_SESSION_KEYS.DISMISSED, null);
    playSound('success');
  } else if (result.kind === 'current') {
    updateUi.available = null;
  }
  renderUpdates();
  renderUpdatesModal(messages[result.kind]);
}

/** "Aggiorna dall'app": se serve controlla prima, poi scarica e installa. */
async function updateFromApp() {
  if (updateUi.phase === 'download') {
    closeUpdatesModal();
    return;
  }
  if (!updateUi.available) {
    await manualCheckForUpdates();
    if (!updateUi.available) return;
  }
  if (!updaterAvailable()) {
    downloadFromGitHub();
    return;
  }
  closeUpdatesModal();
  updateUi.dismissed = false;
  await installUpdate();
}

function downloadFromGitHub() {
  playSound('tap');
  openExternalLink(UPDATE_PAGE_URL);
}

/* ---------- Disegno: avviso in alto, voce nel menu, finestra ---------- */
function renderUpdates() {
  renderUpdateBanner();
  renderUpdatesEntry();
  if (isModalOpen('updates-modal')) renderUpdatesModal();
}

function notesListHtml(notes) {
  if (!notes || notes.length === 0) return '';
  return `<ul class="mt-2 space-y-1 text-xs text-slate-200 list-disc pl-4 marker:text-cyan-300">
    ${notes.slice(0, 3).map(n => `<li>${escapeHtml(n)}</li>`).join('')}
  </ul>`;
}

function renderUpdateBanner() {
  const banner = document.getElementById('update-banner');
  const u = updateUi.available;
  const visible = !!u && (!updateUi.dismissed || updateUi.phase !== 'idle');
  if (!visible) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    delete banner.dataset.phase;
    return;
  }

  const version = escapeHtml(u.version);
  let body;
  if (updateUi.phase === 'download') {
    body = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
          <i class="fa-solid fa-download"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-display font-bold text-white text-sm">Scarico la versione ${version}… <span id="update-percent">${updateUi.percent}</span>%</div>
          <div class="text-xs text-slate-400 mt-0.5">Resta qui un attimo: poi si apre l'installazione di Android.</div>
        </div>
      </div>
      <div class="mt-3 h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div id="update-progress" class="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all duration-200" style="width: ${updateUi.percent}%"></div>
      </div>`;
  } else if (updateUi.phase === 'install') {
    body = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
          <i class="fa-solid fa-box-open"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-display font-bold text-white text-sm">Quasi fatto</div>
          <div class="text-xs text-slate-300 mt-0.5 leading-relaxed">Tocca <strong>Aggiorna</strong> (o <strong>Installa</strong>) nella finestra di Android, poi <strong>Apri</strong>: giocatori, carte e domande restano.</div>
        </div>
      </div>
      <div class="flex justify-end mt-3">
        <button type="button" onclick="installUpdate()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs active:scale-95 transition-all">
          <i class="fa-solid fa-rotate-right mr-1"></i> Riprova
        </button>
      </div>`;
  } else if (updateUi.phase === 'permission') {
    body = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(250,204,21,0.55)]">
          <i class="fa-solid fa-key"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-display font-bold text-white text-sm">Dai il permesso e torna qui</div>
          <div class="text-xs text-slate-300 mt-0.5 leading-relaxed">Attiva <strong>Consenti da questa origine</strong>, poi torna indietro: l'aggiornamento riparte da solo.</div>
        </div>
      </div>
      <div class="flex justify-end mt-3">
        <button type="button" onclick="goToInstallSettings()" class="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-xs active:scale-95 transition-all">
          Apri impostazioni
        </button>
      </div>`;
  } else {
    body = `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-300 to-violet-400 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(34,211,238,0.5)]">
          <i class="fa-solid fa-gift"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-display font-bold text-white text-sm">Nuova versione ${version}</div>
          <div class="text-xs text-slate-400 mt-0.5">Si installa sopra quella attuale: i dati restano.</div>
          ${notesListHtml(u.notes)}
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <button type="button" onclick="dismissUpdate()" class="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm active:scale-95 transition-all">
          Dopo
        </button>
        <button type="button" onclick="installUpdate()" class="flex-[2] py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-sm active:scale-95 transition-all">
          <i class="fa-solid fa-download mr-1"></i> Aggiorna
        </button>
      </div>`;
  }

  // Solo la percentuale cambia durante il download: si aggiorna senza ridisegnare tutto (niente sfarfallio)
  if (banner.dataset.phase === 'download' && updateUi.phase === 'download' && document.getElementById('update-progress')) {
    document.getElementById('update-percent').textContent = updateUi.percent;
    document.getElementById('update-progress').style.width = `${updateUi.percent}%`;
    return;
  }
  const isNew = banner.classList.contains('hidden');
  banner.innerHTML = `<div class="glass-panel rounded-3xl p-4 border border-cyan-400/40 shadow-[0_0_22px_rgba(34,211,238,0.22)] ${isNew ? 'animate-pop-in' : ''}">${body}</div>`;
  banner.dataset.phase = updateUi.phase;
  banner.classList.remove('hidden');
}

function renderUpdatesEntry() {
  const sub = document.getElementById('updates-entry-sub');
  const dot = document.getElementById('updates-entry-dot');
  const u = updateUi.available;
  if (updateUi.phase === 'download') {
    sub.textContent = `Scarico la versione ${u ? u.version : ''}…`;
  } else if (u) {
    sub.textContent = `Versione ${getAppVersion()} · disponibile la ${u.version}`;
  } else {
    sub.textContent = `Versione ${getAppVersion()} installata`;
  }
  dot.classList.toggle('hidden', !u);
}

function renderUpdatesModal(message) {
  const u = updateUi.available;
  const state = loadUpdateState();
  document.getElementById('updates-version').textContent = `Versione installata: ${getAppVersion()}`;

  const status = document.getElementById('updates-status');
  if (updateUi.checking) {
    status.textContent = 'Controllo in corso…';
  } else if (message) {
    status.textContent = message;
  } else if (updateUi.phase === 'download') {
    status.textContent = `Scarico la versione ${u ? u.version : ''}… ${updateUi.percent}%`;
  } else if (u) {
    status.textContent = `🆕 È disponibile la versione ${u.version}.`;
  } else if (state.lastCheck) {
    status.textContent = `Ultimo controllo: ${new Date(state.lastCheck).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.`;
  } else {
    status.textContent = 'Non hai ancora controllato gli aggiornamenti.';
  }

  const notes = document.getElementById('updates-notes');
  if (u && u.notes && u.notes.length) {
    notes.innerHTML = u.notes.slice(0, 3).map(n => `<li>${escapeHtml(n)}</li>`).join('');
    notes.classList.remove('hidden');
  } else {
    notes.innerHTML = '';
    notes.classList.add('hidden');
  }

  const checkBtn = document.getElementById('updates-check-btn');
  checkBtn.disabled = updateUi.checking;
  document.getElementById('updates-check-label').textContent = updateUi.checking ? 'Controllo in corso…' : 'Controlla aggiornamenti';
  const installBtn = document.getElementById('updates-install-btn');
  installBtn.disabled = updateUi.checking;
  document.getElementById('updates-install-label').textContent = u ? `Aggiorna dall'app alla ${u.version}` : 'Aggiorna dall\'app';
}
