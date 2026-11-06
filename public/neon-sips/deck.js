'use strict';

/* =========================================================================
   NEON SIPS: categorie e mazzo di 70 carte (dal codice generato con Gemini).
   Solo dati, niente schermo: li controllano i test in tests/neon-sips.test.js.
   {p1} = giocatore di turno, {p2} = avversario scelto a caso.
========================================================================= */
const CATEGORIES = {
  CATENA: {
    id: 'CATENA',
    name: 'Catena',
    color: '#facc15', // Giallo Neon
    glow: 'rgba(250, 204, 21, 0.42)',
    bgSoft: 'rgba(250, 204, 21, 0.12)',
    icon: 'fa-bolt',
    badgeClass: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/40'
  },
  BERSAGLIO: {
    id: 'BERSAGLIO',
    name: 'Bersaglio',
    color: '#38bdf8', // Blu Ciano Neon
    glow: 'rgba(56, 189, 248, 0.42)',
    bgSoft: 'rgba(56, 189, 248, 0.12)',
    icon: 'fa-bullseye',
    badgeClass: 'bg-sky-400/15 text-sky-300 border-sky-400/40'
  },
  DUELLO: {
    id: 'DUELLO',
    name: 'Duello 1v1',
    color: '#f43f5e', // Rosso Neon
    glow: 'rgba(244, 63, 94, 0.45)',
    bgSoft: 'rgba(244, 63, 94, 0.12)',
    icon: 'fa-hand-fist',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40'
  },
  SCUDO: {
    id: 'SCUDO',
    name: 'Scudo',
    color: '#4ade80', // Verde Neon
    glow: 'rgba(74, 222, 128, 0.42)',
    bgSoft: 'rgba(74, 222, 128, 0.12)',
    icon: 'fa-shield-halved',
    badgeClass: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40'
  },
  REGOLA: {
    id: 'REGOLA',
    name: 'Nuova Regola',
    color: '#a855f7', // Viola Neon
    glow: 'rgba(168, 85, 247, 0.45)',
    bgSoft: 'rgba(168, 85, 247, 0.12)',
    icon: 'fa-crown',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40'
  },
  GIURIA: {
    id: 'GIURIA',
    name: 'La Giuria',
    color: '#fb923c', // Arancione Neon
    glow: 'rgba(251, 146, 60, 0.42)',
    bgSoft: 'rgba(251, 146, 60, 0.12)',
    icon: 'fa-scale-balanced',
    badgeClass: 'bg-orange-400/15 text-orange-300 border-orange-400/40'
  },
  MALEDIZIONE: {
    id: 'MALEDIZIONE',
    name: 'Maledizione',
    color: '#ec4899', // Fucsia Neon
    glow: 'rgba(236, 72, 153, 0.45)',
    bgSoft: 'rgba(236, 72, 153, 0.12)',
    icon: 'fa-link',
    badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/40'
  }
};

/*************************************************************************
 * 2. COMPLETE DECK OF 70 UNIQUE CARDS IN ITALIAN (NO PLACEHOLDERS)
 *************************************************************************/
