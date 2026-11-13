'use strict';

/* =========================================================================
   VERITÀ O BEVI: schermate e partita.
   Usa public/common.js (memoria, suoni, finestre, imprevisti) e
   public/verita-o-bevi/questions.js (livelli, domande e regole pure).
========================================================================= */

// Chiavi da non cambiare: chi ha già l'app perderebbe impostazioni, domande e partita.
const VB_KEYS = {
  SETTINGS: 'cincin_verita_settings_v1',
  CUSTOM: 'cincin_verita_custom_v1',
  MATCH: 'cincin_verita_match_v1'
};

let vbSettings = defaultVeritaSettings();
let vbCustom = [];                 // [{ id, text }]
let vbQuestionsById = new Map();
let vbCounts = {};
let vbPlayers = [];                // [{ id, name }]
let vbMatch = null;                // partita: vedi startVerita()
let vbAnimating = false;
let vbPendingAdultCategory = null; // livello 18+ da accendere dopo la conferma

/* ---------- Avvio ---------- */
window.addEventListener('DOMContentLoaded', () => {
  vbSettings = sanitizeVeritaSettings(loadJSON(VB_KEYS.SETTINGS, null));
  vbCustom = loadJSON(VB_KEYS.CUSTOM, []);
  if (!Array.isArray(vbCustom)) vbCustom = [];
  refreshQuestions();
  vbMatch = loadMatch();
  if (vbMatch) {
    vbPlayers = vbMatch.players.map(p => ({ ...p }));
  } else {
    vbPlayers = loadSavedPlayerNames().map(name => ({ id: makeId('p'), name }));
  }
  renderSetup();

  // Invio sulla tastiera = aggiungi domanda
  document.getElementById('custom-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('custom-form').requestSubmit();
    }
  });
});

// Tasto Indietro di Android (chiamato da src/native.js): true = gestito qui.
window.handleAndroidBack = function handleAndroidBack() {
  if (isModalOpen('adult-modal')) { closeAdultModal(); return true; }
  if (isModalOpen('leaderboard-modal')) { closeLeaderboardModal(); return true; }
  if (isModalOpen('options-modal')) { closeOptionsModal(); return true; }
  if (isModalOpen('custom-modal')) { closeCustomModal(); return true; }
  if (isGameScreenVisible()) { showSetupScreen(); return true; }
  return false;
};

function refreshQuestions() {
  const all = allVeritaQuestions(vbCustom);
  vbQuestionsById = new Map(all.map(q => [q.id, q]));
  vbCounts = countVeritaByCategory(all);
}

function saveSettings() {
  saveJSON(VB_KEYS.SETTINGS, vbSettings);
}

function enabledQuestions() {
  return allVeritaQuestions(vbCustom).filter(q => vbSettings.categories[q.category]);
}

function isGameScreenVisible() {
  return !document.getElementById('game-screen').classList.contains('hidden');
}

function playerById(id) {
  return vbPlayers.find(p => p.id === id) || null;
}

function initials(name) {
  return String(name || '?').trim().slice(0, 2).toUpperCase();
}

/* =========================================================================
   PARTITA SALVATA
========================================================================= */
function loadMatch() {
  const m = loadJSON(VB_KEYS.MATCH, null);
  if (!m || !m.active || !Array.isArray(m.order) || !Array.isArray(m.players)) return null;
  const players = m.players
    .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim())
    .map(p => ({ id: p.id, name: p.name.trim().slice(0, 18) }));
  const order = m.order.filter(id => vbQuestionsById.has(id));
  if (players.length < 2 || order.length === 0) return null;
  return {
    active: true,
    players,
    order,
    index: Math.min(Math.max(0, Number(m.index) || 0), order.length - 1),
    turnIndex: Math.min(Math.max(0, Number(m.turnIndex) || 0), players.length - 1),
    p1Id: typeof m.p1Id === 'string' ? m.p1Id : null,
    p2Id: typeof m.p2Id === 'string' ? m.p2Id : null,
    twistId: findVeritaTwist(m.twistId) ? m.twistId : null,
    stats: m.stats && typeof m.stats === 'object' ? m.stats : {},
    round: Math.max(1, Number(m.round) || 1)
  };
}

