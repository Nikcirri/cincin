'use strict';

/* =========================================================================
   HAI MAI?: categorie, domande, imprevisti e regole pure (senza schermo).
   Li controllano i test in tests/hai-mai.test.js.
   Per aggiungere una domanda: copia una riga della sua categoria e cambia id e testo
   (l'id deve essere unico: lettera della categoria + numero).
========================================================================= */

const HAI_MAI_CATEGORIES = {
  TRANQUILLE: {
    id: 'TRANQUILLE',
    name: 'Tranquille',
    emoji: '🍹',
    description: 'Per scaldarsi: piccole manie e figuracce di tutti i giorni.',
    color: '#22d3ee',
    glow: 'rgba(34, 211, 238, 0.42)',
    bgSoft: 'rgba(34, 211, 238, 0.12)',
    badgeClass: 'bg-cyan-400/15 text-cyan-300 border-cyan-400/40',
    defaultOn: true
  },
  FESTA: {
    id: 'FESTA',
    name: 'Festa',
    emoji: '🎉',
    description: 'Serate finite male, alcol e notti in bianco.',
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.42)',
    bgSoft: 'rgba(251, 191, 36, 0.12)',
    badgeClass: 'bg-amber-400/15 text-amber-300 border-amber-400/40',
    defaultOn: true
  },
  IMBARAZZANTI: {
    id: 'IMBARAZZANTI',
    name: 'Imbarazzanti',
    emoji: '😳',
    description: 'Le cose che non vorreste mai ammettere davanti a tutti.',
    color: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.42)',
    bgSoft: 'rgba(244, 114, 182, 0.12)',
    badgeClass: 'bg-pink-400/15 text-pink-300 border-pink-400/40',
    defaultOn: true
  },
  PICCANTI: {
    id: 'PICCANTI',
    name: 'Piccanti',
    emoji: '🌶️',
    description: 'Baci, ex e segreti di coppia. Solo per maggiorenni.',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.45)',
    bgSoft: 'rgba(244, 63, 94, 0.12)',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    defaultOn: false
  },
  MIE: {
    id: 'MIE',
    name: 'Le vostre',
    emoji: '✍️',
    description: 'Le domande che avete scritto voi.',
    color: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.42)',
    bgSoft: 'rgba(167, 139, 250, 0.12)',
    badgeClass: 'bg-violet-400/15 text-violet-300 border-violet-400/40',
    defaultOn: true
  }
};