const MASTER_DECK = [
  // ==================== 1. CATENA (12 Carte - Giallo) ====================
  {
    id: 1,
    category: 'CATENA',
    title: 'Maratona Serie TV',
    text: 'A partire da {p1}, fate un giro nominando delle SERIE TV. Chi ripete un titolo già detto o ci pensa per più di 3 secondi beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 2,
    category: 'CATENA',
    title: 'Concessionario Abusivo',
    text: 'Inizia {p1}: nominate a giro delle MARCHE DI AUTOMOBILI. Chi esita oltre 3 secondi o inventa marche inesistenti beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 3,
    category: 'CATENA',
    title: 'Rime d\'Amore (e d\'Alcol)',
    text: '{p1} dice una parola che finisce in "-ORE". A giro tutti devono dire una parola in rima senza ripetizioni. Chi si blocca beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 4,
    category: 'CATENA',
    title: 'Pizzeria di Mezzanotte',
    text: 'A partire da {p1}, nominate dei GUSTI DI PIZZA classici da menù. Chi ripete o tace per più di 3 secondi beve 1 sorso (e paga la prossima pizza).',
    sips: '1 Sorso'
  },
  {
    id: 5,
    category: 'CATENA',
    title: 'Classici Disney & Pixar',
    text: 'Inizia {p1}: dite a turno il titolo di un FILM D\'ANIMAZIONE Disney o Pixar. Chi sbaglia o tentenna per oltre 3 secondi beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 6,
    category: 'CATENA',
    title: 'Segreti in Bagno',
    text: 'A partire da {p1}, elencate cose che si trovano abitualmente in un BAGNO. Chi ride e non risponde entro 3 secondi beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 7,
    category: 'CATENA',
    title: 'Festival di Sanremo',
    text: 'Parte {p1}: nominate a giro CANTANTI o GRUPPI MUSICALI ITALIANI. Chi ripete o si ferma per più di 3 secondi beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 8,
    category: 'CATENA',
    title: 'Sommelier dell\'Ultimo Banco',
    text: 'A partire da {p1}, nominate COCKTAIL famosi o MARCHE DI SUPERALCOLICI. Chi resta a secco di idee per 3 secondi beve 3 sorsi!',
    sips: '3 Sorsi'
  },
  {
    id: 9,
    category: 'CATENA',
    title: 'Cittadino del Mondo',
    text: 'Inizia {p1}: nominate a giro delle CAPITALI DEL MONDO. Chi spara una città che non è capitale o ci mette più di 3 secondi beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 10,
    category: 'CATENA',
    title: 'Scuse da Paccaro',
    text: 'A partire da {p1}, inventate a giro una SCUSA credibile per dare buca agli amici il sabato sera. Chi esita oltre 3 secondi beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 11,
    category: 'CATENA',
    title: 'Momenti Imbarazzanti a Letto',
    text: 'Parte {p1}: dite a turno una FRASE che non vorreste mai sentirvi dire a letto. Chi non sa cosa dire entro 3 secondi beve 3 sorsi!',
    sips: '3 Sorsi'
  },
  {
    id: 12,
    category: 'CATENA',
    title: 'Sala Giochi',
    text: 'Inizia {p1}: nominate a giro VIDEOGIOCHI famosi (console, PC o smartphone). Chi ripete o supera i 3 secondi beve 1 sorso!',
    sips: '1 Sorso'
  },

  // ==================== 2. BERSAGLIO (12 Carte - Blu) ====================
  {
    id: 13,
    category: 'BERSAGLIO',
    title: 'Controllo della Vista',
    text: 'Tutte le persone con gli occhiali bevono 1 volta, chi porta le lenti a contatto beve 2 volte, chi ci vede benissimo senza niente beve 3 volte!',
    sips: '1-3 Sorsi'
  },
  {
    id: 14,
    category: 'BERSAGLIO',
    title: 'Ansia da Batteria',
    text: 'Controllate subito lo smartphone! Chi ha la batteria sotto il 30% beve 2 sorsi per incuria; chi ce l\'ha sopra l\'80% beve 1 sorso per troppa precisione.',
    sips: '1-2 Sorsi'
  },
  {
    id: 15,
    category: 'BERSAGLIO',
    title: 'Anima Dark',
    text: 'Tutti coloro che in questo momento indossano almeno DUE capi di abbigliamento neri (intimo escluso... a meno che non vogliate mostrarlo) bevono 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 16,
    category: 'BERSAGLIO',
    title: 'Inchiostro & Metallo',
    text: 'Chiunque abbia tatuaggi o piercing (oltre ai classici lobi delle orecchie) beve 1 sorso per ciascuno di essi, fino a un massimo di 3 sorsi!',
    sips: 'Max 3 Sorsi'
  },
  {
    id: 17,
    category: 'BERSAGLIO',
    title: 'Stato Sentimentale',
    text: 'I single convinti bevono 1 sorso, i fidanzati/sposati bevono 2 sorsi, chi si frequenta con qualcuno ma dice "è complicato" beve 3 sorsi!',
    sips: '1-3 Sorsi'
  },
  {
    id: 18,
    category: 'BERSAGLIO',
    title: 'Pausa Fumo',
    text: 'Chiunque abbia fumato una sigaretta, tabacco riscaldato o svapato negli ultimi 30 minuti beve 2 sorsi per schiarirsi la gola!',
    sips: '2 Sorsi'
  },
  {
    id: 19,
    category: 'BERSAGLIO',
    title: 'Questione di Prospettiva',
    text: 'Il giocatore più ALTO e il giocatore più BASSO del tavolo devono alzarsi, fare un brindisi solenne e bere 2 sorsi a testa!',
    sips: '2 Sorsi'
  },
  {
    id: 20,
    category: 'BERSAGLIO',
    title: 'Sneakers Bianche',
    text: 'Abbassate lo sguardo: tutti i giocatori che indossano scarpe da ginnastica prevalentemente BIANCHE bevono 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 21,
    category: 'BERSAGLIO',
    title: 'Vittime dell\'Algoritmo',
    text: 'Chiunque abbia aperto Instagram o TikTok negli ultimi 20 minuti beve 2 sorsi. Tornate nel mondo reale!',
    sips: '2 Sorsi'
  },
  {
    id: 22,
    category: 'BERSAGLIO',
    title: 'Il Solito Ritardatario',
    text: 'La persona che è arrivata per ULTIMA a questa serata (o l\'ultima che si è seduta al tavolo) beve 3 sorsi senza diritto di replica!',
    sips: '3 Sorsi'
  },
  {
    id: 23,
    category: 'BERSAGLIO',
    title: 'Chiavi in Tasca',
    text: 'Chi è venuto in macchina guidando ha diritto di distribuire 2 sorsi a chi vuole. Tutti i passeggeri che si sono fatti scarrozzare bevono 1 sorso!',
    sips: '1-2 Sorsi'
  },
  {
    id: 24,
    category: 'BERSAGLIO',
    title: 'Oroscopo Alcolico',
    text: 'I segni di Fuoco e Aria (Ariete, Leone, Sagittario, Gemelli, Bilancia, Acquario) bevono 2 sorsi. Terra e Acqua (Toro, Vergine, Capricorno, Cancro, Scorpione, Pesci) bevono 1 sorso!',
    sips: '1-2 Sorsi'
  },

  // ==================== 3. DUELLO 1v1 (12 Carte - Rosso) ====================
  {
    id: 25,
    category: 'DUELLO',
    title: 'Sasso, Carta, Forbice!',
    text: 'Sfida secca (al meglio di 1) a Sasso-Carta-Forbice tra {p1} e {p2}. Chi perde beve 2 sorsi immediati!',
    sips: '2 Sorsi'
  },
  {
    id: 26,
    category: 'DUELLO',
    title: 'Mezzogiorno di Fuoco',
    text: 'Gara di sguardi tra {p1} e {p2}: fissatevi negli occhi senza parlare. Il primo che sbatte le palpebre o scoppia a ridere beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 27,
    category: 'DUELLO',
    title: 'Pari o Dispari',
    text: 'Sfida lampo a Pari o Dispari tra {p1} ({p1} è Pari) e {p2} ({p2} è Dispari). Al 3 buttate giù i numeri con una mano: chi perde beve 2 sorsi!',
    sips: '2 Sorsi'
  },
  {
    id: 28,
    category: 'DUELLO',
    title: 'Guerra dei Pollici',
    text: '{p1} e {p2} si sfidano a lotta dei pollici ("1, 2, 3, 4, dichiaro guerra al tuo pollice!"). Chi viene immobilizzato per 3 secondi beve 3 sorsi!',
    sips: '3 Sorsi'
  },
  {
    id: 29,
    category: 'DUELLO',
    title: 'Sarabanda a Bocca Chiusa',
    text: '{p1} deve canticchiare un brano famosissimo tenendo le labbra chiuse ("Mmm-mmm"). Se {p2} indovina il titolo entro 10 secondi beve {p1}, altrimenti beve {p2} (2 sorsi)!',
    sips: '2 Sorsi'
  },
  {
    id: 30,
    category: 'DUELLO',
    title: 'Complimenti Seri',
    text: '{p1} e {p2} devono guardarsi negli occhi e farsi a turno dei complimenti romantici restando serissimi. Il primo che ride o sorride beve 3 sorsi!',
    sips: '3 Sorsi'
  },
  {
    id: 31,
    category: 'DUELLO',
    title: 'Connessione Telepatica',
    text: 'Al conto di 3, {p1} e {p2} devono urlare contemporaneamente il nome di un FRUTTO. Se dicono lo stesso frutto, TUTTI gli altri bevono mezzo bicchiere! Altrimenti {p1} e {p2} bevono 1 sorso.',
    sips: '1 Sorso / ½ Bicch.'
  },
  {
    id: 32,
    category: 'DUELLO',
    title: 'Vero o Falso?',
    text: '{p1} racconta un aneddoto assurdo su di sé in una sola frase. {p2} deve dire se è Vero o Falso: se {p2} indovina beve {p1} (2 sorsi), se sbaglia beve {p2}!',
    sips: '2 Sorsi'
  },
  {
    id: 33,
    category: 'DUELLO',
    title: 'Roulette della Galleria',
    text: '{p1} e {p2} mostrano al gruppo l\'ULTIMA foto scattata o salvata nella propria galleria. Il tavolo vota quale delle due è più assurda o imbarazzante: chi perde beve 3 sorsi!',
    sips: '3 Sorsi'
  },
  {
    id: 34,
    category: 'DUELLO',
    title: 'Scioglilingua Letale',
    text: '{p2} deve dire velocissimo: "Sopra la panca la capra campa, sotto la panca la capra crepa". Se si impappina beve 2 sorsi, se lo dice perfetto beve {p1}!',
    sips: '2 Sorsi'
  },
  {
    id: 35,
    category: 'DUELLO',
    title: 'Calcolo Mentale da Brilli',
    text: 'Sfida di velocità tra {p1} e {p2}: il primo dei due che dice ad alta voce il risultato esatto di "16 per 4 meno 9" fa bere 3 sorsi all\'avversario!',
    sips: '3 Sorsi'
  },
  {
    id: 36,
    category: 'DUELLO',
    title: 'Testa o Croce Invisibile',
    text: '{p1} nasconde un piccolo oggetto (un tappo o una moneta) in una delle due mani dietro la schiena. Se {p2} indovina la mano giusta beve {p1} (2 sorsi), altrimenti beve {p2}!',
    sips: '2 Sorsi'
  },

  // ==================== 4. SCUDO (6 Carte - Verde) ====================
  {
    id: 37,
    category: 'SCUDO',
    title: 'Scudo Protettivo!',
    text: 'Fortuna sfacciata! {p1} ottiene uno Scudo che può conservare e usare in qualsiasi momento della partita per saltare una bevuta.',
    sips: 'Immunità'
  },
  {
    id: 38,
    category: 'SCUDO',
    title: 'Scudo dell\'Angelo Custode',
    text: '{p1} ottiene uno Scudo! Puoi conservarlo per salvarti più avanti oppure usarlo anche per salvare un amico in difficoltà durante la serata.',
    sips: 'Immunità'
  },
  {
    id: 39,
    category: 'SCUDO',
    title: 'Scudo Corazzato',
    text: '{p1} trova uno Scudo d\'oro! Premi il pulsante qui sotto per aggiungerlo alla tua barra e consumalo quando vuoi annullare una penitenza.',
    sips: 'Immunità'
  },
  {
    id: 40,
    category: 'SCUDO',
    title: 'Scudo dell\'Invidia',
    text: '{p1} guadagna 1 Scudo gratuito! Inoltre, tutti i giocatori che in questo momento hanno 0 scudi attivi bevono 1 sorso per l\'invidia.',
    sips: 'Immunità + 1 Sorso'
  },
  {
    id: 41,
    category: 'SCUDO',
    title: 'Scudo Tattico',
    text: '{p1} ottiene uno Scudo da tenere in riserva e, per festeggiare l\'immunità, sceglie se far bere 1 sorso a {p2} o brindare insieme!',
    sips: 'Immunità'
  },
  {
    id: 42,
    category: 'SCUDO',
    title: 'Bunker Antiatomico',
    text: '{p1} incassa uno Scudo salvavita! Ricordati di cliccare sulla tua icona scudo in alto quando vorrai attivarlo per schivare un turno pesante.',
    sips: 'Immunità'
  },

  // ==================== 5. NUOVA REGOLA / LEGGE (10 Carte - Viola) ====================
  {
    id: 43,
    category: 'REGOLA',
    title: 'Parola Proibita: "BERE"',
    text: 'Nuova Legge per 8 giri: è vietato pronunciare il verbo "BERE" in qualsiasi forma o coniugazione! Chi cade in trappola beve 1 sorso di penalità.',
    sips: 'Penalità 1 Sorso',
    ruleTitle: 'Vietato dire "BERE"',
    duration: 8
  },
  {
    id: 44,
    category: 'REGOLA',
    title: 'Mano Non Dominante',
    text: 'Nuova Legge per 7 giri: si può impugnare il bicchiere solo con la mano NON dominante (sinistra per i destrorsi e viceversa). Chi sbaglia beve 2 sorsi extra!',
    sips: 'Penalità 2 Sorsi',
    ruleTitle: 'Bere con mano non dominante',
    duration: 7
  },
  {
    id: 45,
    category: 'REGOLA',
    title: 'Galateo dell\'Ottocento',
    text: 'Nuova Legge per 6 giri: è vietato darsi del "tu". Bisogna rivolgersi agli altri dando rigorosamente del "Voi" o "Sua Eccellenza". Chi sbaglia beve 1 sorso!',
    sips: 'Penalità 1 Sorso',
    ruleTitle: 'Dare del "Voi" a tutti',
    duration: 6
  },
  {
    id: 46,
    category: 'REGOLA',
    title: 'L\'Omino sul Bicchiere',
    text: 'Nuova Legge per 7 giri: prima di bere devi togliere un "omino invisibile" dal bordo del bicchiere, posarlo sul tavolo e rimetterlo sopra dopo aver bevuto. Chi dimentica beve di nuovo!',
    sips: 'Raddoppia Sorsi',
    ruleTitle: 'Omino invisibile sul bicchiere',
    duration: 7
  },
  {
    id: 47,
    category: 'REGOLA',
    title: 'Anonimato Assoluto',
    text: 'Nuova Legge per 6 giri: è severamente vietato chiamare i giocatori con il loro vero nome! Usate solo cognomi o soprannomi inventati. Chi usa un nome proprio beve 1 sorso.',
    sips: 'Penalità 1 Sorso',
    ruleTitle: 'Vietato dire i Nomi Propri',
    duration: 6
  },
  {
    id: 48,
    category: 'REGOLA',
    title: 'Zona Detox Digitale',
    text: 'Nuova Legge per 8 giri: nessuno può toccare il proprio telefono (escluso chi gestisce quest\'app). Chi controlla notifiche o risponde a messaggi beve 3 sorsi!',
    sips: 'Penalità 3 Sorsi',
    ruleTitle: 'Vietato toccare il telefono',
    duration: 8
  },
  {
    id: 49,
    category: 'REGOLA',
    title: 'Il Maestro dei Pollici',
    text: 'Per i prossimi 6 giri {p1} è il Maestro dei Pollici: quando appoggia di nascosto il pollice sul bordo del tavolo, tutti devono imitarlo. L\'ultimo che lo fa beve 2 sorsi!',
    sips: 'Penalità 2 Sorsi',
    ruleTitle: 'Maestro dei Pollici ({p1})',
    duration: 6
  },
  {
    id: 50,
    category: 'REGOLA',
    title: 'Sindrome di Giulio Cesare',
    text: 'Nuova Legge per 5 giri: chiunque parli di sé deve farlo in TERZA PERSONA (es. "{p1} ha sete" invece di "Ho sete"). Chi usa "io/mi/me" beve 1 sorso!',
    sips: 'Penalità 1 Sorso',
    ruleTitle: 'Parlare in 3ª persona',
    duration: 5
  },
  {
    id: 51,
    category: 'REGOLA',
    title: 'Dito Maleducato',
    text: 'Nuova Legge per 6 giri: è vietato indicare con le dita! (Se esce una carta Giuria, bisogna indicare usando il GOMITO). Chi indica col dito beve 1 sorso.',
    sips: 'Penalità 1 Sorso',
    ruleTitle: 'Vietato indicare col dito',
    duration: 6
  },
  {
    id: 52,
    category: 'REGOLA',
    title: 'Omaggio al Boss',
    text: 'Nuova Legge per 6 giri: chiunque debba bere deve prima guardare {p1} e dire "Alla salute del Boss!". Chi beve senza farlo deve bere un altro sorso.',
    sips: 'Penalità +1 Sorso',
    ruleTitle: 'Dire "Alla salute del Boss ({p1})"',
    duration: 6
  },

  // ==================== 6. LA GIURIA / VOTAZIONE (10 Carte - Arancione) ====================
  {
    id: 53,
    category: 'GIURIA',
    title: 'Fedina Penale Dubbia',
    text: 'Al 3, tutti indicano chi del gruppo è più propenso a finire in prigione per un motivo completamente assurdo. Chi riceve più voti beve tanti sorsi quanti sono i voti ricevuti!',
    sips: '1 Sorso x Voto'
  },
  {
    id: 54,
    category: 'GIURIA',
    title: 'Apocalisse Zombie',
    text: 'Al 3, tutti indicano chi del gruppo morirebbe per PRIMO durante un\'invasione zombie. Il più votato beve tanti sorsi quanti sono i voti presi!',
    sips: '1 Sorso x Voto'
  },
  {
    id: 55,
    category: 'GIURIA',
    title: 'Riccanza Bruciata',
    text: 'Al 3, tutti indicano chi sperpererebbe una vincita milionaria alla lotteria in meno di un mese. Chi riceve più voti beve tanti sorsi quanti sono i voti ricevuti!',
    sips: '1 Sorso x Voto'
  },
  {
    id: 56,
    category: 'GIURIA',
    title: 'Messaggio delle 3 di Notte',
    text: 'Al 3, indicate chi del gruppo è più propenso a scrivere o chiamare l\'ex a notte fonda dopo qualche bicchiere. Il più votato beve 1 sorso per ogni voto!',
    sips: '1 Sorso x Voto'
  },
  {
    id: 57,
    category: 'GIURIA',
    title: 'Radio Serva',
    text: 'Al 3, tutti indicano chi del gruppo NON sa assolutamente mantenere un segreto. Chi ottiene la maggioranza beve tanti sorsi quanti sono i voti ricevuti!',
    sips: '1 Sorso x Voto'
  },
  {
    id: 58,
    category: 'GIURIA',
    title: 'Naufragio da Incubo',
    text: 'Al 3, indicate la persona con cui NON vorreste mai rimanere bloccati su un\'isola deserta perché impazzireste. Il più votato beve 1 sorso a voto!',
    sips: '1 Sorso x Voto'
  },
  {
    id: 59,
    category: 'GIURIA',
    title: 'Matrimonio d\'Interesse',
    text: 'Al 3, tutti indicano chi del gruppo è più propenso a sposare un ottantenne miliardario solo per l\'eredità. Chi riceve più voti beve 1 sorso per voto!',
    sips: '1 Sorso x Voto'
  },
  {
    id: 60,
    category: 'GIURIA',
    title: 'Re/Regina del Dramma',
    text: 'Al 3, indicate chi fa più tragedie e testamento spirituale appena ha 37.1 di febbre. Il vincitore beve tanti sorsi quanti sono i voti ricevuti!',
    sips: '1 Sorso x Voto'
  },
  {
    id: 61,
    category: 'GIURIA',
    title: 'Fame di Fama',
    text: 'Al 3, tutti indicano chi parteciperebbe senza vergogna al reality show più trash della TV pur di diventare famoso. Chi prende più voti beve 1 sorso a voto!',
    sips: '1 Sorso x Voto'
  },
  {
    id: 62,
    category: 'GIURIA',
    title: 'Il Re dei Pacchi',
    text: 'Al 3, tutti indicano chi del gruppo tira più "pacchi" all\'ultimo minuto quando si organizza una serata. Il più votato beve 1 sorso per ogni voto ricevuto!',
    sips: '1 Sorso x Voto'
  },

  // ==================== 7. MALEDIZIONE / COMPAGNO DI SVENTURA (8 Carte - Fucsia) ====================
  {
    id: 63,
    category: 'MALEDIZIONE',
    title: 'Gemelli Siamesi',
    text: '{p1} diventa il gemello di sventura di {p2} per i prossimi 6 giri! Ogni singola volta che uno dei due deve bere, anche l\'altro è obbligato a bere.',
    sips: 'Legame 6 Giri',
    ruleTitle: 'Gemelli: {p1} 🔗 {p2}',
    duration: 6
  },
  {
    id: 64,
    category: 'MALEDIZIONE',
    title: 'Avvocato Difensore',
    text: 'Per i prossimi 5 giri {p1} ha diritto al silenzio: se qualcuno fa una domanda a {p1}, deve rispondere {p2} al posto suo! Se {p1} risponde da solo, beve 2 sorsi.',
    sips: 'Legame 5 Giri',
    ruleTitle: '{p2} avvocato di {p1}',
    duration: 5
  },
  {
    id: 65,
    category: 'MALEDIZIONE',
    title: 'L\'Eco Umano',
    text: 'Per i prossimi 4 giri, {p1} deve ripetere ad alta voce l\'ultima parola di ogni frase detta da {p2} come un eco. Se se ne dimentica, beve 1 sorso!',
    sips: 'Legame 4 Giri',
    ruleTitle: '{p1} fa l\'eco a {p2}',
    duration: 4
  },
  {
    id: 66,
    category: 'MALEDIZIONE',
    title: 'Bella Statuina',
    text: 'Per i prossimi 5 giri, {p2} può urlare "FREEZE!" a {p1} (max 1 volta a giro). {p1} deve immobilizzarsi subito per 5 secondi: se si muove o ride, beve 2 sorsi!',
    sips: 'Legame 5 Giri',
    ruleTitle: 'Freeze: {p2} blocca {p1}',
    duration: 5
  },
  {
    id: 67,
    category: 'MALEDIZIONE',
    title: 'Il Maggiordomo Fedele',
    text: 'Per i prossimi 5 giri, {p1} è il maggiordomo personale di {p2}: ogni volta che {p2} deve bere, {p1} deve porgergli il bicchiere. Se dimentica, beve anche {p1}!',
    sips: 'Legame 5 Giri',
    ruleTitle: '{p1} maggiordomo di {p2}',
    duration: 5
  },
  {
    id: 68,
    category: 'MALEDIZIONE',
    title: 'Sguardo Proibito',
    text: 'Maledizione di Medusa per 5 giri: {p1} e {p2} non possono MAI incrociare lo sguardo! Ogni volta che si guardano negli occhi per sbaglio, bevono entrambi 1 sorso.',
    sips: 'Legame 5 Giri',
    ruleTitle: 'Vietato guardarsi: {p1} ⚡ {p2}',
    duration: 5
  },
  {
    id: 69,
    category: 'MALEDIZIONE',
    title: 'La Sfinge Maledetta',
    text: 'Per i prossimi 5 giri {p1} è la Sfinge: chiunque risponda a una domanda fatta da {p1} deve bere 1 sorso (a meno che non risponda dicendo "Bocche cucite!").',
    sips: 'Maledizione 5 Giri',
    ruleTitle: '{p1} è la Sfinge (non rispondere)',
    duration: 5
  },
  {
    id: 70,
    category: 'MALEDIZIONE',
    title: 'Il Patto del Diavolo (RARA)',
    text: 'Carta Rara! {p1} deve scegliere subito: bere MEZZO BICCHIERE adesso in solitaria, oppure legarsi a {p2} per 6 giri bevendo il DOPPIO ogni volta che {p2} beve!',
    sips: 'Mezzo Bicchiere!',
    ruleTitle: 'Patto: {p1} beve 2x con {p2}',
    duration: 6
  }
];