function saveMatch() {
  if (!vbMatch) return;
  vbMatch.players = vbPlayers.map(p => ({ id: p.id, name: p.name }));
  saveJSON(VB_KEYS.MATCH, vbMatch);
}

/** Giocatore di turno e "altro giocatore" devono essere ancora al tavolo. */
function fixTurnPlayers() {
  if (!vbMatch || vbPlayers.length === 0) return;
  if (vbMatch.turnIndex >= vbPlayers.length || vbMatch.turnIndex < 0) vbMatch.turnIndex = 0;
  if (!playerById(vbMatch.p1Id)) {
    vbMatch.p1Id = vbPlayers[vbMatch.turnIndex].id;
  } else {
    vbMatch.turnIndex = vbPlayers.findIndex(p => p.id === vbMatch.p1Id);
  }
  if (!playerById(vbMatch.p2Id) || vbMatch.p2Id === vbMatch.p1Id) {
    vbMatch.p2Id = pickOtherPlayer(vbMatch.p1Id);
  }
}

function pickOtherPlayer(excludeId) {
  const others = vbPlayers.filter(p => p.id !== excludeId);
  if (others.length === 0) return excludeId;
  return others[Math.floor(Math.random() * others.length)].id;
}

/**
 * Livelli o domande cambiati a partita in corso: le domande già uscite restano,
 * quelle da fare si rifanno con i livelli accesi adesso (col crescendo si riparte dal livello a cui si era).
 */
function rebuildRemaining() {
  if (!vbMatch) return;
  const played = vbMatch.order.slice(0, vbMatch.index + 1).filter(id => vbQuestionsById.has(id));
  const playedSet = new Set(played);
  const pool = enabledQuestions().filter(q => !playedSet.has(q.id));
  let remaining = buildVeritaOrder(pool, vbSettings.categories, vbSettings.crescendo);
  if (vbSettings.crescendo && played.length > 0) {
    const current = vbQuestionsById.get(played[played.length - 1]);
    const level = current ? VERITA_CATEGORIES[current.category].level : 1;
    const lv = id => VERITA_CATEGORIES[vbQuestionsById.get(id).category].level;
    remaining = remaining.filter(id => lv(id) >= level - 1).concat(remaining.filter(id => lv(id) < level - 1));
  }
  if (played.length === 0 && remaining.length === 0) {
    vbMatch = null;
    removeSaved(VB_KEYS.MATCH);
    return;
  }
  vbMatch.order = played.concat(remaining);
  vbMatch.index = Math.min(vbMatch.index, vbMatch.order.length - 1);
  saveMatch();
}

/* =========================================================================
   SCHERMATA GIOCATORI E LIVELLI
========================================================================= */
function renderSetup() {
  document.getElementById('custom-count').textContent = vbCustom.length;
  document.getElementById('twists-toggle').checked = !!vbSettings.twists;
  document.getElementById('crescendo-toggle').checked = !!vbSettings.crescendo;
  renderPlayersList();
  renderCategories();

  const total = enabledQuestions().length;
  document.getElementById('selected-count-badge').textContent = `${total} ${total === 1 ? 'domanda' : 'domande'}`;

  const enoughPlayers = vbPlayers.length >= 2;
  const startBtn = document.getElementById('start-btn');
  startBtn.disabled = total === 0 || !enoughPlayers;
  document.getElementById('start-label').textContent = !enoughPlayers
    ? 'SERVONO 2 GIOCATORI'
    : total === 0 ? 'SCEGLI UN LIVELLO' : (vbMatch ? 'NUOVA PARTITA' : 'INIZIA');

  const resumeBtn = document.getElementById('resume-btn');
  const canResume = !!vbMatch && enoughPlayers;
  resumeBtn.classList.toggle('hidden', !canResume);
  if (canResume) {
    document.getElementById('resume-label').textContent = `RIPRENDI (DOMANDA ${vbMatch.index + 1} DI ${vbMatch.order.length})`;
  }
}