const HAI_MAI_QUESTIONS = [
  // ==================== 🍹 TRANQUILLE ====================
  { id: 't01', category: 'TRANQUILLE', text: 'Hai mai finto di stare male per saltare la scuola o il lavoro?' },
  { id: 't02', category: 'TRANQUILLE', text: 'Hai mai mangiato qualcosa caduto per terra?' },
  { id: 't03', category: 'TRANQUILLE', text: 'Hai mai pianto guardando un cartone animato?' },
  { id: 't04', category: 'TRANQUILLE', text: 'Hai mai dimenticato il compleanno di un amico stretto?' },
  { id: 't05', category: 'TRANQUILLE', text: 'Hai mai cantato a squarciagola in macchina da solo?' },
  { id: 't06', category: 'TRANQUILLE', text: 'Hai mai riciclato un regalo che ti avevano fatto?' },
  { id: 't07', category: 'TRANQUILLE', text: 'Hai mai finto di parlare al telefono per evitare qualcuno?' },
  { id: 't08', category: 'TRANQUILLE', text: 'Hai mai rotto qualcosa a casa d\'altri senza dire niente?' },
  { id: 't09', category: 'TRANQUILLE', text: 'Hai mai visto un\'intera stagione di una serie in un giorno solo?' },
  { id: 't10', category: 'TRANQUILLE', text: 'Hai mai preso l\'autobus o il treno sbagliato?' },
  { id: 't11', category: 'TRANQUILLE', text: 'Hai mai dormito più di 12 ore di fila?' },
  { id: 't12', category: 'TRANQUILLE', text: 'Hai mai risposto a un saluto che in realtà era per qualcun altro?' },
  { id: 't13', category: 'TRANQUILLE', text: 'Hai mai copiato durante un compito in classe?' },
  { id: 't14', category: 'TRANQUILLE', text: 'Hai mai mentito sulla tua età?' },
  { id: 't15', category: 'TRANQUILLE', text: 'Hai mai fatto un viaggio da solo?' },
  { id: 't16', category: 'TRANQUILLE', text: 'Hai mai chiuso le chiavi dentro casa o in macchina?' },
  { id: 't17', category: 'TRANQUILLE', text: 'Hai mai spulciato il profilo di qualcuno fino alle foto di anni fa?' },
  { id: 't18', category: 'TRANQUILLE', text: 'Hai mai bruciato qualcosa mentre cucinavi?' },
  { id: 't19', category: 'TRANQUILLE', text: 'Hai mai fatto il bagno al mare di notte?' },
  { id: 't20', category: 'TRANQUILLE', text: 'Hai mai preso una multa?' },
  { id: 't21', category: 'TRANQUILLE', text: 'Hai mai dato un nome a una pianta o a un oggetto?' },
  { id: 't22', category: 'TRANQUILLE', text: 'Hai mai finto di aver letto un libro?' },
  { id: 't23', category: 'TRANQUILLE', text: 'Hai mai riso in un momento in cui proprio non si poteva?' },
  { id: 't24', category: 'TRANQUILLE', text: 'Hai mai giocato ai videogiochi fino all\'alba?' },
  { id: 't25', category: 'TRANQUILLE', text: 'Hai mai mangiato una vaschetta di gelato intera da solo?' },
  { id: 't26', category: 'TRANQUILLE', text: 'Hai mai ascoltato la stessa canzone più di dieci volte di fila?' },
  { id: 't27', category: 'TRANQUILLE', text: 'Hai mai fatto finta di sapere le parole di una canzone?' },
  { id: 't28', category: 'TRANQUILLE', text: 'Hai mai chiamato "mamma" una maestra o una professoressa?' },
  { id: 't29', category: 'TRANQUILLE', text: 'Hai mai dimenticato il nome di qualcuno appena si era presentato?' },
  { id: 't30', category: 'TRANQUILLE', text: 'Hai mai chiesto una foto a un personaggio famoso?' },

  // ==================== 🎉 FESTA ====================
  { id: 'f01', category: 'FESTA', text: 'Hai mai vomitato dopo aver bevuto troppo?' },
  { id: 'f02', category: 'FESTA', text: 'Hai mai dimenticato come sei tornato a casa?' },
  { id: 'f03', category: 'FESTA', text: 'Hai mai ballato sopra un tavolo?' },
  { id: 'f04', category: 'FESTA', text: 'Hai mai fatto l\'alba a una festa senza dormire?' },
  { id: 'f05', category: 'FESTA', text: 'Hai mai bevuto un superalcolico direttamente dalla bottiglia?' },
  { id: 'f06', category: 'FESTA', text: 'Hai mai perso il telefono durante una serata?' },
  { id: 'f07', category: 'FESTA', text: 'Hai mai mangiato un kebab o una pizza alle 4 di notte?' },
  { id: 'f08', category: 'FESTA', text: 'Ti sei mai imbucato a una festa senza invito?' },
  { id: 'f09', category: 'FESTA', text: 'Hai mai cantato al karaoke da ubriaco?' },
  { id: 'f10', category: 'FESTA', text: 'Ti sei mai addormentato durante una festa?' },
  { id: 'f11', category: 'FESTA', text: 'Hai mai mischiato birra, vino e superalcolici nella stessa sera?' },
  { id: 'f12', category: 'FESTA', text: 'Hai mai finto di essere sobrio davanti ai tuoi genitori?' },
  { id: 'f13', category: 'FESTA', text: 'Hai mai fatto un tatuaggio o un piercing d\'impulso?' },
  { id: 'f14', category: 'FESTA', text: 'Hai mai pianto da ubriaco senza un motivo preciso?' },
  { id: 'f15', category: 'FESTA', text: 'Hai mai portato via un bicchiere da un locale?' },
  { id: 'f16', category: 'FESTA', text: 'Hai mai speso più di 100 euro in una sola serata?' },
  { id: 'f17', category: 'FESTA', text: 'Hai mai fatto un trenino con perfetti sconosciuti?' },
  { id: 'f18', category: 'FESTA', text: 'Hai mai finito il drink di qualcun altro senza chiedere?' },
  { id: 'f19', category: 'FESTA', text: 'Hai mai saltato il lavoro o una lezione per i postumi?' },
  { id: 'f20', category: 'FESTA', text: 'Hai mai giurato "stasera non bevo" e poi hai fatto l\'alba?' },
  { id: 'f21', category: 'FESTA', text: 'Hai mai scritto a qualcuno da ubriaco e te ne sei pentito la mattina dopo?' },
  { id: 'f22', category: 'FESTA', text: 'Hai mai fatto un discorso commosso a una festa senza che nessuno te lo chiedesse?' },
  { id: 'f23', category: 'FESTA', text: 'Hai mai organizzato una festa a casa di nascosto dai tuoi?' },
  { id: 'f24', category: 'FESTA', text: 'Hai mai perso una scarpa durante una serata?' },
  { id: 'f25', category: 'FESTA', text: 'Hai mai fatto amicizia con qualcuno in fila per il bagno in discoteca?' },
  { id: 'f26', category: 'FESTA', text: 'Hai mai offerto da bere a tutto il bancone?' },
  { id: 'f27', category: 'FESTA', text: 'Hai mai ordinato un cocktail solo perché aveva un nome buffo?' },
  { id: 'f28', category: 'FESTA', text: 'Hai mai rovesciato un drink addosso a qualcuno?' },
  { id: 'f29', category: 'FESTA', text: 'Hai mai dormito sul divano di un amico dopo una serata?' },
  { id: 'f30', category: 'FESTA', text: 'Hai mai perso l\'ultimo treno o l\'ultimo autobus per tornare a casa?' },

  // ==================== 😳 IMBARAZZANTI ====================
  { id: 'i01', category: 'IMBARAZZANTI', text: 'Hai mai mandato un messaggio alla persona sbagliata?' },
  { id: 'i02', category: 'IMBARAZZANTI', text: 'Hai mai messo like per sbaglio a una foto vecchissima di qualcuno?' },
  { id: 'i03', category: 'IMBARAZZANTI', text: 'Hai mai fatto una caduta epica davanti a tante persone?' },
  { id: 'i04', category: 'IMBARAZZANTI', text: 'Hai mai avuto una cotta per il partner di un amico?' },
  { id: 'i05', category: 'IMBARAZZANTI', text: 'Hai mai cercato il tuo nome su Google?' },
  { id: 'i06', category: 'IMBARAZZANTI', text: 'Ti sei mai fatto beccare a parlare male di qualcuno proprio da quella persona?' },
  { id: 'i07', category: 'IMBARAZZANTI', text: 'Hai mai letto di nascosto i messaggi sul telefono di qualcun altro?' },
  { id: 'i08', category: 'IMBARAZZANTI', text: 'Hai mai fatto pipì in piscina?' },
  { id: 'i09', category: 'IMBARAZZANTI', text: 'Hai mai dato la colpa a qualcun altro per una tua puzza?' },
  { id: 'i10', category: 'IMBARAZZANTI', text: 'Hai mai detto qualcosa di imbarazzante convinto di avere il microfono spento?' },
  { id: 'i11', category: 'IMBARAZZANTI', text: 'Hai mai mandato un vocale e te ne sei pentito subito dopo?' },
  { id: 'i12', category: 'IMBARAZZANTI', text: 'Hai mai pianto per amore in un luogo pubblico?' },
  { id: 'i13', category: 'IMBARAZZANTI', text: 'Hai mai scritto una poesia o una canzone per una cotta?' },
  { id: 'i14', category: 'IMBARAZZANTI', text: 'Hai mai ricevuto un due di picche davanti a tutti?' },
  { id: 'i15', category: 'IMBARAZZANTI', text: 'Hai mai passato una serata intera con qualcosa tra i denti senza che nessuno te lo dicesse?' },
  { id: 'i16', category: 'IMBARAZZANTI', text: 'Hai mai fatto finta di non vedere un amico per strada?' },
  { id: 'i17', category: 'IMBARAZZANTI', text: 'Hai mai mentito sul tuo lavoro o sui tuoi studi per fare colpo?' },
  { id: 'i18', category: 'IMBARAZZANTI', text: 'Hai mai creato un profilo falso sui social?' },
  { id: 'i19', category: 'IMBARAZZANTI', text: 'Hai mai messo una foto profilo così ritoccata da sembrare un\'altra persona?' },
  { id: 'i20', category: 'IMBARAZZANTI', text: 'Hai mai chiamato il tuo partner con il nome di un ex?' },
  { id: 'i21', category: 'IMBARAZZANTI', text: 'Hai mai provato davanti allo specchio cosa dire a una cotta?' },
  { id: 'i22', category: 'IMBARAZZANTI', text: 'Ti sei mai addormentato in un posto assurdo, tipo al cinema o a un matrimonio?' },
  { id: 'i23', category: 'IMBARAZZANTI', text: 'Hai mai ballato davanti allo specchio fingendo di essere in un videoclip?' },
  { id: 'i24', category: 'IMBARAZZANTI', text: 'Hai mai baciato il poster di un cantante o di un attore?' },
  { id: 'i25', category: 'IMBARAZZANTI', text: 'Hai mai guardato il profilo dell\'ex del tuo partner?' },
  { id: 'i26', category: 'IMBARAZZANTI', text: 'Hai mai fatto una figuraccia con il capo o con un professore?' },
  { id: 'i27', category: 'IMBARAZZANTI', text: 'Hai mai mangiato il cibo di un coinquilino facendo finta di niente?' },
  { id: 'i28', category: 'IMBARAZZANTI', text: 'Hai mai riso a una battuta che non avevi capito?' },
  { id: 'i29', category: 'IMBARAZZANTI', text: 'Sei mai inciampato e hai fatto finta di metterti a correre?' },
  { id: 'i30', category: 'IMBARAZZANTI', text: 'Hai mai mandato una mail di lavoro all\'indirizzo sbagliato?' },

  // ==================== 🌶️ PICCANTI ====================
  { id: 'p01', category: 'PICCANTI', text: 'Hai mai baciato qualcuno conosciuto la sera stessa?' },
  { id: 'p02', category: 'PICCANTI', text: 'Hai mai baciato qualcuno seduto a questo tavolo?' },
  { id: 'p03', category: 'PICCANTI', text: 'Hai mai avuto una cotta per qualcuno seduto a questo tavolo?' },
  { id: 'p04', category: 'PICCANTI', text: 'Hai mai mandato una foto piccante?' },
  { id: 'p05', category: 'PICCANTI', text: 'Hai mai usato un\'app di incontri?' },
  { id: 'p06', category: 'PICCANTI', text: 'Hai mai avuto una storia con un collega o un compagno di corso?' },
  { id: 'p07', category: 'PICCANTI', text: 'Hai mai baciato due persone diverse nella stessa sera?' },
  { id: 'p08', category: 'PICCANTI', text: 'Hai mai fatto un sogno piccante su qualcuno che conosci?' },
  { id: 'p09', category: 'PICCANTI', text: 'Hai mai fatto l\'amore in macchina?' },
  { id: 'p10', category: 'PICCANTI', text: 'Hai mai fatto il bagno nudo?' },
  { id: 'p11', category: 'PICCANTI', text: 'Ti sei mai fatto beccare mentre ti baciavi con qualcuno?' },
  { id: 'p12', category: 'PICCANTI', text: 'Sei mai tornato con un ex dopo aver giurato di non farlo?' },
  { id: 'p13', category: 'PICCANTI', text: 'Hai mai avuto una storia segreta che nessuno dei tuoi amici sapeva?' },
  { id: 'p14', category: 'PICCANTI', text: 'Hai mai dato un bacio per vincere una scommessa?' },
  { id: 'p15', category: 'PICCANTI', text: 'Hai mai flirtato per avere un drink gratis?' },
  { id: 'p16', category: 'PICCANTI', text: 'Hai mai baciato qualcuno del tuo stesso sesso?' },
  { id: 'p17', category: 'PICCANTI', text: 'Hai mai scritto a un ex alle 3 di notte?' },
  { id: 'p18', category: 'PICCANTI', text: 'Hai mai controllato di nascosto il telefono del tuo partner?' },
  { id: 'p19', category: 'PICCANTI', text: 'Hai mai avuto un appuntamento al buio?' },
  { id: 'p20', category: 'PICCANTI', text: 'Hai mai dovuto nascondere un succhiotto?' },
  { id: 'p21', category: 'PICCANTI', text: 'Hai mai mentito sul numero di persone che hai baciato?' },
  { id: 'p22', category: 'PICCANTI', text: 'Hai mai avuto una relazione a distanza?' },
  { id: 'p23', category: 'PICCANTI', text: 'Hai mai lasciato qualcuno con un messaggio?' },
  { id: 'p24', category: 'PICCANTI', text: 'Ti sei mai innamorato di qualcuno conosciuto solo in chat?' },
  { id: 'p25', category: 'PICCANTI', text: 'Hai mai passato la notte a casa di qualcuno conosciuto la sera stessa?' },
  { id: 'p26', category: 'PICCANTI', text: 'Hai mai tradito qualcuno?' },
  { id: 'p27', category: 'PICCANTI', text: 'Hai mai avuto una cotta per un professore o per un capo?' },
  { id: 'p28', category: 'PICCANTI', text: 'Hai mai flirtato con qualcuno solo per far ingelosire un\'altra persona?' },
  { id: 'p29', category: 'PICCANTI', text: 'Hai mai baciato qualcuno sotto la pioggia?' },
  { id: 'p30', category: 'PICCANTI', text: 'Hai mai avuto una cotta per il fratello o la sorella di un amico?' }
];

