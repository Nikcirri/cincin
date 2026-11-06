'use strict';

/* =========================================================================
   NEON SIPS: logica del gioco (dal codice generato con Gemini, adattato all'app).
   Usa le funzioni comuni di public/common.js e il mazzo di public/neon-sips/deck.js.
========================================================================= */
/*************************************************************************
 * 2B. CUSTOM DECK STORAGE & PERSISTENCE (localStorage)
 * Chiavi da non cambiare: chi ha già l'app perderebbe mazzo e partita.
 *************************************************************************/
const DECK_STORAGE_KEY = 'cincin_neon_deck_v1';
const MATCH_STORAGE_KEY = 'cincin_neon_match_v1';
const SETTINGS_STORAGE_KEY = 'cincin_neon_settings_v1';
let customDeck = [];
let selectedEditorCategoryFilter = 'ALL';

function loadCustomDeckFromStorage() {
  try {
    const raw = localStorage.getItem(DECK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const valid = Array.isArray(parsed)
        ? parsed.filter(c => c && CATEGORIES[c.category] && typeof c.title === 'string' && typeof c.text === 'string')
        : [];
      if (valid.length > 0) {
        customDeck = valid;
        updateDeckCountBadges();
        return;
      }
    }
  } catch (e) {
    // Fallback to MASTER_DECK if localStorage is unavailable or corrupted
  }
  customDeck = MASTER_DECK.map(card => ({ ...card }));
  updateDeckCountBadges();
}

function saveCustomDeckToStorage() {
  saveJSON(DECK_STORAGE_KEY, customDeck);
  // Le carte cambiate o tolte cambiano anche il mazzo della partita salvata
  if (currentCard) saveMatch();
  updateDeckCountBadges();
}

function updateDeckCountBadges() {
  const total = customDeck.length;
  const lobbyBadge = document.getElementById('lobby-deck-count');
  const lobbySub = document.getElementById('lobby-subtitle-count');
  const editorTotal = document.getElementById('editor-total-count');
  const tabCount = document.getElementById('tab-deck-count');
  const deckCounter = document.getElementById('deck-counter');

  if (lobbyBadge) lobbyBadge.textContent = total;
  if (lobbySub) lobbySub.textContent = total;
  if (editorTotal) editorTotal.textContent = total;
  if (tabCount) tabCount.textContent = total;
  if (deckCounter && currentCard) {
    deckCounter.textContent = `${playedCount} / ${total}`;
  }
}

/*************************************************************************
 * 3. GAME STATE
 *************************************************************************/
// I giocatori arrivano dalla partita salvata o dai nomi salvati (vedi initNeonSips).
let players = [];

let currentTurnIndex = 0;
let deck = [];
let playedCount = 0;
let currentCard = null;
let currentP1 = null;
let currentP2 = null;
let activeEffects = []; // Rules & Curses pinned on table
let cardActionUsed = false;

// 3-Second Chain Timer State
let chainTimerInterval = null;
let chainTimeLeft = 3.0;

// Jury Countdown State
let juryTimerInterval = null;

// Imprevisti e verso del giro
let direction = 1;            // 1 = in avanti, -1 = giro al contrario
let skipPlayerId = null;      // chi salta il prossimo turno (imprevisto "Salta il turno")
let currentTwistId = null;    // imprevisto della carta sul tavolo
let twistsEnabled = true;     // interruttore "Imprevisti"
let isDrawing = false;        // evita due carte di fila con un doppio tocco

// Suoni, vibrazione e finestre sono comuni a tutti i giochi: playSound(), vibrate(), openModal() in public/common.js

/*************************************************************************
 * 4. TOAST NOTIFICATION SYSTEM: showToast() è in public/common.js
 *************************************************************************/

/*************************************************************************
 * 5. LOBBY / START SCREEN FUNCTIONS
 *************************************************************************/