function levelDotsHtml(cat) {
  return Array.from({ length: 6 }, (_, i) => {
    const on = i < cat.level;
    return `<span class="w-1.5 h-1.5 rounded-full" style="background: ${on ? cat.color : 'rgba(148,163,184,0.25)'}"></span>`;
  }).join('');
}

function renderCategories() {
  const list = document.getElementById('categories-list');
  list.innerHTML = Object.values(VERITA_CATEGORIES)
    .filter(c => c.id !== 'MIE' || vbCounts.MIE > 0)
    .map(c => {
      const on = !!vbSettings.categories[c.id];
      const adultTag = c.adult
        ? '<span class="px-1.5 py-px rounded-md bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-extrabold">18+</span>'
        : '';
      return `
        <label class="toggle-row ${on ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-950/40 border-slate-800/80 opacity-70'}">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border" style="background: ${c.bgSoft}; border-color: ${c.glow}">${c.emoji}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-sm text-white">${escapeHtml(c.name)}</span>
              ${adultTag}
              <span class="text-[11px] font-bold" style="color: ${c.color}">${vbCounts[c.id] || 0}</span>
              <span class="flex items-center gap-0.5 ml-auto" aria-hidden="true">${c.id === 'MIE' ? '' : levelDotsHtml(c)}</span>
            </div>
            <div class="text-xs text-slate-400 leading-snug">${escapeHtml(c.description)}</div>
          </div>
          <span class="switch" style="--switch-on: ${c.color}">
            <input type="checkbox" ${on ? 'checked' : ''} onchange="toggleCategory('${c.id}', this.checked)" aria-label="${escapeHtml(c.name)}" />
            <span class="track"></span>
          </span>
        </label>
      `;
    }).join('');
}

/** newPlayerId: il giocatore appena aggiunto entra con una piccola animazione. */
function renderPlayersList(newPlayerId) {
  const list = document.getElementById('players-list');
  document.getElementById('player-count-badge').textContent =
    `${vbPlayers.length} ${vbPlayers.length === 1 ? 'inserito' : 'inseriti'} (min 2)`;
  if (vbPlayers.length === 0) {
    list.innerHTML = `
      <div class="text-center py-6 px-4 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-sm">
        Scrivete i vostri nomi: le domande arrivano a turno, a ognuno.
      </div>`;
    return;
  }
  list.innerHTML = vbPlayers.map((p, idx) => `
    <div class="flex items-center justify-between bg-slate-900/75 border border-slate-800/90 rounded-xl px-3.5 py-2.5 ${p.id === newPlayerId ? 'animate-row-in' : ''}">
      <div class="flex items-center gap-3 min-w-0">
        <span class="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-xs font-bold text-white shrink-0">${idx + 1}</span>
        <span class="font-semibold text-slate-100 truncate">${escapeHtml(p.name)}</span>
      </div>
      <button type="button" onclick="removePlayer('${p.id}')" class="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors" aria-label="Togli ${escapeHtml(p.name)}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

/** Aggiunge un giocatore (null se il nome è vuoto o c'è già). */
function addPlayerByName(raw) {
  const name = String(raw || '').trim().slice(0, 18);
  if (!name) {
    showToast('Scrivi un nome!', 'warning');
    return null;
  }
  if (vbPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast(`${name} c'è già!`, 'warning');
    return null;
  }
  const player = { id: makeId('p'), name };
  vbPlayers.push(player);
  return player;
}