/* Imprevisti: ogni tanto una domanda cambia le regole del giro. */
const HAI_MAI_TWISTS = [
  {
    id: 'contrario',
    icon: 'fa-arrows-rotate',
    title: 'Al contrario!',
    rule: 'Questa volta beve chi NON l\'ha mai fatto.',
    sips: '1 Sorso'
  },
  {
    id: 'doppio',
    icon: 'fa-angles-up',
    title: 'Sorsi doppi!',
    rule: 'Chi l\'ha fatto beve 2 sorsi invece di 1.',
    sips: '2 Sorsi'
  },
  {
    id: 'racconta',
    icon: 'fa-microphone',
    title: 'Racconta!',
    rule: 'Chi l\'ha fatto deve raccontare com\'è andata. Chi non vuole parlare beve 3 sorsi.',
    sips: 'Racconta o 3 Sorsi'
  },
  {
    id: 'solitario',
    icon: 'fa-user-ninja',
    title: 'Lupo solitario',
    rule: 'Se l\'ha fatto una sola persona, non beve: distribuisce 3 sorsi a chi vuole.',
    sips: '1 Sorso'
  },
  {
    id: 'gruppo',
    icon: 'fa-champagne-glasses',
    title: 'Brindisi di gruppo',
    rule: 'Se nessuno l\'ha mai fatto, bevete tutti 1 sorso. Cin cin!',
    sips: '1 Sorso'
  }
];