/** newPlayerId: il giocatore appena aggiunto entra con una piccola animazione. */
function renderLobbyPlayers(newPlayerId) {
  const listEl = document.getElementById('lobby-player-list');
  const badgeEl = document.getElementById('player-count-badge');
  const startBtn = document.getElementById('start-game-btn');

  badgeEl.textContent = `${players.length} ${players.length === 1 ? 'inserito' : 'inseriti'} (min 2)`;
  startBtn.disabled = players.length < 2;
  renderResumeButton();

  if (players.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-sm">
        <i class="fa-solid fa-user-plus text-2xl mb-2 text-slate-600 block"></i>
        Inserisci almeno 2 giocatori per iniziare la partita!
      </div>
    `;
    return;
  }

  listEl.innerHTML = players.map((p, idx) => `
    <div class="flex items-center justify-between bg-slate-900/75 border border-slate-800/90 rounded-xl px-3.5 py-2.5 ${p.id === newPlayerId ? 'animate-row-in' : ''}">
      <div class="flex items-center gap-3">
        <span class="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-display text-xs font-bold flex items-center justify-center">
          ${idx + 1}
        </span>
        <span class="font-bold text-sm text-slate-100">${escapeHtml(p.name)}</span>
      </div>
      <button 
        type="button"
        onclick="removePlayer('${p.id}')" 
        class="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
        aria-label="Rimuovi ${escapeHtml(p.name)}"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

function handleAddPlayer(e) {
  e.preventDefault();
  const input = document.getElementById('player-input');
  const name = input.value.trim();

  if (!name) return;

  if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('Questo nome è già al tavolo!', 'warning');
    return;
  }

  players.push({
    id: makeId('p'),
    name: name,
    shields: 0
  });

  input.value = '';
  input.focus();
  playSound('tap');
  persistPlayers();
  renderLobbyPlayers(players[players.length - 1].id);
}

function removePlayer(id) {
  players = players.filter(p => p.id !== id);
  playSound('remove');
  persistPlayers();
  renderLobbyPlayers();
}

function clearAllPlayers() {
  if (players.length === 0) return;
  players = [];
  playSound('remove');
  persistPlayers();
  renderLobbyPlayers();
  showToast('Lista giocatori svuotata', 'info');
}

/** Salva i nomi (condivisi con gli altri giochi) e la partita, se ce n'è una. */
function persistPlayers() {
  savePlayerNames(players.map(p => p.name));
  if (currentCard) saveMatch();
}

function addSamplePlayers() {
  const sampleNames = ['Lorenzo', 'Chiara', 'Matteo', 'Federica', 'Simona', 'Andrea'];
  sampleNames.forEach(name => {
    if (!players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      players.push({
        id: makeId('p'),
        name,
        shields: 0
      });
    }
  });
  playSound('success');
  persistPlayers();
  renderLobbyPlayers();
  showToast('Gruppo di amici aggiunto! 🍻', 'success');
}

/*************************************************************************
 * 6. DECK SHUFFLING & GAMEPLAY ENGINE
 *************************************************************************/
// shuffleArray() è in public/common.js

function buildAndShuffleDeck() {
  if (customDeck.length === 0) {
    customDeck = MASTER_DECK.map(c => ({ ...c }));
  }
  deck = shuffleArray(customDeck);
  playedCount = 0;
}

function startGame() {
  if (players.length < 2) {
    showToast('Servono almeno 2 giocatori!', 'warning');
    return;
  }

  playSound('start');
  vibrate('short');

  // Reset shields & rules for a fresh game
  players.forEach(p => p.shields = 0);
  activeEffects = [];
  currentTurnIndex = 0;
  direction = 1;
  skipPlayerId = null;
  currentTwistId = null;

  buildAndShuffleDeck();

  showGameScreen();

  drawCardForCurrentTurn(false);
}

function showGameScreen() {
  document.getElementById('start-screen').classList.add('hidden');
  const game = document.getElementById('game-screen');
  game.classList.remove('hidden', 'animate-pop-in');
  void game.offsetWidth;
  game.classList.add('animate-pop-in');
  window.scrollTo(0, 0);
}

function isGameScreenVisible() {
  return !document.getElementById('game-screen').classList.contains('hidden');
}

function pickRandomOpponent(excludePlayerId) {
  const candidates = players.filter(p => p.id !== excludePlayerId);
  if (candidates.length === 0) return players[0];
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

function nextTurnAndDraw() {
  if (isDrawing) return;
  stopActiveCardTimers();

  // Turno successivo nel verso del giro (che un imprevisto può invertire)
  currentTurnIndex = nextTurnIndex(currentTurnIndex, direction, players.length);
  if (skipPlayerId) {
    const skipped = players[currentTurnIndex];
    if (skipped && skipped.id === skipPlayerId && players.length > 1) {
      showToast(`⏭️ ${skipped.name} salta il turno!`, 'warning');
      currentTurnIndex = nextTurnIndex(currentTurnIndex, direction, players.length);
    }
    skipPlayerId = null;
  }

  // Decrement turn counters on active rules/curses
  const expiredTitles = [];
  activeEffects = activeEffects.filter(effect => {
    if (typeof effect.turnsLeft === 'number') {
      effect.turnsLeft -= 1;
      if (effect.turnsLeft <= 0) {
        expiredTitles.push(effect.title);
        return false;
      }
    }
    return true;
  });

  if (expiredTitles.length > 0) {
    showToast(`⌛ Scaduta: "${expiredTitles[0]}"`, 'info');
  }

  drawCardForCurrentTurn(true);
}

function drawCardForCurrentTurn(animateTransition = true) {
  // Check if deck is empty -> auto reshuffle
  if (deck.length === 0) {
    buildAndShuffleDeck();
    showToast(`🔄 Mazzo terminato! Tutte le ${customDeck.length} carte sono state rimescolate!`, 'warning');
  }

  currentCard = deck.pop();
  playedCount++;
  cardActionUsed = false;

  currentP1 = players[currentTurnIndex];
  currentP2 = pickRandomOpponent(currentP1.id);

  // Imprevisto: mai due di fila; alcuni cambiano subito la partita
  currentTwistId = pickNeonTwist(twistsEnabled, currentTwistId, currentCard.category, players.length);
  applyTwistEffect();
  saveMatch();

  const cardEl = document.getElementById('active-card');
  playSound('flip');
  vibrate('short');

  if (animateTransition) {
    isDrawing = true;
    cardEl.classList.remove('animate-card-in');
    cardEl.classList.add('animate-card-out');

    setTimeout(() => {
      updateGameUI();
      cardEl.classList.remove('animate-card-out');
      void cardEl.offsetWidth;
      cardEl.classList.add('animate-card-in');
      isDrawing = false;
      announceTwist();
    }, 200);
  } else {
    updateGameUI();
    cardEl.classList.remove('animate-card-in');
    void cardEl.offsetWidth;
    cardEl.classList.add('animate-card-in');
    announceTwist();
  }
}

/** Effetti degli imprevisti che cambiano la partita (applicati una volta, quando esce la carta). */
function applyTwistEffect() {
  const twist = findNeonTwist(currentTwistId);
  if (!twist || !twist.effect) return;
  if (twist.effect === 'reverse') {
    direction = -direction;
  } else if (twist.effect === 'skip') {
    const next = players[nextTurnIndex(currentTurnIndex, direction, players.length)];
    skipPlayerId = next && next !== currentP1 ? next.id : null;
  } else if (twist.effect === 'shield') {
    currentP1.shields += 1;
  }
}

/** Suono dell'imprevisto, un attimo dopo la carta (insieme all'animazione del riquadro). */
function announceTwist() {
  if (!currentTwistId) return;
  setTimeout(() => {
    playSound('twist');
    vibrate('short');
  }, 280);
}

/** Testo dell'imprevisto con i nomi al posto dei segnaposto (già sicuro per l'HTML). */
function twistRuleHtml(twist) {
  const skipped = players.find(p => p.id === skipPlayerId);
  const nextName = skipped ? skipped.name : 'Il prossimo';
  return formatDynamicCardText(twist.rule, currentP1.name, currentP2.name)
    .replace(/\{next\}/g, () => `<span class="player-highlight-2">${escapeHtml(nextName)}</span>`);
}

function renderTwist() {
  const box = document.getElementById('card-twist');
  const badge = document.getElementById('card-sips-badge');
  const twist = findNeonTwist(currentTwistId);
  badge.classList.toggle('sips-badge-twist', !!twist);
  if (!twist) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  box.innerHTML = twistBoxHtml(twist, twistRuleHtml(twist));
  box.classList.remove('hidden');
}

function renderDirection() {
  document.getElementById('turn-direction').classList.toggle('hidden', direction !== -1);
}

function toggleNeonTwists(on) {
  twistsEnabled = !!on;
  saveJSON(SETTINGS_STORAGE_KEY, { twists: twistsEnabled });
  playSound('tap');
  showToast(on ? '🎲 Imprevisti attivati' : 'Imprevisti disattivati', 'info');
}

/*************************************************************************
 * 7. RENDER GAME UI, DYNAMIC NAMES & CARD ACTIONS
 *************************************************************************/
function formatDynamicCardText(rawText, p1Name, p2Name) {
  const safeP1 = `<span class="player-highlight-1">${escapeHtml(p1Name)}</span>`;
  const safeP2 = `<span class="player-highlight-2">${escapeHtml(p2Name)}</span>`;
  return escapeHtml(rawText)
    .replace(/\{p1\}/g, () => safeP1)
    .replace(/\{p2\}/g, () => safeP2);
}

function formatPlainRuleTitle(rawTitle, p1Name, p2Name) {
  return String(rawTitle)
    .replace(/\{p1\}/g, () => p1Name)
    .replace(/\{p2\}/g, () => p2Name);
}

function updateGameUI() {
  const cat = CATEGORIES[currentCard.category];

  // Update CSS variables for neon border and glow
  document.documentElement.style.setProperty('--neon-color', cat.color);
  document.documentElement.style.setProperty('--neon-glow', cat.glow);
  document.documentElement.style.setProperty('--neon-bg', cat.bgSoft);

  // 1. Update Header Turn & Deck Counter
  const initials = currentP1.name.slice(0, 2).toUpperCase();
  document.getElementById('turn-avatar').textContent = initials;
  document.getElementById('current-turn-name').textContent = currentP1.name;
  document.getElementById('deck-counter').textContent = `${playedCount} / ${customDeck.length}`;

  // 2. Update Shields Bar & Active Rules Bar
  renderShieldsBar();
  renderActiveEffectsBar();

  // 3. Update Card Badges & Icons
  const badgeEl = document.getElementById('card-category-badge');
  badgeEl.className = `inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${cat.badgeClass}`;
  document.getElementById('card-category-icon').className = `fa-solid ${cat.icon}`;
  document.getElementById('card-category-name').textContent = cat.name;
  document.getElementById('card-sips-text').textContent = currentCard.sips;

  const centerIconWrap = document.getElementById('card-center-icon-wrap');
  centerIconWrap.style.backgroundColor = cat.bgSoft;
  centerIconWrap.style.color = cat.color;
  centerIconWrap.style.boxShadow = `0 0 20px ${cat.glow}`;
  document.getElementById('card-center-icon').className = `fa-solid ${cat.icon}`;

  // 4. Update Card Title & Dynamic Text
  document.getElementById('card-title').textContent = currentCard.title;
  document.getElementById('card-description').innerHTML = formatDynamicCardText(
    currentCard.text,
    currentP1.name,
    currentP2.name
  );

  // 5. Render Context-Specific Interactive Buttons inside the Card
  renderCardContextActions(cat);

  // 6. Imprevisto e verso del giro
  renderTwist();
  renderDirection();
}

function renderCardContextActions(cat) {
  const zone = document.getElementById('card-action-zone');
  zone.innerHTML = '';

  if (currentCard.category === 'SCUDO') {
    zone.innerHTML = `
      <button 
        id="grant-shield-btn"
        onclick="grantShieldToCurrentPlayer()" 
        class="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        <i class="fa-solid fa-shield-halved"></i>
        <span>Assegna Scudo a ${escapeHtml(currentP1.name)}</span>
      </button>
    `;
  } else if (currentCard.category === 'REGOLA' || currentCard.category === 'MALEDIZIONE') {
    const isRule = currentCard.category === 'REGOLA';
    const btnColor = isRule 
      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/25' 
      : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/25';
    const btnLabel = isRule 
      ? 'Attiva Regola sul Tavolo' 
      : 'Attiva Maledizione sul Tavolo';

    zone.innerHTML = `
      <button 
        id="pin-effect-btn"
        onclick="pinCurrentCardEffect()" 
        class="w-full py-3 px-4 rounded-xl ${btnColor} font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        <i class="fa-solid fa-thumbtack"></i>
        <span>${btnLabel} (${currentCard.duration || 5} giri)</span>
      </button>
    `;
  } else if (currentCard.category === 'CATENA') {
    zone.innerHTML = `
      <div class="flex items-center gap-2">
        <button 
          id="chain-timer-btn"
          onclick="startOrResetChainTimer()" 
          class="flex-1 py-2.5 px-4 rounded-xl bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/50 text-yellow-300 font-extrabold text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <i class="fa-solid fa-stopwatch"></i>
          <span id="chain-timer-label">Avvia Timer 3.0s</span>
        </button>
      </div>
    `;
  } else if (currentCard.category === 'GIURIA') {
    zone.innerHTML = `
      <button 
        id="jury-countdown-btn"
        onclick="triggerJuryCountdown()" 
        class="w-full py-2.5 px-4 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/50 text-orange-300 font-extrabold text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        <i class="fa-solid fa-bullhorn"></i>
        <span id="jury-countdown-label">Avvia Conto "1... 2... 3... INDICA!"</span>
      </button>
    `;
  } else {
    // Subtle tip for Duello or Bersaglio
    const helperText = currentCard.category === 'DUELLO'
      ? `⚔️ Sfida diretta: ${escapeHtml(currentP1.name)} contro ${escapeHtml(currentP2.name)}`
      : `🎯 Controllate tutti chi rientra nel bersaglio!`;
    zone.innerHTML = `
      <div class="text-center text-xs font-semibold text-slate-400 py-1">
        ${helperText}
      </div>
    `;
  }

  // Partita ripresa: se lo scudo o la regola di questa carta erano già stati usati, il pulsante resta "fatto".
  if (cardActionUsed) {
    if (currentCard.category === 'SCUDO') markShieldButtonDone();
    if (currentCard.category === 'REGOLA' || currentCard.category === 'MALEDIZIONE') markPinButtonDone();
  }
}

function markShieldButtonDone() {
  const btn = document.getElementById('grant-shield-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.className = 'w-full py-3 px-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-extrabold text-sm flex items-center justify-center gap-2 cursor-default';
  btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Scudo Assegnato a ${escapeHtml(currentP1.name)}!</span>`;
}

function markPinButtonDone() {
  const btn = document.getElementById('pin-effect-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.className = 'w-full py-3 px-4 rounded-xl bg-slate-800/90 border border-purple-500/40 text-purple-300 font-extrabold text-sm flex items-center justify-center gap-2 cursor-default';
  btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Attivata sul Tavolo!</span>`;
}

/*************************************************************************
 * 8. INTERACTIVE CARD FEATURES (Shields, Active Rules, 3s Timer, Jury)
 *************************************************************************/
function grantShieldToCurrentPlayer() {
  if (cardActionUsed) return;
  cardActionUsed = true;

  currentP1.shields += 1;
  playSound('shield');
  vibrate('short');
  renderShieldsBar();
  markShieldButtonDone();
  saveMatch();

  showToast(`🛡️ ${currentP1.name} ha ottenuto uno Scudo!`, 'success');
}

function pinCurrentCardEffect() {
  if (cardActionUsed) return;
  cardActionUsed = true;

  const formattedTitle = formatPlainRuleTitle(
    currentCard.ruleTitle || currentCard.title,
    currentP1.name,
    currentP2.name
  );

  const formattedDesc = formatPlainRuleTitle(
    currentCard.text,
    currentP1.name,
    currentP2.name
  );

  activeEffects.push({
    uid: makeId('eff'),
    category: currentCard.category,
    title: formattedTitle,
    description: formattedDesc,
    turnsLeft: currentCard.duration || 5
  });

  playSound('rule');
  renderActiveEffectsBar();
  markPinButtonDone();
  saveMatch();

  showToast(`📌 Attivata: "${formattedTitle}"`, 'info');
}

// 3-Second Chain Timer Logic
function startOrResetChainTimer() {
  if (chainTimerInterval) {
    clearInterval(chainTimerInterval);
    chainTimerInterval = null;
  }

  chainTimeLeft = 3.0;
  const btn = document.getElementById('chain-timer-btn');
  const label = document.getElementById('chain-timer-label');
  if (!btn || !label) return;

  playSound('tick');
  btn.className = 'flex-1 py-2.5 px-4 rounded-xl bg-yellow-400 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2 timer-urgent';
  label.textContent = `⏱️ ${chainTimeLeft.toFixed(1)}s (Tocca per Reset al prossimo)`;

  let lastWholeSecond = 3;
  const startedAt = performance.now();

  chainTimerInterval = setInterval(() => {
    chainTimeLeft = Math.max(0, 3 - (performance.now() - startedAt) / 1000);
    if (chainTimeLeft <= 0) {
      clearInterval(chainTimerInterval);
      chainTimerInterval = null;
      playSound('buzzer');
      vibrate('long');
      btn.className = 'flex-1 py-2.5 px-4 rounded-xl bg-rose-600 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/40';
      label.textContent = '🚨 TEMPO SCADUTO! BEVI! (Tocca per riavviare)';
    } else {
      const currentWhole = Math.ceil(chainTimeLeft);
      if (currentWhole < lastWholeSecond) {
        lastWholeSecond = currentWhole;
        playSound('tick');
      }
      label.textContent = `⏱️ ${chainTimeLeft.toFixed(1)}s (Tocca per Reset 3s)`;
    }
  }, 50);
}

// Jury 3-2-1 Countdown Logic
function triggerJuryCountdown() {
  if (juryTimerInterval) {
    clearInterval(juryTimerInterval);
    juryTimerInterval = null;
  }

  const btn = document.getElementById('jury-countdown-btn');
  const label = document.getElementById('jury-countdown-label');
  if (!btn || !label) return;

  let step = 3;
  playSound('tick');
  label.textContent = `Pronti... ${step}!`;

  juryTimerInterval = setInterval(() => {
    step--;
    if (step > 0) {
      playSound('tick');
      label.textContent = `Pronti... ${step}!`;
    } else {
      clearInterval(juryTimerInterval);
      juryTimerInterval = null;
      playSound('success');
      vibrate('long');
      btn.className = 'w-full py-2.5 px-4 rounded-xl bg-orange-500 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2';
      label.textContent = '👉 INDICATE TUTTI ADESSO! 👈';
    }
  }, 850);
}

function stopActiveCardTimers() {
  if (chainTimerInterval) {
    clearInterval(chainTimerInterval);
    chainTimerInterval = null;
  }
  if (juryTimerInterval) {
    clearInterval(juryTimerInterval);
    juryTimerInterval = null;
  }
}

/*************************************************************************
 * 9. SHIELDS & ACTIVE RULES TOP BAR MANAGEMENT
 *************************************************************************/
let pendingShieldPlayerId = null;

function renderShieldsBar() {
  const bar = document.getElementById('players-shield-bar');
  bar.innerHTML = players.map((p, idx) => {
    const isCurrent = idx === currentTurnIndex;
    const hasShields = p.shields > 0;
    const activeRing = isCurrent
      ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white'
      : 'border-slate-800 bg-slate-900/80 text-slate-300';

    const shieldBadge = hasShields
      ? `<button 
           onclick="promptUseShield('${p.id}')" 
           class="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400/60 text-emerald-300 text-[11px] font-extrabold flex items-center gap-0.5 hover:bg-emerald-400 hover:text-slate-950 transition-colors"
           title="Usa uno scudo di ${escapeHtml(p.name)}"
         >
           🛡️ ${p.shields}
         </button>`
      : `<span class="ml-1 text-[10px] text-slate-600">0</span>`;

    return `
      <div class="shrink-0 flex items-center px-2.5 py-1 rounded-xl border text-xs font-bold transition-all ${activeRing}">
        <span>${escapeHtml(p.name)}</span>
        ${shieldBadge}
      </div>
    `;
  }).join('');
}

function promptUseShield(playerId) {
  const player = players.find(p => p.id === playerId);
  if (!player || player.shields <= 0) return;

  pendingShieldPlayerId = playerId;
  document.getElementById('shield-modal-text').innerHTML = `
    Vuoi consumare uno <strong>Scudo 🛡️</strong> di <strong class="text-emerald-400">${escapeHtml(player.name)}</strong> per annullare la sua bevuta?
  `;

  const confirmBtn = document.getElementById('confirm-use-shield-btn');
  confirmBtn.onclick = () => confirmUseShield();

  openModal('shield-modal');
}

function confirmUseShield() {
  const player = players.find(p => p.id === pendingShieldPlayerId);
  if (player && player.shields > 0) {
    player.shields -= 1;
    playSound('shield');
    renderShieldsBar();
    saveMatch();
    showToast(`🛡️ ${player.name} ha usato uno Scudo e salta la bevuta!`, 'success');
  }
  closeShieldModal();
}

function closeShieldModal() {
  pendingShieldPlayerId = null;
  closeModal('shield-modal');
}

function renderActiveEffectsBar() {
  const countEl = document.getElementById('active-rules-count');
  const chipsEl = document.getElementById('active-rules-chips');
  countEl.textContent = activeEffects.length;

  if (activeEffects.length === 0) {
    chipsEl.innerHTML = `
      <span class="text-[11px] text-slate-500 italic px-1">
        Nessuna regola o maledizione attiva al momento
      </span>
    `;
    return;
  }

  chipsEl.innerHTML = activeEffects.map(eff => {
    const isRule = eff.category === 'REGOLA';
    const pillStyle = isRule
      ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
      : 'bg-pink-500/20 border-pink-500/50 text-pink-200';
    const icon = isRule ? '👑' : '🔗';

    return `
      <div class="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${pillStyle}">
        <span onclick="openRulesModal()" class="cursor-pointer truncate max-w-[165px]">
          ${icon} ${escapeHtml(eff.title)}
        </span>
        <span class="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-extrabold">
          ${eff.turnsLeft}g
        </span>
        <button 
          onclick="dismissEffect('${eff.uid}')" 
          class="text-slate-400 hover:text-white ml-0.5"
          title="Rimuovi dal tavolo"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  }).join('');
}

function dismissEffect(uid) {
  activeEffects = activeEffects.filter(e => e.uid !== uid);
  saveMatch();
  renderActiveEffectsBar();
  renderRulesModalList();
  showToast('Regola/Maledizione rimossa dal tavolo', 'info');
}

function openRulesModal() {
  renderRulesModalList();
  playSound('tap');
  openModal('rules-modal');
}

function closeRulesModal() {
  closeModal('rules-modal');
}

function renderRulesModalList() {
  const list = document.getElementById('rules-modal-list');
  if (activeEffects.length === 0) {
    list.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-sm">
        Nessuna regola o maledizione attiva sul tavolo.
      </div>
    `;
    return;
  }

  list.innerHTML = activeEffects.map(eff => {
    const isRule = eff.category === 'REGOLA';
    const borderClass = isRule ? 'border-purple-500/40 bg-purple-950/20' : 'border-pink-500/40 bg-pink-950/20';
    const badgeText = isRule ? '👑 Nuova Regola' : '🔗 Maledizione';

    return `
      <div class="p-3.5 rounded-2xl border ${borderClass} space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-extrabold uppercase tracking-wider text-fuchsia-300">
            ${badgeText} • ${eff.turnsLeft} giri rimasti
          </span>
          <button 
            onclick="dismissEffect('${eff.uid}')" 
            class="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
          >
            <i class="fa-solid fa-trash-can"></i> Rimuovi
          </button>
        </div>
        <div class="font-display font-bold text-white text-sm">${escapeHtml(eff.title)}</div>
        <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(eff.description)}</p>
      </div>
    `;
  }).join('');
}

/*************************************************************************
 * 10. SETTINGS & MID-GAME PLAYER MANAGEMENT
 *************************************************************************/
function openResetModal() {
  renderMidgamePlayersList();
  playSound('tap');
  openModal('reset-modal');
}

function renderMidgamePlayersList() {
  const list = document.getElementById('midgame-players-list');
  const canRemove = players.length > 2;
  list.innerHTML = players.map(p => `
    <span class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200">
      ${escapeHtml(p.name)}${p.shields > 0 ? ` <span class="text-emerald-300">🛡️${p.shields}</span>` : ''}
      <button
        type="button"
        onclick="removePlayerMidGame('${p.id}')"
        ${canRemove ? '' : 'disabled'}
        class="w-6 h-6 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center disabled:opacity-30"
        aria-label="Togli ${escapeHtml(p.name)}"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
  `).join('') + (canRemove ? '' : '<p class="w-full text-[11px] text-slate-500 mt-1">Servono almeno 2 giocatori al tavolo.</p>');
}

/** Toglie un giocatore che se ne va: la carta sul tavolo resta, cambiano solo i nomi se serve. */
function removePlayerMidGame(id) {
  if (players.length <= 2) {
    showToast('Servono almeno 2 giocatori!', 'warning');
    return;
  }
  const idx = players.findIndex(p => p.id === id);
  if (idx === -1) return;
  const removed = players[idx];
  players.splice(idx, 1);
  if (idx < currentTurnIndex) currentTurnIndex -= 1;
  if (currentTurnIndex >= players.length) currentTurnIndex = 0;
  fixCurrentPlayersAfterChange();
  persistPlayers();
  if (currentCard) updateGameUI();
  renderMidgamePlayersList();
  showToast(`👋 ${removed.name} ha lasciato il tavolo`, 'info');
}

/** Dopo aver tolto giocatori: il turno e l'avversario devono essere persone ancora al tavolo. */
function fixCurrentPlayersAfterChange() {
  if (players.length === 0) return;
  if (currentTurnIndex >= players.length || currentTurnIndex < 0) currentTurnIndex = 0;
  if (!currentP1 || !players.includes(currentP1)) {
    currentP1 = players[currentTurnIndex];
  } else {
    currentTurnIndex = players.indexOf(currentP1);
  }
  if (!currentP2 || !players.includes(currentP2) || currentP2 === currentP1) {
    currentP2 = pickRandomOpponent(currentP1.id);
  }
}

function closeResetModal() {
  closeModal('reset-modal');
}

function handleAddPlayerMidGame(e) {
  e.preventDefault();
  const input = document.getElementById('midgame-player-input');
  const name = input.value.trim();
  if (!name) return;

  if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('Questo giocatore è già in partita!', 'warning');
    return;
  }

  players.push({
    id: makeId('p'),
    name,
    shields: 0
  });

  input.value = '';
  persistPlayers();
  renderShieldsBar();
  closeResetModal();
  showToast(`🎉 ${name} si è unito al tavolo!`, 'success');
}

function reshuffleDeckManual() {
  buildAndShuffleDeck();
  closeResetModal();
  drawCardForCurrentTurn(true);
  showToast(`🔀 Mazzo rimescolato! Tutte le ${customDeck.length} carte sono di nuovo nel mazzo.`, 'success');
}

function returnToLobby() {
  stopActiveCardTimers();
  closeResetModal();
  saveMatch();
  playSound('back');
  document.getElementById('game-screen').classList.add('hidden');
  const lobby = document.getElementById('start-screen');
  lobby.classList.remove('hidden', 'animate-pop-in');
  void lobby.offsetWidth;
  lobby.classList.add('animate-pop-in');
  window.scrollTo(0, 0);
  renderLobbyPlayers();
  updateDeckCountBadges();
}

/*************************************************************************
 * 10A. PARTITA SALVATA: si riprende anche dopo aver chiuso l'app
 *************************************************************************/
function saveMatch() {
  if (!currentCard || !currentP1) return;
  saveJSON(MATCH_STORAGE_KEY, {
    active: true,
    players: players.map(p => ({ id: p.id, name: p.name, shields: p.shields || 0 })),
    currentTurnIndex,
    deckIds: deck.map(c => c.id),
    playedCount,
    currentCard,
    p1Id: currentP1.id,
    p2Id: currentP2 ? currentP2.id : null,
    activeEffects,
    cardActionUsed,
    direction,
    skipPlayerId,
    twistId: currentTwistId,
    savedAt: new Date().toISOString()
  });
}

/** Rimette in memoria la partita salvata (senza aprirla). true se c'era. */
function loadSavedMatch() {
  const m = loadJSON(MATCH_STORAGE_KEY, null);
  if (!m || !m.active || !Array.isArray(m.players) || m.players.length < 2 || !m.currentCard || !CATEGORIES[m.currentCard.category]) {
    return false;
  }
  players = m.players
    .filter(p => p && p.id && typeof p.name === 'string' && p.name.trim())
    .map(p => ({ id: String(p.id), name: p.name.trim().slice(0, 18), shields: Math.max(0, Number(p.shields) || 0) }));
  if (players.length < 2) return false;

  const byId = new Map(customDeck.map(c => [c.id, c]));
  deck = (Array.isArray(m.deckIds) ? m.deckIds : []).map(id => byId.get(id)).filter(Boolean).map(c => ({ ...c }));
  playedCount = Math.max(1, Number(m.playedCount) || 1);
  currentCard = { ...m.currentCard };
  activeEffects = Array.isArray(m.activeEffects) ? m.activeEffects.filter(e => e && e.uid && e.title) : [];
  cardActionUsed = !!m.cardActionUsed;
  currentTurnIndex = Math.min(Math.max(0, Number(m.currentTurnIndex) || 0), players.length - 1);
  currentP1 = players.find(p => p.id === m.p1Id) || null;
  currentP2 = players.find(p => p.id === m.p2Id) || null;
  direction = m.direction === -1 ? -1 : 1;
  skipPlayerId = players.some(p => p.id === m.skipPlayerId) ? m.skipPlayerId : null;
  currentTwistId = findNeonTwist(m.twistId) ? m.twistId : null;
  fixCurrentPlayersAfterChange();
  return true;
}

function renderResumeButton() {
  const btn = document.getElementById('resume-game-btn');
  const startLabel = document.getElementById('start-game-label');
  const canResume = !!currentCard && players.length >= 2;
  btn.classList.toggle('hidden', !canResume);
  document.getElementById('resume-game-label').textContent = canResume
    ? `RIPRENDI LA PARTITA (CARTA ${Math.max(1, playedCount)})`
    : 'RIPRENDI LA PARTITA';
  startLabel.textContent = currentCard ? 'NUOVA PARTITA' : 'INIZIA LA SERATA';
}

function resumeGame() {
  if (!currentCard || players.length < 2) return;
  fixCurrentPlayersAfterChange();
  saveMatch();
  showGameScreen();
  const cardEl = document.getElementById('active-card');
  updateGameUI();
  cardEl.classList.remove('animate-card-out', 'animate-card-in');
  void cardEl.offsetWidth;
  cardEl.classList.add('animate-card-in');
  playSound('start');
  vibrate('short');
}

/*************************************************************************
 * 10C. TASTO INDIETRO DI ANDROID (chiamato da src/native.js)
 * true = gestito qui; false = si torna al menu dei giochi.
 *************************************************************************/
window.handleAndroidBack = function handleAndroidBack() {
  if (isModalOpen('restore-deck-modal')) { closeRestoreDefaultConfirm(); return true; }
  if (isModalOpen('deck-manager-modal')) {
    if (!document.getElementById('deck-tab-form').classList.contains('hidden')) {
      switchDeckManagerTab('list');
    } else {
      closeDeckManagerModal();
    }
    return true;
  }
  if (isModalOpen('shield-modal')) { closeShieldModal(); return true; }
  if (isModalOpen('rules-modal')) { closeRulesModal(); return true; }
  if (isModalOpen('reset-modal')) { closeResetModal(); return true; }
  if (isGameScreenVisible()) { returnToLobby(); return true; }
  return false;
};

/*************************************************************************
 * 10B. DECK MANAGER & CUSTOM CARD EDITOR FUNCTIONS
 *************************************************************************/
function openDeckManagerModal(initialTab = 'list') {
  renderCategoryFilterPills();
  renderDeckManagerList();
  if (initialTab === 'form') {
    prepareNewCardForm();
  } else {
    switchDeckManagerTab('list');
  }
  playSound('tap');
  openModal('deck-manager-modal');
}

function closeDeckManagerModal() {
  closeModal('deck-manager-modal');
}

function switchDeckManagerTab(tab) {
  const listTab = document.getElementById('deck-tab-list');
  const formTab = document.getElementById('deck-tab-form');
  const btnList = document.getElementById('tab-btn-list');
  const btnForm = document.getElementById('tab-btn-form');

  if (tab === 'list') {
    listTab.classList.remove('hidden');
    formTab.classList.add('hidden');
    btnList.className = 'py-2 px-3 rounded-xl font-display font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 bg-purple-600 text-white shadow';
    btnForm.className = 'py-2 px-3 rounded-xl font-display font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white';
    document.getElementById('tab-form-label').textContent = 'Nuova Carta';
    renderDeckManagerList();
  } else {
    listTab.classList.add('hidden');
    formTab.classList.remove('hidden');
    btnForm.className = 'py-2 px-3 rounded-xl font-display font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 bg-fuchsia-600 text-white shadow';
    btnList.className = 'py-2 px-3 rounded-xl font-display font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-white';
  }
}

function renderCategoryFilterPills() {
  const container = document.getElementById('deck-category-filters');
  const filters = [
    { id: 'ALL', label: 'Tutte' },
    { id: 'CUSTOM', label: '✨ Personalizzate/Modificate' },
    { id: 'CATENA', label: '⚡ Catena' },
    { id: 'BERSAGLIO', label: '🎯 Bersaglio' },
    { id: 'DUELLO', label: '⚔️ Duello' },
    { id: 'SCUDO', label: '🛡️ Scudo' },
    { id: 'REGOLA', label: '👑 Regola' },
    { id: 'GIURIA', label: '⚖️ Giuria' },
    { id: 'MALEDIZIONE', label: '🔗 Maledizione' }
  ];

  container.innerHTML = filters.map(f => {
    const active = selectedEditorCategoryFilter === f.id;
    const style = active
      ? 'bg-fuchsia-500 text-white border-fuchsia-400 shadow-sm'
      : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200';
    return `
      <button 
        type="button"
        onclick="setEditorCategoryFilter('${f.id}')"
        class="shrink-0 px-2.5 py-1 rounded-xl border transition-all ${style}"
      >
        ${f.label}
      </button>
    `;
  }).join('');
}

function setEditorCategoryFilter(filterId) {
  selectedEditorCategoryFilter = filterId;
  renderCategoryFilterPills();
  renderDeckManagerList();
}

function clearDeckSearch() {
  const input = document.getElementById('deck-search-input');
  input.value = '';
  renderDeckManagerList();
}

function renderDeckManagerList() {
  const listEl = document.getElementById('deck-manager-cards-list');
  const query = (document.getElementById('deck-search-input')?.value || '').trim().toLowerCase();

  const filtered = customDeck.filter(card => {
    if (selectedEditorCategoryFilter === 'CUSTOM') {
      if (!card.isCustom && !card.isEdited) return false;
    } else if (selectedEditorCategoryFilter !== 'ALL') {
      if (card.category !== selectedEditorCategoryFilter) return false;
    }
    if (query) {
      const matchTitle = card.title.toLowerCase().includes(query);
      const matchText = card.text.toLowerCase().includes(query);
      return matchTitle || matchText;
    }
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs sm:text-sm">
        <i class="fa-solid fa-layer-group text-2xl mb-2 block text-slate-600"></i>
        Nessuna carta trovata con questi filtri.
      </div>
    `;
    return;
  }

  // Show custom/edited or newest cards effectively
  listEl.innerHTML = filtered.map(card => {
    const cat = CATEGORIES[card.category] || CATEGORIES.CATENA;
    let statusBadge = '';
    if (card.isCustom) {
      statusBadge = `<span class="px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-[10px] font-bold">Custom</span>`;
    } else if (card.isEdited) {
      statusBadge = `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">Modificata</span>`;
    }

    return `
      <div class="p-3 rounded-2xl bg-slate-900/85 border border-slate-800/90 hover:border-slate-700 transition-all space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${cat.badgeClass}">
              <i class="fa-solid ${cat.icon}"></i> ${cat.name}
            </span>
            <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
              🍺 ${escapeHtml(card.sips)}
            </span>
            ${statusBadge}
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button 
              type="button"
              onclick="startEditingCard(${card.id})"
              class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-600/30 hover:text-purple-200 text-slate-300 text-xs font-bold transition-colors flex items-center gap-1"
              title="Modifica carta"
            >
              <i class="fa-solid fa-pen text-[10px]"></i>
              <span>Modifica</span>
            </button>
            <button 
              type="button"
              onclick="deleteCardFromDeck(${card.id})"
              class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-rose-500/25 hover:text-rose-300 text-slate-400 text-xs flex items-center justify-center transition-colors"
              title="Elimina carta"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>

        <div class="font-display font-bold text-sm text-white">
          ${escapeHtml(card.title)}
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">
          ${escapeHtml(card.text)}
        </p>
      </div>
    `;
  }).join('');
}

function handleFormCategoryChange() {
  const cat = document.getElementById('form-card-category').value;
  const extraBox = document.getElementById('form-rule-extra-fields');
  if (cat === 'REGOLA' || cat === 'MALEDIZIONE') {
    extraBox.classList.remove('hidden');
  } else {
    extraBox.classList.add('hidden');
  }

  // Suggest appropriate default sips if creating a new card
  const editingId = document.getElementById('edit-card-id').value;
  if (!editingId) {
    if (cat === 'SCUDO') setFormSips('Immunità');
    else if (cat === 'GIURIA') setFormSips('1 Sorso x Voto');
    else if (cat === 'REGOLA') setFormSips('Penalità 1 Sorso');
    else if (cat === 'MALEDIZIONE') setFormSips('Legame 5 Giri');
  }
}

function setFormSips(val) {
  document.getElementById('form-card-sips').value = val;
}

function insertPlaceholderInText(placeholder) {
  const textarea = document.getElementById('form-card-text');
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const currentVal = textarea.value;

  textarea.value = currentVal.substring(0, start) + placeholder + currentVal.substring(end);
  textarea.focus();
  const newCursorPos = start + placeholder.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
}

function prepareNewCardForm() {
  document.getElementById('edit-card-id').value = '';
  document.getElementById('editing-mode-banner').classList.add('hidden');
  document.getElementById('tab-form-label').textContent = 'Nuova Carta';
  document.getElementById('form-save-card-label').textContent = 'Aggiungi Carta al Mazzo';

  document.getElementById('form-card-category').value = 'DUELLO';
  document.getElementById('form-card-title').value = '';
  document.getElementById('form-card-sips').value = '2 Sorsi';
  document.getElementById('form-card-text').value = '';
  document.getElementById('form-card-ruletitle').value = '';
  document.getElementById('form-card-duration').value = '6';

  handleFormCategoryChange();
  switchDeckManagerTab('form');
}

function startEditingCard(cardId) {
  const card = customDeck.find(c => c.id === cardId);
  if (!card) return;

  document.getElementById('edit-card-id').value = String(card.id);
  document.getElementById('editing-mode-banner').classList.remove('hidden');
  document.getElementById('tab-form-label').textContent = 'Modifica Carta';
  document.getElementById('form-save-card-label').textContent = 'Salva Modifiche';

  document.getElementById('form-card-category').value = card.category;
  document.getElementById('form-card-title').value = card.title;
  document.getElementById('form-card-sips').value = card.sips;
  document.getElementById('form-card-text').value = card.text;
  document.getElementById('form-card-ruletitle').value = card.ruleTitle || card.title;
  document.getElementById('form-card-duration').value = card.duration || 6;

  handleFormCategoryChange();
  switchDeckManagerTab('form');
}

function handleSaveCardForm(e) {
  e.preventDefault();

  const editIdRaw = document.getElementById('edit-card-id').value;
  const category = document.getElementById('form-card-category').value;
  const title = document.getElementById('form-card-title').value.trim();
  const sips = document.getElementById('form-card-sips').value.trim() || '2 Sorsi';
  const text = document.getElementById('form-card-text').value.trim();
  const ruleTitle = document.getElementById('form-card-ruletitle').value.trim();
  const duration = parseInt(document.getElementById('form-card-duration').value, 10) || 6;

  if (!title || !text) {
    showToast('Compila sia il titolo che il testo della carta!', 'warning');
    return;
  }

  if (editIdRaw) {
    // Edit existing card
    const editId = Number(editIdRaw);
    const idx = customDeck.findIndex(c => c.id === editId);
    if (idx !== -1) {
      const updatedCard = {
        ...customDeck[idx],
        category,
        title,
        sips,
        text,
        isEdited: !customDeck[idx].isCustom
      };
      if (category === 'REGOLA' || category === 'MALEDIZIONE') {
        updatedCard.ruleTitle = ruleTitle || title;
        updatedCard.duration = duration;
      }
      customDeck[idx] = updatedCard;

      // Update card in active game deck if present
      const activeDeckIdx = deck.findIndex(c => c.id === editId);
      if (activeDeckIdx !== -1) {
        deck[activeDeckIdx] = { ...updatedCard };
      }

      // If the currently displayed card is the one we just edited, refresh it live!
      if (currentCard && currentCard.id === editId) {
        currentCard = { ...updatedCard };
        updateGameUI();
      }

      playSound('shield');
      showToast(`✏️ Carta "${title}" aggiornata!`, 'success');
    }
  } else {
    // Create brand new card
    const newId = Date.now();
    const newCard = {
      id: newId,
      category,
      title,
      sips,
      text,
      isCustom: true
    };
    if (category === 'REGOLA' || category === 'MALEDIZIONE') {
      newCard.ruleTitle = ruleTitle || title;
      newCard.duration = duration;
    }

    // Unshift so it appears at the top of the editor list
    customDeck.unshift(newCard);

    // Also inject into current active game deck at a random position if a game is running
    if (deck.length > 0) {
      const randPos = Math.floor(Math.random() * (deck.length + 1));
      deck.splice(randPos, 0, { ...newCard });
    }

    playSound('shield');
    showToast(`✨ Nuova carta "${title}" aggiunta al mazzo!`, 'success');
  }

  saveCustomDeckToStorage();
  switchDeckManagerTab('list');
}

function deleteCardFromDeck(cardId) {
  if (customDeck.length <= 1) {
    showToast('Il mazzo deve contenere almeno 1 carta!', 'danger');
    return;
  }

  const target = customDeck.find(c => c.id === cardId);
  if (!target) return;

  customDeck = customDeck.filter(c => c.id !== cardId);
  deck = deck.filter(c => c.id !== cardId);

  saveCustomDeckToStorage();
  renderDeckManagerList();
  showToast(`🗑️ Carta "${target.title}" rimossa dal mazzo`, 'info');
}

function openRestoreDefaultConfirm() {
  openModal('restore-deck-modal');
}

function closeRestoreDefaultConfirm() {
  closeModal('restore-deck-modal');
}

function confirmRestoreDefaultDeck() {
  customDeck = MASTER_DECK.map(card => ({ ...card }));
  saveCustomDeckToStorage();
  buildAndShuffleDeck();
  if (currentCard) saveMatch();
  selectedEditorCategoryFilter = 'ALL';
  renderCategoryFilterPills();
  renderDeckManagerList();
  closeRestoreDefaultConfirm();

  if (currentCard && isGameScreenVisible()) {
    drawCardForCurrentTurn(true);
  }

  playSound('success');
  showToast('🔄 Mazzo originale da 70 carte ripristinato!', 'success');
}

/*************************************************************************
 * 11. UTILITIES & INITIALIZATION
 *************************************************************************/
// escapeHtml() è in public/common.js

function initNeonSips() {
  const settings = loadJSON(SETTINGS_STORAGE_KEY, {});
  // Versione 1.0: l'audio di Neon Sips aveva un interruttore suo; ora i suoni sono uguali per tutti i giochi
  if (settings.audioEnabled === false) setAppSetting('sound', false);
  twistsEnabled = settings.twists !== false;
  saveJSON(SETTINGS_STORAGE_KEY, { twists: twistsEnabled });
  document.getElementById('twists-toggle').checked = twistsEnabled;
  renderSoundButtons();

  loadCustomDeckFromStorage();
  if (!loadSavedMatch()) {
    players = loadSavedPlayerNames().map(name => ({ id: makeId('p'), name, shields: 0 }));
  }
  renderLobbyPlayers();
}

window.addEventListener('DOMContentLoaded', initNeonSips);