function persistPlayers() {
  savePlayerNames(vbPlayers.map(p => p.name));
  if (vbMatch) {
    fixTurnPlayers();
    saveMatch();
  }
}

function handleAddPlayer(e) {
  e.preventDefault();
  const input = document.getElementById('player-input');
  const player = addPlayerByName(input.value);
  if (!player) return;
  input.value = '';
  input.focus();
  playSound('tap');
  persistPlayers();
  renderSetup();
  renderPlayersList(player.id);
}

function removePlayer(id) {
  vbPlayers = vbPlayers.filter(p => p.id !== id);
  playSound('remove');
  persistPlayers();
  renderSetup();
}

function clearAllPlayers() {
  if (vbPlayers.length === 0) return;
  vbPlayers = [];
  playSound('remove');
  persistPlayers();
  renderSetup();
  showToast('Lista giocatori svuotata', 'info');
}

function addSamplePlayers() {
  ['Marco', 'Giulia', 'Ale', 'Sofia'].forEach(name => {
    if (!vbPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      vbPlayers.push({ id: makeId('p'), name });
    }
  });
  playSound('success');
  persistPlayers();
  renderSetup();
  showToast('Gruppo di amici aggiunto! 🍻', 'success');
}

function toggleCategory(id, on) {
  if (on && needsAdultConfirm(id, vbSettings)) {
    // Prima la conferma: l'interruttore resta spento finché non si conferma
    vbPendingAdultCategory = id;
    renderCategories();
    playSound('tap');
    openModal('adult-modal');
    return;
  }
  vbSettings.categories[id] = !!on;
  playSound('tap');
  saveSettings();
  if (vbMatch) rebuildRemaining();
  renderSetup();
}

function confirmAdult() {
  vbSettings.adultConfirmed = true;
  if (vbPendingAdultCategory) vbSettings.categories[vbPendingAdultCategory] = true;
  const cat = VERITA_CATEGORIES[vbPendingAdultCategory];
  vbPendingAdultCategory = null;
  saveSettings();
  closeModal('adult-modal');
  if (vbMatch) rebuildRemaining();
  renderSetup();
  playSound('success');
  if (cat) showToast(`${cat.emoji} ${cat.name} acceso`, 'success');
}

function closeAdultModal() {
  vbPendingAdultCategory = null;
  closeModal('adult-modal');
}

function toggleCrescendo(on) {
  vbSettings.crescendo = !!on;
  playSound('tap');
  saveSettings();
  if (vbMatch) rebuildRemaining();
  showToast(on ? '📈 Crescendo: si sale di livello piano piano' : 'Domande tutte mescolate', 'info');
}

function toggleTwists(on) {
  vbSettings.twists = !!on;
  playSound('tap');
  saveSettings();
  showToast(on ? '🎲 Imprevisti attivati' : 'Imprevisti disattivati', 'info');
}

function showSetupScreen() {
  closeModal('options-modal');
  if (isGameScreenVisible()) playSound('back');
  document.getElementById('game-screen').classList.add('hidden');
  showWithAnimation('setup-screen');
  renderSetup();
}

function showGameScreen() {
  document.getElementById('setup-screen').classList.add('hidden');
  showWithAnimation('game-screen');
}

function showWithAnimation(id) {
  const el = document.getElementById(id);
  el.classList.remove('hidden', 'animate-pop-in');
  void el.offsetWidth;
  el.classList.add('animate-pop-in');
  window.scrollTo(0, 0);
}