const HAI_MAI_DEFAULT_RULE = 'Chi l\'ha fatto beve 1 sorso.';
const HAI_MAI_DEFAULT_SIPS = '1 Sorso';
const HAI_MAI_TWIST_CHANCE = 0.15;
const HAI_MAI_MAX_CUSTOM_LENGTH = 160;

/* =========================================================================
   REGOLE PURE (si possono provare senza schermo)
========================================================================= */

/** Impostazioni di partenza: categorie con defaultOn accese, imprevisti attivi. */
function defaultHaiMaiSettings() {
  const categories = {};
  Object.values(HAI_MAI_CATEGORIES).forEach(c => { categories[c.id] = c.defaultOn; });
  return { categories, twists: true };
}

/** Unisce le impostazioni salvate a quelle di partenza (ignora valori strani). */
function sanitizeHaiMaiSettings(saved) {
  const base = defaultHaiMaiSettings();
  if (!saved || typeof saved !== 'object') return base;
  if (saved.categories && typeof saved.categories === 'object') {
    Object.keys(base.categories).forEach(id => {
      if (typeof saved.categories[id] === 'boolean') base.categories[id] = saved.categories[id];
    });
  }
  if (typeof saved.twists === 'boolean') base.twists = saved.twists;
  return base;
}

/**
 * Sistema una domanda scritta a mano: spazi, maiuscola iniziale, punto di domanda finale.
 * Restituisce '' se è vuota o se c'è solo "Hai mai".
 */