/* =========================================================================
   IMPREVISTI DI NEON SIPS
   Ogni tanto (come in Hai Mai?) una carta arriva con un imprevisto.
   Segnaposto: {p1} = giocatore di turno, {p2} = avversario, {next} = chi salta il turno.
   effect: cosa cambia nella partita quando esce ('reverse', 'skip', 'shield'); senza effect è solo una regola da leggere.
   exclude: categorie di carte su cui non ha senso (es. sulle carte Scudo nessuno beve).
   minPlayers: giocatori necessari perché abbia senso.
========================================================================= */
const NEON_TWISTS = [
  {
    id: 'doppio',
    icon: 'fa-angles-up',
    title: 'Sorsi doppi!',
    rule: 'Chi beve per questa carta beve il doppio.',
    exclude: ['SCUDO'],
    minPlayers: 2
  },
  {
    id: 'brindisi',
    icon: 'fa-champagne-glasses',
    title: 'Brindisi collettivo',
    rule: 'Finita la carta, cin cin: tutto il tavolo beve 1 sorso.',
    exclude: [],
    minPlayers: 2
  },
  {
    id: 'compagno',
    icon: 'fa-user-group',
    title: 'Compagno di bevute',
    rule: 'Chi beve per questa carta sceglie qualcuno che beve insieme a lui.',
    exclude: ['SCUDO'],
    minPlayers: 3
  },
  {
    id: 'inverti',
    icon: 'fa-rotate-left',
    title: 'Giro al contrario!',
    rule: 'Da adesso i turni girano nell\'altro verso.',
    effect: 'reverse',
    exclude: [],
    minPlayers: 3
  },
  {
    id: 'salta',
    icon: 'fa-forward',
    title: 'Salta il turno',
    rule: '{next} salta il suo prossimo turno.',
    effect: 'skip',
    exclude: [],
    minPlayers: 3
  },
  {
    id: 'scudo',
    icon: 'fa-shield-halved',
    title: 'Scudo regalo',
    rule: '{p1} riceve subito uno scudo gratis!',
    effect: 'shield',
    exclude: ['SCUDO'],
    minPlayers: 2
  }
];

function findNeonTwist(id) {
  return NEON_TWISTS.find(t => t.id === id) || null;
}

/** Imprevisto per la carta appena pescata (o null). Usa pickFromTwists di common.js. */
function pickNeonTwist(enabled, previousTwistId, category, playersCount, random) {
  return pickFromTwists(NEON_TWISTS, enabled, previousTwistId, random,
    t => !t.exclude.includes(category) && playersCount >= t.minPlayers);
}

/** Indice del prossimo giocatore nel verso del giro (1 o -1). */
function nextTurnIndex(index, dir, count) {
  if (count <= 0) return 0;
  return (((index + dir) % count) + count) % count;
}