/* =========================================================================
   PARTITA
========================================================================= */
function startVerita() {
  if (vbPlayers.length < 2) {
    showToast('Servono almeno 2 giocatori!', 'warning');
    return;
  }
  const order = buildVeritaOrder(allVeritaQuestions(vbCustom), vbSettings.categories, vbSettings.crescendo);
  if (order.length === 0) {
    showToast('Accendi almeno un livello!', 'warning');
    return;
  }
  const p1 = vbPlayers[0];
  vbMatch = {
    active: true,
    players: [],
    order,
    index: 0,
    turnIndex: 0,
    p1Id: p1.id,
    p2Id: pickOtherPlayer(p1.id),
    twistId: null,
    stats: {},
    round: 1
  };
  vbMatch.twistId = pickVeritaTwist(vbSettings.twists, null, currentQuestion().text);
  saveMatch();
  playSound('start');
  vibrate('short');
  showGameScreen();
  renderCard('first');
}

function resumeVerita() {
  if (!vbMatch || vbPlayers.length < 2) return;
  fixTurnPlayers();
  saveMatch();
  playSound('start');
  vibrate('short');
  showGameScreen();
  renderCard('first');
}

function currentQuestion() {
  return vbQuestionsById.get(vbMatch.order[vbMatch.index]) || null;
}

/** Fine del turno: "Ho risposto", "Bevo" (o salto con il pass), poi tocca al prossimo. */
function resolveTurn(kind) {
  if (!vbMatch || vbAnimating) return;
  const p1 = playerById(vbMatch.p1Id);
  const q = currentQuestion();
  const twist = findVeritaTwist(vbMatch.twistId);
  let result = kind === 'answer' ? 'answer' : 'drink';
  if (result === 'drink' && twist && twist.effect === 'free') result = 'pass';
  if (p1) vbMatch.stats = recordVeritaTurn(vbMatch.stats, p1.id, result);

  if (result === 'answer') {
    playSound('success');
  } else if (result === 'drink') {
    const sips = refusalSips(q ? q.category : null, vbMatch.twistId);
    playSound('drink');
    showToast(`🍺 ${p1 ? p1.name : 'Chi è di turno'} beve ${sips} ${sips === 1 ? 'sorso' : 'sorsi'}!`, 'warning');
  } else {
    playSound('tap');
    showToast(`🎟️ ${p1 ? p1.name : 'Chi è di turno'} usa il pass: niente sorsi!`, 'info');
  }
  nextCard(true);
}

/** "Cambia domanda": stessa persona, domanda nuova (senza bere). */
function changeQuestion() {
  if (!vbMatch || vbAnimating) return;
  nextCard(false);
}

function nextCard(nextPlayer) {
  const previousTwist = vbMatch.twistId;
  if (vbMatch.index < vbMatch.order.length - 1) {
    vbMatch.index += 1;
  } else {
    // Domande finite: si rimescolano tutte quelle dei livelli accesi
    const order = buildVeritaOrder(allVeritaQuestions(vbCustom), vbSettings.categories, vbSettings.crescendo);
    if (order.length === 0) {
      showToast('Accendi almeno un livello!', 'warning');
      showSetupScreen();
      return;
    }
    const last = vbMatch.order[vbMatch.index];
    if (order.length > 1 && order[0] === last) order.push(order.shift());
    vbMatch.order = order;
    vbMatch.index = 0;
    vbMatch.round += 1;
    showToast(`🔄 Domande finite! Rimescolate tutte le ${order.length} domande.`, 'warning');
  }
  if (nextPlayer) vbMatch.turnIndex = (vbMatch.turnIndex + 1) % vbPlayers.length;
  const p1 = vbPlayers[vbMatch.turnIndex];
  vbMatch.p1Id = p1.id;
  vbMatch.p2Id = pickOtherPlayer(p1.id);
  const q = currentQuestion();
  vbMatch.twistId = pickVeritaTwist(vbSettings.twists, previousTwist, q ? q.text : '');
  saveMatch();
  renderCard('next');
}

const VB_CARD_ANIMATIONS = ['animate-card-out', 'animate-card-in', 'animate-card-back-out', 'animate-card-back-in'];