function normalizeCustomQuestion(raw) {
  let text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, HAI_MAI_MAX_CUSTOM_LENGTH);
  if (!text) return '';
  if (/^hai mai[\s.?!…]*$/i.test(text)) return '';
  text = text.charAt(0).toUpperCase() + text.slice(1);
  text = text.replace(/[\s.!…,;:]+$/, '');
  if (!text.endsWith('?')) text += '?';
  return text;
}

/** Domande personalizzate salvate → domande del gioco (categoria "Le vostre"). */
function customToQuestions(customList) {
  const seen = new Set();
  return (Array.isArray(customList) ? customList : [])
    .filter(q => q && typeof q.id === 'string' && typeof q.text === 'string' && q.text.trim())
    .filter(q => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    })
    .map(q => ({ id: q.id, category: 'MIE', text: q.text.trim() }));
}

/** Tutte le domande disponibili: quelle dell'app più quelle scritte da voi. */
function allHaiMaiQuestions(customList) {
  return HAI_MAI_QUESTIONS.concat(customToQuestions(customList));
}

/** Quante domande ci sono per ogni categoria. */
function countByCategory(questions) {
  const counts = {};
  Object.keys(HAI_MAI_CATEGORIES).forEach(id => { counts[id] = 0; });
  questions.forEach(q => { if (counts[q.category] !== undefined) counts[q.category]++; });
  return counts;
}

/** Le domande delle categorie accese, mescolate. Restituisce solo gli id, in ordine di gioco. */
function buildHaiMaiOrder(questions, categoriesOn, random) {
  const ids = questions.filter(q => categoriesOn[q.category]).map(q => q.id);
  return shuffleArray(ids, random);
}

/**
 * Sceglie se la prossima domanda ha un imprevisto.
 * Mai due imprevisti di fila; random() si può passare per i test.
 */
function pickTwist(enabled, previousTwistId, random) {
  const rnd = typeof random === 'function' ? random : Math.random;
  if (!enabled || previousTwistId) return null;
  if (rnd() >= HAI_MAI_TWIST_CHANCE) return null;
  const idx = Math.floor(rnd() * HAI_MAI_TWISTS.length);
  return HAI_MAI_TWISTS[Math.min(idx, HAI_MAI_TWISTS.length - 1)].id;
}

function findTwist(id) {
  return HAI_MAI_TWISTS.find(t => t.id === id) || null;
}
