'use strict';

/* =========================================================================
   HAI MAI?: schermate e partita.
   Usa public/common.js (memoria, avvisi, utilità) e public/hai-mai/questions.js (domande e regole).
========================================================================= */

// Chiavi da non cambiare: chi ha già l'app perderebbe impostazioni, domande e partita.
const HM_KEYS = {
  SETTINGS: 'cincin_haimai_settings_v1',
  CUSTOM: 'cincin_haimai_custom_v1',
  MATCH: 'cincin_haimai_match_v1'
};

let hmSettings = defaultHaiMaiSettings();
let hmCustom = [];            // [{ id, text }]
let hmQuestionsById = new Map();
let hmCounts = {};
let hmMatch = null;           // { active, order: [id], index, twists: { [index]: twistId|null }, round }
let hmAnimating = false;

/* ---------- Avvio ---------- */
window.addEventListener('DOMContentLoaded', () => {
  hmSettings = sanitizeHaiMaiSettings(loadJSON(HM_KEYS.SETTINGS, null));
  hmCustom = loadJSON(HM_KEYS.CUSTOM, []);
  if (!Array.isArray(hmCustom)) hmCustom = [];
  refreshQuestions();
  hmMatch = loadMatch();
  renderSetup();

  const app = nativeApp();
  if (app && app.isNative && app.isFullscreen) setHaiMaiFullscreenIcon(app.isFullscreen());
  document.addEventListener('fullscreenchange', () => setHaiMaiFullscreenIcon(!!document.fullscreenElement));

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
  if (!document.getElementById('custom-modal').classList.contains('hidden')) {
    closeCustomModal();
    return true;
  }
  if (!document.getElementById('game-screen').classList.contains('hidden')) {
    showSetupScreen();
    return true;
  }
  return false;
};

function refreshQuestions() {
  const all = allHaiMaiQuestions(hmCustom);
  hmQuestionsById = new Map(all.map(q => [q.id, q]));
  hmCounts = countByCategory(all);
}

function saveSettings() {
  saveJSON(HM_KEYS.SETTINGS, hmSettings);
}

/* ---------- Partita salvata ---------- */
function loadMatch() {
  const m = loadJSON(HM_KEYS.MATCH, null);
  if (!m || !m.active || !Array.isArray(m.order)) return null;
  const order = m.order.filter(id => hmQuestionsById.has(id));
  if (order.length === 0) return null;
  const index = Math.min(Math.max(0, Number(m.index) || 0), order.length - 1);
  return {
    active: true,
    order,
    index,
    twists: m.twists && typeof m.twists === 'object' ? m.twists : {},
    round: Math.max(1, Number(m.round) || 1)
  };
}

function saveMatch() {
  if (hmMatch) saveJSON(HM_KEYS.MATCH, hmMatch);
}

function enabledQuestions() {
  return allHaiMaiQuestions(hmCustom).filter(q => hmSettings.categories[q.category]);
}

/**
 * Categorie o domande cambiate a partita in corso: le domande già uscite restano,
 * quelle ancora da fare si rifanno con le categorie accese adesso.
 */
function rebuildRemaining() {
  if (!hmMatch) return;
  const played = hmMatch.order.slice(0, hmMatch.index + 1).filter(id => hmQuestionsById.has(id));
  const playedSet = new Set(played);
  const remaining = shuffleArray(enabledQuestions().map(q => q.id).filter(id => !playedSet.has(id)));
  if (played.length === 0 && remaining.length === 0) {
    hmMatch = null;
    removeSaved(HM_KEYS.MATCH);
    return;
  }
  hmMatch.order = played.concat(remaining);
  hmMatch.index = Math.min(hmMatch.index, hmMatch.order.length - 1);
  Object.keys(hmMatch.twists).forEach(k => {
    if (Number(k) > hmMatch.index) delete hmMatch.twists[k];
  });
  saveMatch();
}

/* =========================================================================
   SCHERMATA IMPOSTAZIONI
========================================================================= */
function renderSetup() {
  document.getElementById('custom-count').textContent = hmCustom.length;
  document.getElementById('twists-toggle').checked = !!hmSettings.twists;

  const list = document.getElementById('categories-list');
  list.innerHTML = Object.values(HAI_MAI_CATEGORIES)
    .filter(c => c.id !== 'MIE' || hmCounts.MIE > 0)
    .map(c => {
      const on = !!hmSettings.categories[c.id];
      return `
        <label class="flex items-center gap-3 p-2.5 rounded-2xl border transition-colors cursor-pointer ${on ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-950/40 border-slate-800/80 opacity-70'}">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border" style="background: ${c.bgSoft}; border-color: ${c.glow}">${c.emoji}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm text-white">${escapeHtml(c.name)}</span>
              <span class="text-[11px] font-bold" style="color: ${c.color}">${hmCounts[c.id] || 0}</span>
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

  const total = enabledQuestions().length;
  document.getElementById('selected-count-badge').textContent = `${total} ${total === 1 ? 'domanda' : 'domande'}`;

  const startBtn = document.getElementById('start-btn');
  startBtn.disabled = total === 0;
  document.getElementById('start-label').textContent = total === 0
    ? 'SCEGLI UNA CATEGORIA'
    : (hmMatch ? 'NUOVA PARTITA' : 'INIZIA');

  const resumeBtn = document.getElementById('resume-btn');
  resumeBtn.classList.toggle('hidden', !hmMatch);
  if (hmMatch) {
    document.getElementById('resume-label').textContent = `RIPRENDI (DOMANDA ${hmMatch.index + 1} DI ${hmMatch.order.length})`;
  }
}

function toggleCategory(id, on) {
  hmSettings.categories[id] = !!on;
  saveSettings();
  if (hmMatch) rebuildRemaining();
  renderSetup();
}

function toggleTwists(on) {
  hmSettings.twists = !!on;
  saveSettings();
  if (hmMatch) {
    // Gli imprevisti già usciti restano, quelli futuri seguono la nuova scelta
    Object.keys(hmMatch.twists).forEach(k => {
      if (Number(k) > hmMatch.index) delete hmMatch.twists[k];
    });
    saveMatch();
  }
  showToast(on ? '🎲 Imprevisti attivati' : 'Imprevisti disattivati', 'info');
}

function showSetupScreen() {
  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');
  renderSetup();
  window.scrollTo(0, 0);
}

function showGameScreen() {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  window.scrollTo(0, 0);
}

/* =========================================================================
   PARTITA
========================================================================= */
function startHaiMai() {
  const order = buildHaiMaiOrder(allHaiMaiQuestions(hmCustom), hmSettings.categories);
  if (order.length === 0) {
    showToast('Accendi almeno una categoria!', 'warning');
    return;
  }
  hmMatch = { active: true, order, index: 0, twists: {}, round: 1 };
  ensureTwist(0);
  saveMatch();
  showGameScreen();
  renderQuestion('first');
}

function resumeHaiMai() {
  if (!hmMatch) return;
  showGameScreen();
  ensureTwist(hmMatch.index);
  renderQuestion('first');
}

/** Decide l'imprevisto della domanda numero idx (una volta sola: tornando indietro resta uguale). */
function ensureTwist(idx) {
  if (!hmMatch) return;
  if (Object.prototype.hasOwnProperty.call(hmMatch.twists, idx)) return;
  const prev = idx > 0 ? hmMatch.twists[idx - 1] : null;
  hmMatch.twists[idx] = pickTwist(hmSettings.twists, prev || null);
}

function nextQuestion() {
  if (!hmMatch || hmAnimating) return;
  if (hmMatch.index < hmMatch.order.length - 1) {
    hmMatch.index += 1;
  } else {
    // Domande finite: si rimescolano tutte quelle delle categorie accese
    const order = buildHaiMaiOrder(allHaiMaiQuestions(hmCustom), hmSettings.categories);
    if (order.length === 0) {
      showToast('Accendi almeno una categoria!', 'warning');
      showSetupScreen();
      return;
    }
    const last = hmMatch.order[hmMatch.index];
    if (order.length > 1 && order[0] === last) order.push(order.shift());
    hmMatch = { active: true, order, index: 0, twists: {}, round: hmMatch.round + 1 };
    showToast(`🔄 Domande finite! Rimescolate tutte le ${order.length} domande.`, 'warning');
  }
  ensureTwist(hmMatch.index);
  saveMatch();
  renderQuestion('next');
}

function previousQuestion() {
  if (!hmMatch || hmAnimating) return;
  if (hmMatch.index === 0) {
    showToast('Questa è la prima domanda', 'info');
    return;
  }
  hmMatch.index -= 1;
  saveMatch();
  renderQuestion('back');
}

function renderQuestion(direction) {
  const card = document.getElementById('hm-card');
  const apply = () => {
    fillCard();
    card.classList.remove('animate-card-out', 'animate-card-in', 'animate-card-back-in');
    void card.offsetWidth; // fa ripartire l'animazione
    card.classList.add(direction === 'back' ? 'animate-card-back-in' : 'animate-card-in');
  };

  if (direction === 'first') {
    apply();
    return;
  }
  hmAnimating = true;
  vibrate('short');
  card.classList.remove('animate-card-in', 'animate-card-back-in');
  card.classList.add('animate-card-out');
  setTimeout(() => {
    apply();
    hmAnimating = false;
  }, 200);
}

function fillCard() {
  let q = hmQuestionsById.get(hmMatch.order[hmMatch.index]);
  if (!q) {
    // Domanda cancellata nel frattempo: si toglie dall'elenco
    hmMatch.order.splice(hmMatch.index, 1);
    if (hmMatch.order.length === 0) {
      hmMatch = null;
      removeSaved(HM_KEYS.MATCH);
      showSetupScreen();
      return;
    }
    hmMatch.index = Math.min(hmMatch.index, hmMatch.order.length - 1);
    saveMatch();
    q = hmQuestionsById.get(hmMatch.order[hmMatch.index]);
  }

  const cat = HAI_MAI_CATEGORIES[q.category] || HAI_MAI_CATEGORIES.TRANQUILLE;
  const root = document.documentElement.style;
  root.setProperty('--neon-color', cat.color);
  root.setProperty('--neon-glow', cat.glow);
  root.setProperty('--neon-bg', cat.bgSoft);

  const badge = document.getElementById('hm-category-badge');
  badge.className = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${cat.badgeClass}`;
  document.getElementById('hm-category-emoji').textContent = cat.emoji;
  document.getElementById('hm-category-name').textContent = cat.name;

  document.getElementById('hm-question').textContent = q.text;
  document.getElementById('hm-counter').textContent = `${hmMatch.index + 1} / ${hmMatch.order.length}`;
  document.getElementById('hm-prev-btn').disabled = hmMatch.index === 0;

  const twist = findTwist(hmMatch.twists[hmMatch.index]);
  const twistBox = document.getElementById('hm-twist');
  if (twist) {
    document.getElementById('hm-twist-icon').className = `fa-solid ${twist.icon}`;
    document.getElementById('hm-twist-title').textContent = twist.title;
    document.getElementById('hm-twist-rule').textContent = twist.rule;
    document.getElementById('hm-sips').textContent = twist.sips;
    document.getElementById('hm-rule').classList.add('hidden');
    twistBox.classList.remove('hidden');
  } else {
    document.getElementById('hm-sips').textContent = HAI_MAI_DEFAULT_SIPS;
    document.getElementById('hm-rule').textContent = HAI_MAI_DEFAULT_RULE;
    document.getElementById('hm-rule').classList.remove('hidden');
    twistBox.classList.add('hidden');
  }
}

/* ---------- Schermo intero ---------- */
async function toggleHaiMaiFullscreen() {
  const app = nativeApp();
  if (app && app.isNative && app.toggleFullscreen) {
    setHaiMaiFullscreenIcon(await app.toggleFullscreen());
    return;
  }
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else {
      showToast('Schermo intero non supportato su questo browser', 'warning');
    }
  } catch (e) {
    showToast('Schermo intero non supportato su questo browser', 'warning');
  }
}

function setHaiMaiFullscreenIcon(isFull) {
  document.querySelectorAll('.fullscreen-toggle-btn').forEach(btn => {
    btn.innerHTML = isFull
      ? '<i class="fa-solid fa-compress text-cyan-300"></i>'
      : '<i class="fa-solid fa-expand"></i>';
  });
}

/* =========================================================================
   LE VOSTRE DOMANDE
========================================================================= */
function openCustomModal() {
  const input = document.getElementById('custom-input');
  if (!input.value.trim()) input.value = 'Hai mai ';
  renderCustomList();
  document.getElementById('custom-modal').classList.remove('hidden');
}

function closeCustomModal() {
  document.getElementById('custom-modal').classList.add('hidden');
  // Se si stava giocando, la carta si aggiorna (la domanda potrebbe essere stata cancellata)
  if (hmMatch && !document.getElementById('game-screen').classList.contains('hidden')) {
    fillCard();
  }
  renderSetup();
}

function saveCustom() {
  saveJSON(HM_KEYS.CUSTOM, hmCustom);
  refreshQuestions();
}

function handleAddCustomQuestion(e) {
  e.preventDefault();
  const input = document.getElementById('custom-input');
  const text = normalizeCustomQuestion(input.value);
  if (!text) {
    showToast('Scrivi la domanda prima di aggiungerla!', 'warning');
    return;
  }
  const exists = allHaiMaiQuestions(hmCustom).some(q => q.text.toLowerCase() === text.toLowerCase());
  if (exists) {
    showToast('Questa domanda c\'è già!', 'warning');
    return;
  }
  hmCustom.unshift({ id: makeId('q'), text });
  saveCustom();
  if (!hmSettings.categories.MIE) {
    hmSettings.categories.MIE = true;
    saveSettings();
  }
  if (hmMatch) rebuildRemaining();
  input.value = 'Hai mai ';
  renderCustomList();
  renderSetup();
  showToast('✍️ Domanda aggiunta!', 'success');
}

function deleteCustomQuestion(id) {
  const target = hmCustom.find(q => q.id === id);
  if (!target) return;
  hmCustom = hmCustom.filter(q => q.id !== id);
  saveCustom();
  if (hmMatch) {
    const pos = hmMatch.order.indexOf(id);
    if (pos !== -1) {
      hmMatch.order.splice(pos, 1);
      if (pos < hmMatch.index) hmMatch.index -= 1;
      if (hmMatch.order.length === 0) {
        hmMatch = null;
        removeSaved(HM_KEYS.MATCH);
        showSetupScreen();
      } else {
        hmMatch.index = Math.min(hmMatch.index, hmMatch.order.length - 1);
        saveMatch();
      }
    }
  }
  renderCustomList();
  renderSetup();
  showToast('🗑️ Domanda cancellata', 'info');
}

function renderCustomList() {
  const list = document.getElementById('custom-list');
  if (hmCustom.length === 0) {
    list.innerHTML = `
      <div class="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-sm">
        <div class="text-3xl mb-2">✍️</div>
        Nessuna domanda vostra, per ora.<br />Scrivetene una qui sopra: inside joke, segreti del gruppo, vacanze insieme…
      </div>
    `;
    return;
  }
  list.innerHTML = hmCustom.map(q => `
    <div class="flex items-start gap-2 p-3 rounded-2xl bg-slate-900/85 border border-slate-800/90">
      <p class="flex-1 text-sm text-slate-100 leading-relaxed">${escapeHtml(q.text)}</p>
      <button
        type="button"
        onclick="deleteCustomQuestion('${q.id}')"
        class="w-8 h-8 shrink-0 rounded-lg bg-slate-800 hover:bg-rose-500/25 hover:text-rose-300 text-slate-400 text-xs flex items-center justify-center transition-colors"
        aria-label="Cancella domanda"
      >
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}