function renderCard(direction) {
  const card = document.getElementById('vb-card');
  const apply = () => {
    fillCard();
    card.classList.remove(...VB_CARD_ANIMATIONS);
    void card.offsetWidth; // fa ripartire l'animazione
    card.classList.add('animate-card-in');
    announceTwist();
  };
  if (direction === 'first') {
    apply();
    return;
  }
  vbAnimating = true;
  playSound('flip');
  vibrate('short');
  card.classList.remove(...VB_CARD_ANIMATIONS);
  void card.offsetWidth;
  card.classList.add('animate-card-out');
  setTimeout(() => {
    apply();
    vbAnimating = false;
  }, 200);
}

function announceTwist() {
  if (!vbMatch || !findVeritaTwist(vbMatch.twistId)) return;
  setTimeout(() => {
    playSound('twist');
    vibrate('short');
  }, 280);
}

/** Testo con i nomi al posto di {p1} e {p2}, sicuro per l'HTML. */
function withNames(text) {
  const p1 = playerById(vbMatch.p1Id);
  const p2 = playerById(vbMatch.p2Id);
  return escapeHtml(text)
    .replace(/\{p1\}/g, () => `<span class="player-highlight-1">${escapeHtml(p1 ? p1.name : '')}</span>`)
    .replace(/\{p2\}/g, () => `<span class="player-highlight-2">${escapeHtml(p2 ? p2.name : 'qualcuno')}</span>`);
}

function fillCard() {
  let q = currentQuestion();
  if (!q) {
    // Domanda cancellata nel frattempo: si toglie dall'elenco
    vbMatch.order.splice(vbMatch.index, 1);
    if (vbMatch.order.length === 0) {
      vbMatch = null;
      removeSaved(VB_KEYS.MATCH);
      showSetupScreen();
      return;
    }
    vbMatch.index = Math.min(vbMatch.index, vbMatch.order.length - 1);
    saveMatch();
    q = currentQuestion();
  }
  fixTurnPlayers();
  const p1 = playerById(vbMatch.p1Id);
  const cat = VERITA_CATEGORIES[q.category] || VERITA_CATEGORIES.ROMPIGHIACCIO;

  const root = document.documentElement.style;
  root.setProperty('--neon-color', cat.color);
  root.setProperty('--neon-glow', cat.glow);
  root.setProperty('--neon-bg', cat.bgSoft);

  document.getElementById('turn-name').textContent = p1 ? p1.name : '';
  document.getElementById('turn-avatar').textContent = initials(p1 ? p1.name : '');
  document.getElementById('vb-counter').textContent = `${vbMatch.index + 1} / ${vbMatch.order.length}`;

  const badge = document.getElementById('vb-category-badge');
  badge.className = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${cat.badgeClass}`;
  document.getElementById('vb-category-emoji').textContent = cat.emoji;
  document.getElementById('vb-category-name').textContent = cat.name;

  const twist = findVeritaTwist(vbMatch.twistId);
  const sips = refusalSips(q.category, vbMatch.twistId);
  document.getElementById('vb-sips').textContent = sips === 0 ? 'Pass' : `Se no: ${sips} ${sips === 1 ? 'Sorso' : 'Sorsi'}`;
  document.getElementById('vb-sips-badge').classList.toggle('sips-badge-twist', !!twist);
  document.getElementById('vb-drink-label').textContent = sips === 0 ? 'Salto (pass)' : `Bevo ${sips}`;

  document.getElementById('vb-for').textContent = p1 ? p1.name : '';
  document.getElementById('vb-question').innerHTML = withNames(q.text);
  document.getElementById('vb-level-dots').innerHTML = q.category === 'MIE' ? '' : levelDotsHtml(cat);

  const twistBox = document.getElementById('vb-twist');
  if (twist) {
    twistBox.innerHTML = twistBoxHtml(twist, withNames(twist.rule));
    twistBox.classList.remove('hidden');
  } else {
    twistBox.innerHTML = '';
    twistBox.classList.add('hidden');
  }
  renderStatsBar();
}

function renderStatsBar() {
  const bar = document.getElementById('players-stats-bar');
  bar.innerHTML = vbPlayers.map(p => {
    const s = (vbMatch && vbMatch.stats[p.id]) || {};
    const isTurn = vbMatch && p.id === vbMatch.p1Id;
    return `
      <div class="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold ${isTurn ? 'bg-orange-500/15 border-orange-400/60 text-white' : 'bg-slate-900/80 border-slate-800 text-slate-300'}">
        <span class="max-w-[90px] truncate">${escapeHtml(p.name)}</span>
        <span class="text-emerald-300">✅${s.answered || 0}</span>
        <span class="text-amber-300">🍺${s.drunk || 0}</span>
      </div>
    `;
  }).join('');
}

/* =========================================================================
   OPZIONI PARTITA: chi arriva, chi se ne va
========================================================================= */
function openOptionsModal() {
  playSound('tap');
  renderMidgamePlayers();
  openModal('options-modal');
}

function closeOptionsModal() {
  closeModal('options-modal');
}

function renderMidgamePlayers() {
  const list = document.getElementById('midgame-players-list');
  const canRemove = vbPlayers.length > 2;
  list.innerHTML = vbPlayers.map(p => `
    <span class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200">
      ${escapeHtml(p.name)}
      <button type="button" onclick="removePlayerMidGame('${p.id}')" ${canRemove ? '' : 'disabled'} class="w-6 h-6 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center disabled:opacity-30" aria-label="Togli ${escapeHtml(p.name)}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
  `).join('') + (canRemove ? '' : '<p class="w-full text-[11px] text-slate-500 mt-1">Servono almeno 2 giocatori al tavolo.</p>');
}

function handleAddPlayerMidGame(e) {
  e.preventDefault();
  const input = document.getElementById('midgame-player-input');
  const player = addPlayerByName(input.value);
  if (!player) return;
  input.value = '';
  playSound('success');
  persistPlayers();
  renderMidgamePlayers();
  if (vbMatch) renderStatsBar();
  showToast(`🎉 ${player.name} si unisce al tavolo!`, 'success');
}

function removePlayerMidGame(id) {
  if (vbPlayers.length <= 2) {
    showToast('Servono almeno 2 giocatori!', 'warning');
    return;
  }
  const idx = vbPlayers.findIndex(p => p.id === id);
  if (idx === -1) return;
  const removed = vbPlayers[idx];
  vbPlayers.splice(idx, 1);
  if (vbMatch && idx < vbMatch.turnIndex) vbMatch.turnIndex -= 1;
  playSound('remove');
  persistPlayers();
  if (vbMatch && isGameScreenVisible()) fillCard();
  renderMidgamePlayers();
  showToast(`👋 ${removed.name} ha lasciato il tavolo`, 'info');
}

/* =========================================================================
   CLASSIFICA DELLA SERATA
========================================================================= */
function openLeaderboardModal() {
  playSound('tap');
  renderLeaderboard();
  openModal('leaderboard-modal');
}

function closeLeaderboardModal() {
  closeModal('leaderboard-modal');
}

function renderLeaderboard() {
  const lb = veritaLeaderboard(vbPlayers, vbMatch ? vbMatch.stats : {});
  const title = (emoji, label, row, detail, color) => `
    <div class="rounded-2xl border p-3 text-center" style="border-color: ${color}; background: rgba(15, 20, 35, 0.9)">
      <div class="text-2xl">${emoji}</div>
      <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">${label}</div>
      <div class="font-display font-bold text-white text-sm truncate">${row ? escapeHtml(row.name) : '—'}</div>
      <div class="text-[11px] text-slate-400">${row ? detail(row) : 'ancora nessuno'}</div>
    </div>`;
  document.getElementById('leaderboard-titles').innerHTML =
    title('😇', 'Il più sincero', lb.sincero, r => `${r.answered} risposte`, 'rgba(52, 211, 153, 0.5)') +
    title('🕵️', 'Il più misterioso', lb.misterioso, r => `${r.drunk} bevute`, 'rgba(251, 191, 36, 0.5)');
  document.getElementById('leaderboard-list').innerHTML = lb.rows.map((r, i) => `
    <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/85 border border-slate-800">
      <span class="w-6 text-center font-display font-bold text-slate-400">${i + 1}</span>
      <span class="flex-1 min-w-0 font-semibold text-slate-100 truncate">${escapeHtml(r.name)}</span>
      <span class="text-xs font-bold text-emerald-300">✅ ${r.answered}</span>
      <span class="text-xs font-bold text-amber-300">🍺 ${r.drunk}</span>
    </div>
  `).join('');
}

/* =========================================================================
   LE VOSTRE DOMANDE
========================================================================= */
function openCustomModal() {
  renderCustomList();
  playSound('tap');
  openModal('custom-modal');
}

function closeCustomModal() {
  closeModal('custom-modal');
  if (vbMatch && isGameScreenVisible()) fillCard();
  renderSetup();
}

function saveCustom() {
  saveJSON(VB_KEYS.CUSTOM, vbCustom);
  refreshQuestions();
}

function handleAddCustomQuestion(e) {
  e.preventDefault();
  const input = document.getElementById('custom-input');
  const text = normalizeVeritaQuestion(input.value);
  if (!text) {
    showToast('Scrivi la domanda prima di aggiungerla!', 'warning');
    return;
  }
  if (allVeritaQuestions(vbCustom).some(q => q.text.toLowerCase() === text.toLowerCase())) {
    showToast('Questa domanda c\'è già!', 'warning');
    return;
  }
  vbCustom.unshift({ id: makeId('v'), text });
  saveCustom();
  if (!vbSettings.categories.MIE) {
    vbSettings.categories.MIE = true;
    saveSettings();
  }
  if (vbMatch) rebuildRemaining();
  input.value = '';
  renderCustomList(vbCustom[0].id);
  renderSetup();
  playSound('success');
  showToast('✍️ Domanda aggiunta!', 'success');
}

function deleteCustomQuestion(id) {
  if (!vbCustom.some(q => q.id === id)) return;
  vbCustom = vbCustom.filter(q => q.id !== id);
  saveCustom();
  if (vbMatch) {
    const pos = vbMatch.order.indexOf(id);
    if (pos !== -1 && pos !== vbMatch.index) {
      vbMatch.order.splice(pos, 1);
      if (pos < vbMatch.index) vbMatch.index -= 1;
      saveMatch();
    }
  }
  renderCustomList();
  renderSetup();
  playSound('remove');
  showToast('🗑️ Domanda cancellata', 'info');
}

/** newId: la domanda appena aggiunta entra con una piccola animazione. */
function renderCustomList(newId) {
  const list = document.getElementById('custom-list');
  if (vbCustom.length === 0) {
    list.innerHTML = `
      <div class="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-sm">
        <div class="text-3xl mb-2">✍️</div>
        Nessuna domanda vostra, per ora.<br />Scrivetene una qui sopra: segreti del gruppo, vacanze insieme, cose che volete sapere…
      </div>
    `;
    return;
  }
  list.innerHTML = vbCustom.map(q => `
    <div class="flex items-start gap-2 p-3 rounded-2xl bg-slate-900/85 border border-slate-800/90 ${q.id === newId ? 'animate-row-in' : ''}">
      <p class="flex-1 text-sm text-slate-100 leading-relaxed">${escapeHtml(q.text)}</p>
      <button type="button" onclick="deleteCustomQuestion('${q.id}')" class="w-8 h-8 shrink-0 rounded-lg bg-slate-800 hover:bg-rose-500/25 hover:text-rose-300 text-slate-400 text-xs flex items-center justify-center transition-colors" aria-label="Cancella domanda">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}
