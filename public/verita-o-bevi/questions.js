'use strict';

/* =========================================================================
   VERITÀ O BEVI: livelli, domande, imprevisti e regole pure (senza schermo).
   Li controllano i test in tests/verita-o-bevi.test.js.
   Si gioca a turno con i nomi: chi è di turno risponde sinceramente… o beve.
   Per aggiungere una domanda: copia una riga del suo livello e cambia id e testo
   (l'id deve essere unico: lettera del livello + numero). {p2} = un altro giocatore scelto a caso.
========================================================================= */

const VERITA_CATEGORIES = {
  ROMPIGHIACCIO: {
    id: 'ROMPIGHIACCIO',
    name: 'Rompighiaccio',
    emoji: '🧊',
    level: 1,
    sips: 1,
    adult: false,
    defaultOn: true,
    description: 'Per conoscersi: gusti, viaggi, manie, sogni da bambini.',
    color: '#2dd4bf',
    glow: 'rgba(45, 212, 191, 0.42)',
    bgSoft: 'rgba(45, 212, 191, 0.12)',
    badgeClass: 'bg-teal-400/15 text-teal-300 border-teal-400/40'
  },
  SERATA: {
    id: 'SERATA',
    name: 'Serata alcolica',
    emoji: '🍻',
    level: 2,
    sips: 1,
    adult: false,
    defaultOn: true,
    description: 'Sbronze, feste, figuracce e messaggi dopo mezzanotte.',
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.42)',
    bgSoft: 'rgba(251, 191, 36, 0.12)',
    badgeClass: 'bg-amber-400/15 text-amber-300 border-amber-400/40'
  },
  PERSONALI: {
    id: 'PERSONALI',
    name: 'Personali',
    emoji: '💭',
    level: 3,
    sips: 2,
    adult: false,
    defaultOn: true,
    description: 'Paure, rimpianti, amori e quello che pensate davvero.',
    color: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.42)',
    bgSoft: 'rgba(167, 139, 250, 0.12)',
    badgeClass: 'bg-violet-400/15 text-violet-300 border-violet-400/40'
  },
  SCOMODE: {
    id: 'SCOMODE',
    name: 'Scomode',
    emoji: '😈',
    level: 4,
    sips: 2,
    adult: false,
    defaultOn: true,
    description: 'Droghe, bugie, tradimenti e cose che non si dicono.',
    color: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.42)',
    bgSoft: 'rgba(244, 114, 182, 0.12)',
    badgeClass: 'bg-pink-400/15 text-pink-300 border-pink-400/40'
  },
  PICCANTI: {
    id: 'PICCANTI',
    name: 'Piccanti',
    emoji: '🌶️',
    level: 5,
    sips: 3,
    adult: true,
    defaultOn: false,
    description: 'Baci, appuntamenti, attrazioni e segreti di coppia.',
    color: '#fb7185',
    glow: 'rgba(251, 113, 133, 0.45)',
    bgSoft: 'rgba(251, 113, 133, 0.12)',
    badgeClass: 'bg-rose-400/15 text-rose-300 border-rose-400/40'
  },
  HOT: {
    id: 'HOT',
    name: 'Hot spinto',
    emoji: '🔥',
    level: 6,
    sips: 3,
    adult: true,
    defaultOn: false,
    description: 'Sesso, fantasie ed esperienze senza filtri.',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.5)',
    bgSoft: 'rgba(239, 68, 68, 0.13)',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/45'
  },
  MIE: {
    id: 'MIE',
    name: 'Le vostre',
    emoji: '✍️',
    level: 3,
    sips: 2,
    adult: false,
    defaultOn: true,
    description: 'Le domande che avete scritto voi.',
    color: '#c4b5fd',
    glow: 'rgba(196, 181, 253, 0.42)',
    bgSoft: 'rgba(196, 181, 253, 0.12)',
    badgeClass: 'bg-violet-300/15 text-violet-200 border-violet-300/40'
  }
};

const VERITA_QUESTIONS = [
  // ==================== 🧊 ROMPIGHIACCIO ====================
  { id: 'r01', category: 'ROMPIGHIACCIO', text: 'Qual è il tuo cibo preferito in assoluto?' },
  { id: 'r02', category: 'ROMPIGHIACCIO', text: 'Che lavoro sognavi di fare da piccolo?' },
  { id: 'r03', category: 'ROMPIGHIACCIO', text: 'Qual è l\'ultima serie che hai guardato tutta d\'un fiato?' },
  { id: 'r04', category: 'ROMPIGHIACCIO', text: 'Se potessi vivere in un\'altra città, quale sceglieresti?' },
  { id: 'r05', category: 'ROMPIGHIACCIO', text: 'Qual è la canzone che ascolti di più in questo periodo?' },
  { id: 'r06', category: 'ROMPIGHIACCIO', text: 'Sei più tipo da mare o da montagna?' },
  { id: 'r07', category: 'ROMPIGHIACCIO', text: 'Qual è il viaggio più bello che hai fatto?' },
  { id: 'r08', category: 'ROMPIGHIACCIO', text: 'Hai un talento nascosto? Dimostralo!' },
  { id: 'r09', category: 'ROMPIGHIACCIO', text: 'Qual è il tuo film preferito di sempre?' },
  { id: 'r10', category: 'ROMPIGHIACCIO', text: 'Cosa ordini sempre quando vai in pizzeria?' },
  { id: 'r11', category: 'ROMPIGHIACCIO', text: 'Qual è l\'app che usi di più sul telefono?' },
  { id: 'r12', category: 'ROMPIGHIACCIO', text: 'Che superpotere vorresti avere?' },
  { id: 'r13', category: 'ROMPIGHIACCIO', text: 'Cane o gatto? E perché?' },
  { id: 'r14', category: 'ROMPIGHIACCIO', text: 'Qual è la cosa più strana che hai mai mangiato?' },
  { id: 'r15', category: 'ROMPIGHIACCIO', text: 'Che lavoro fai, e ti piace davvero?' },
  { id: 'r16', category: 'ROMPIGHIACCIO', text: 'Qual è il tuo posto preferito nella tua città?' },
  { id: 'r17', category: 'ROMPIGHIACCIO', text: 'Se vincessi un milione domani, qual è la prima cosa che faresti?' },
  { id: 'r18', category: 'ROMPIGHIACCIO', text: 'Qual è il personaggio famoso che ti sta più simpatico?' },
  { id: 'r19', category: 'ROMPIGHIACCIO', text: 'Che hobby hai che pochi conoscono?' },
  { id: 'r20', category: 'ROMPIGHIACCIO', text: 'Sei più mattiniero o nottambulo?' },
  { id: 'r21', category: 'ROMPIGHIACCIO', text: 'Qual è il regalo più bello che hai ricevuto?' },
  { id: 'r22', category: 'ROMPIGHIACCIO', text: 'Quale cantante andresti a vedere in concerto stasera?' },
  { id: 'r23', category: 'ROMPIGHIACCIO', text: 'Che soprannome avevi da piccolo?' },
  { id: 'r24', category: 'ROMPIGHIACCIO', text: 'Qual è il tuo piatto forte in cucina?' },
  { id: 'r25', category: 'ROMPIGHIACCIO', text: 'Hai mai vinto qualcosa a un concorso o a una lotteria?' },
  { id: 'r26', category: 'ROMPIGHIACCIO', text: 'Qual è il film o la serie che hai rivisto più volte?' },
  { id: 'r27', category: 'ROMPIGHIACCIO', text: 'Se fossi un animale, quale saresti?' },
  { id: 'r28', category: 'ROMPIGHIACCIO', text: 'Qual è la tua stagione preferita, e perché?' },
  { id: 'r29', category: 'ROMPIGHIACCIO', text: 'Quante lingue sai parlare, anche male?' },
  { id: 'r30', category: 'ROMPIGHIACCIO', text: 'Qual è l\'ultima foto che hai scattato? Mostrala!' },
  { id: 'r31', category: 'ROMPIGHIACCIO', text: 'Hai una squadra del cuore?' },
  { id: 'r32', category: 'ROMPIGHIACCIO', text: 'Qual è l\'emoji che usi di più?' },
  { id: 'r33', category: 'ROMPIGHIACCIO', text: 'Che cosa ti fa ridere sempre, anche quando non dovresti?' },
  { id: 'r34', category: 'ROMPIGHIACCIO', text: 'Qual è il libro che consiglieresti a tutti?' },
  { id: 'r35', category: 'ROMPIGHIACCIO', text: 'Qual è stato il primo concerto a cui sei andato?' },
  { id: 'r36', category: 'ROMPIGHIACCIO', text: 'Cosa non può mai mancare nel tuo frigo?' },
  { id: 'r37', category: 'ROMPIGHIACCIO', text: 'Cosa ti ha colpito di {p2} la prima volta che l\'hai visto?' },
  { id: 'r38', category: 'ROMPIGHIACCIO', text: 'Chi del tavolo sceglieresti come compagno di viaggio?' },
  { id: 'r39', category: 'ROMPIGHIACCIO', text: 'Qual è la cosa che sai fare meglio?' },
  { id: 'r40', category: 'ROMPIGHIACCIO', text: 'Qual è il tuo ricordo d\'infanzia più bello?' },

  // ==================== 🍻 SERATA ALCOLICA ====================
  { id: 's01', category: 'SERATA', text: 'Qual è la sbronza peggiore che ti ricordi?' },
  { id: 's02', category: 'SERATA', text: 'Qual è il tuo drink preferito, e quale non riesci proprio a bere?' },
  { id: 's03', category: 'SERATA', text: 'Ti sei mai svegliato senza ricordare niente della sera prima?' },
  { id: 's04', category: 'SERATA', text: 'Qual è la cosa più stupida che hai fatto da ubriaco?' },
  { id: 's05', category: 'SERATA', text: 'A chi hai scritto l\'ultima volta da ubriaco, e cosa gli hai detto?' },
  { id: 's06', category: 'SERATA', text: 'Hai mai vomitato in un posto imbarazzante? Dove?' },
  { id: 's07', category: 'SERATA', text: 'Qual è il locale dove ti sei divertito di più?' },
  { id: 's08', category: 'SERATA', text: 'Ti sei mai addormentato in un posto assurdo dopo una serata?' },
  { id: 's09', category: 'SERATA', text: 'Qual è la festa più folle a cui sei stato?' },
  { id: 's10', category: 'SERATA', text: 'Hai mai fatto l\'alba e sei andato dritto a lavoro o a lezione?' },
  { id: 's11', category: 'SERATA', text: 'Chi del tavolo regge meno l\'alcol, secondo te?' },
  { id: 's12', category: 'SERATA', text: 'Chi del tavolo vorresti come compagno di sbronze?' },
  { id: 's13', category: 'SERATA', text: 'Hai mai baciato qualcuno solo perché eri ubriaco?' },
  { id: 's14', category: 'SERATA', text: 'Qual è la scusa più assurda che hai inventato per non andare a una festa?' },
  { id: 's15', category: 'SERATA', text: 'Hai mai perso qualcosa di importante durante una serata?' },
  { id: 's16', category: 'SERATA', text: 'Qual è il drink più caro che hai mai pagato?' },
  { id: 's17', category: 'SERATA', text: 'Ti sei mai fatto cacciare da un locale?' },
  { id: 's18', category: 'SERATA', text: 'Hai mai mentito sull\'età per entrare da qualche parte?' },
  { id: 's19', category: 'SERATA', text: 'Qual è la canzone più imbarazzante che hai cantato al karaoke?' },
  { id: 's20', category: 'SERATA', text: 'Che tipo di ubriaco sei: affettuoso, filosofo, ballerino o piagnone?' },
  { id: 's21', category: 'SERATA', text: 'Hai mai chiamato un ex da ubriaco?' },
  { id: 's22', category: 'SERATA', text: 'Qual è il tuo rimedio segreto contro i postumi?' },
  { id: 's23', category: 'SERATA', text: 'Hai mai portato via qualcosa da un locale, anche solo un bicchiere?' },
  { id: 's24', category: 'SERATA', text: 'Qual è la serata che vorresti cancellare dalla memoria?' },
  { id: 's25', category: 'SERATA', text: 'Ti sei mai ritrovato a casa di sconosciuti alla fine di una festa?' },
  { id: 's26', category: 'SERATA', text: 'Hai mai finto di essere ubriaco per avere una scusa?' },
  { id: 's27', category: 'SERATA', text: 'Cosa hai pubblicato sui social da ubriaco e poi hai cancellato?' },
  { id: 's28', category: 'SERATA', text: 'Com\'è andata la tua prima sbronza?' },
  { id: 's29', category: 'SERATA', text: 'Hai mai bevuto qualcosa senza sapere cosa fosse?' },
  { id: 's30', category: 'SERATA', text: 'Qual è la cosa più pazza che hai fatto in vacanza?' },
  { id: 's31', category: 'SERATA', text: 'Chi del tavolo ti ha visto nello stato peggiore?' },
  { id: 's32', category: 'SERATA', text: 'Hai mai dormito in macchina dopo una serata?' },
  { id: 's33', category: 'SERATA', text: 'Hai mai ballato sul bancone di un bar?' },
  { id: 's34', category: 'SERATA', text: 'Qual è il messaggio più imbarazzante che hai mandato dopo mezzanotte?' },
  { id: 's35', category: 'SERATA', text: 'Hai mai fatto una promessa da ubriaco che poi hai dovuto mantenere?' },
  { id: 's36', category: 'SERATA', text: 'Quanti shot reggi prima di diventare un\'altra persona?' },
  { id: 's37', category: 'SERATA', text: 'Hai mai fatto litigare due amici durante una serata?' },
  { id: 's38', category: 'SERATA', text: 'Hai mai vomitato addosso a qualcuno?' },
  { id: 's39', category: 'SERATA', text: 'Qual è la bugia più grande che hai detto ai tuoi per uscire?' },
  { id: 's40', category: 'SERATA', text: 'Racconta la serata più bella che hai passato con qualcuno di questo tavolo.' },

  // ==================== 💭 PERSONALI ====================
  { id: 'd01', category: 'PERSONALI', text: 'Qual è la tua più grande paura?' },
  { id: 'd02', category: 'PERSONALI', text: 'Di cosa ti penti di più nella vita?' },
  { id: 'd03', category: 'PERSONALI', text: 'Qual è la cosa di cui vai più fiero?' },
  { id: 'd04', category: 'PERSONALI', text: 'Quando è stata l\'ultima volta che hai pianto, e perché?' },
  { id: 'd05', category: 'PERSONALI', text: 'Cosa vorresti cambiare di te stesso?' },
  { id: 'd06', category: 'PERSONALI', text: 'Chi è la persona più importante della tua vita?' },
  { id: 'd07', category: 'PERSONALI', text: 'Qual è il momento più difficile che hai superato?' },
  { id: 'd08', category: 'PERSONALI', text: 'Hai mai avuto il cuore spezzato? Com\'è andata?' },
  { id: 'd09', category: 'PERSONALI', text: 'Qual è il tuo sogno nel cassetto?' },
  { id: 'd10', category: 'PERSONALI', text: 'Cosa ti fa sentire davvero felice?' },
  { id: 'd11', category: 'PERSONALI', text: 'Qual è il consiglio migliore che hai mai ricevuto?' },
  { id: 'd12', category: 'PERSONALI', text: 'C\'è qualcuno a cui dovresti chiedere scusa e non l\'hai mai fatto?' },
  { id: 'd13', category: 'PERSONALI', text: 'Dove ti vedi tra dieci anni?' },
  { id: 'd14', category: 'PERSONALI', text: 'Qual è la cosa più coraggiosa che hai mai fatto?' },
  { id: 'd15', category: 'PERSONALI', text: 'Qual è la cosa che la gente sbaglia più spesso su di te?' },
  { id: 'd16', category: 'PERSONALI', text: 'Qual è la tua insicurezza più grande?' },
  { id: 'd17', category: 'PERSONALI', text: 'Hai mai perso un amico importante? Perché?' },
  { id: 'd18', category: 'PERSONALI', text: 'Cosa non perdoneresti mai a qualcuno?' },
  { id: 'd19', category: 'PERSONALI', text: 'Se potessi parlare con te stesso da ragazzino, cosa ti diresti?' },
  { id: 'd20', category: 'PERSONALI', text: 'Qual è il complimento più bello che hai ricevuto?' },
  { id: 'd21', category: 'PERSONALI', text: 'Sei mai stato innamorato davvero?' },
  { id: 'd22', category: 'PERSONALI', text: 'Qual è la cosa che ti fa arrabbiare più di tutte?' },
  { id: 'd23', category: 'PERSONALI', text: 'Cosa ti manca di più della tua infanzia?' },
  { id: 'd24', category: 'PERSONALI', text: 'Hai un segreto che non hai mai detto ai tuoi genitori?' },
  { id: 'd25', category: 'PERSONALI', text: 'Qual è la decisione più difficile che hai preso?' },
  { id: 'd26', category: 'PERSONALI', text: 'In questo periodo ti senti più solo o più circondato da persone?' },
  { id: 'd27', category: 'PERSONALI', text: 'Cosa apprezzi di più in un\'amicizia?' },
  { id: 'd28', category: 'PERSONALI', text: 'Cosa pensi davvero di {p2}?' },
  { id: 'd29', category: 'PERSONALI', text: 'Qual è stata la tua prima impressione di {p2}? Era giusta?' },
  { id: 'd30', category: 'PERSONALI', text: 'Chi del tavolo conosci da più tempo, e come vi siete conosciuti?' },
  { id: 'd31', category: 'PERSONALI', text: 'Qual è stato il giorno più bello della tua vita?' },
  { id: 'd32', category: 'PERSONALI', text: 'C\'è una persona che ti manca in questo momento?' },
  { id: 'd33', category: 'PERSONALI', text: 'Cosa ti tiene sveglio la notte?' },
  { id: 'd34', category: 'PERSONALI', text: 'Ti senti realizzato con la tua vita di adesso?' },
  { id: 'd35', category: 'PERSONALI', text: 'Qual è una cosa che non hai mai detto a nessuno di questo tavolo?' },
  { id: 'd36', category: 'PERSONALI', text: 'Hai mai detto "ti amo" senza pensarlo davvero?' },
  { id: 'd37', category: 'PERSONALI', text: 'Qual è la relazione che ti ha cambiato di più?' },
  { id: 'd38', category: 'PERSONALI', text: 'Cosa vorresti che gli altri capissero di te?' },
  { id: 'd39', category: 'PERSONALI', text: 'Qual è la cosa più gentile che qualcuno ha fatto per te?' },
  { id: 'd40', category: 'PERSONALI', text: 'Se domani fosse il tuo ultimo giorno, chi chiameresti per primo?' },

  // ==================== 😈 SCOMODE ====================
  { id: 'c01', category: 'SCOMODE', text: 'Ti sei mai fatto di droghe?' },
  { id: 'c02', category: 'SCOMODE', text: 'Qual è la cosa più illegale che hai mai fatto?' },
  { id: 'c03', category: 'SCOMODE', text: 'Hai mai tradito qualcuno?' },
  { id: 'c04', category: 'SCOMODE', text: 'Hai mai rubato qualcosa in un negozio?' },
  { id: 'c05', category: 'SCOMODE', text: 'Hai mai letto di nascosto il telefono del tuo partner?' },
  { id: 'c06', category: 'SCOMODE', text: 'Qual è la bugia più grossa che hai detto a qualcuno di questo tavolo?' },
  { id: 'c07', category: 'SCOMODE', text: 'Hai mai parlato male di qualcuno seduto qui stasera?' },
  { id: 'c08', category: 'SCOMODE', text: 'Hai mai finto di stare male per non vedere qualcuno?' },
  { id: 'c09', category: 'SCOMODE', text: 'Hai mai avuto una cotta per il partner di un amico?' },
  { id: 'c10', category: 'SCOMODE', text: 'Chi del tavolo non vorresti mai come coinquilino, e perché?' },
  { id: 'c11', category: 'SCOMODE', text: 'Hai mai avuto guai con la polizia?' },
  { id: 'c12', category: 'SCOMODE', text: 'Hai mai copiato a un esame importante?' },
  { id: 'c13', category: 'SCOMODE', text: 'Hai mai detto "ti voglio bene" a qualcuno che non sopportavi?' },
  { id: 'c14', category: 'SCOMODE', text: 'Qual è la cosa più cattiva che hai fatto a un ex?' },
  { id: 'c15', category: 'SCOMODE', text: 'Hai mai fumato qualcosa che non era tabacco?' },
  { id: 'c16', category: 'SCOMODE', text: 'Hai mai mentito sul curriculum?' },
  { id: 'c17', category: 'SCOMODE', text: 'Chi del tavolo ti sta meno simpatico, anche solo un po\'?' },
  { id: 'c18', category: 'SCOMODE', text: 'Hai mai fatto ghosting a qualcuno? Perché?' },
  { id: 'c19', category: 'SCOMODE', text: 'Hai mai spiato un ex con un profilo falso?' },
  { id: 'c20', category: 'SCOMODE', text: 'Hai mai preso soldi in prestito senza restituirli?' },
  { id: 'c21', category: 'SCOMODE', text: 'Hai mai provato droghe più pesanti di uno spinello?' },
  { id: 'c22', category: 'SCOMODE', text: 'Hai mai guidato dopo aver bevuto troppo?' },
  { id: 'c23', category: 'SCOMODE', text: 'Qual è la ricerca più imbarazzante nella cronologia del tuo telefono?' },
  { id: 'c24', category: 'SCOMODE', text: 'Hai mai finto un\'amicizia per interesse?' },
  { id: 'c25', category: 'SCOMODE', text: 'Hai mai rivelato un segreto che ti era stato confidato?' },
  { id: 'c26', category: 'SCOMODE', text: 'Hai mai fatto il doppio gioco tra due persone che ti piacevano?' },
  { id: 'c27', category: 'SCOMODE', text: 'Qual è il pettegolezzo più cattivo che hai messo in giro?' },
  { id: 'c28', category: 'SCOMODE', text: 'Hai mai inventato una malattia per saltare lavoro o scuola?' },
  { id: 'c29', category: 'SCOMODE', text: 'Hai mai avuto una storia con una persona impegnata?' },
  { id: 'c30', category: 'SCOMODE', text: 'Hai mai mentito a {p2}? Su cosa?' },
  { id: 'c31', category: 'SCOMODE', text: 'Chi del tavolo pensi che dica più bugie?' },
  { id: 'c32', category: 'SCOMODE', text: 'Qual è una cosa che hai fatto e di cui ti vergogni ancora oggi?' },
  { id: 'c33', category: 'SCOMODE', text: 'Hai mai portato via il ragazzo o la ragazza a qualcuno?' },
  { id: 'c34', category: 'SCOMODE', text: 'Hai mai comprato qualcosa di illegale?' },
  { id: 'c35', category: 'SCOMODE', text: 'Hai mai preso pasticche a una festa?' },
  { id: 'c36', category: 'SCOMODE', text: 'Hai mai provato i funghetti o qualcosa di simile?' },
  { id: 'c37', category: 'SCOMODE', text: 'Qual è la cosa più disgustosa che hai fatto per soldi o per una scommessa?' },
  { id: 'c38', category: 'SCOMODE', text: 'Hai mai fatto finta di non vedere un amico in difficoltà?' },
  { id: 'c39', category: 'SCOMODE', text: 'Hai mai sbirciato le chat di un amico mentre era distratto?' },
  { id: 'c40', category: 'SCOMODE', text: 'Se potessi cancellare una cosa che hai fatto, quale sarebbe?' },

  // ==================== 🌶️ PICCANTI (18+) ====================
  { id: 'p01', category: 'PICCANTI', text: 'Chi del tavolo trovi più attraente?' },
  { id: 'p02', category: 'PICCANTI', text: 'Qual è la cosa che ti attrae di più in una persona?' },
  { id: 'p03', category: 'PICCANTI', text: 'Hai mai baciato qualcuno di questo tavolo?' },
  { id: 'p04', category: 'PICCANTI', text: 'Qual è il posto più strano dove hai baciato qualcuno?' },
  { id: 'p05', category: 'PICCANTI', text: 'Hai mai mandato una foto piccante?' },
  { id: 'p06', category: 'PICCANTI', text: 'Hai mai avuto una storia di una notte?' },
  { id: 'p07', category: 'PICCANTI', text: 'Qual è stato il tuo appuntamento peggiore di sempre?' },
  { id: 'p08', category: 'PICCANTI', text: 'Quanti partner hai avuto finora?' },
  { id: 'p09', category: 'PICCANTI', text: 'Hai mai fatto un sogno erotico su qualcuno che conosci?' },
  { id: 'p10', category: 'PICCANTI', text: 'Ti sei mai innamorato di un amico o di un\'amica?' },
  { id: 'p11', category: 'PICCANTI', text: 'Qual è la parte del corpo che preferisci, in te e negli altri?' },
  { id: 'p12', category: 'PICCANTI', text: 'Hai mai flirtato con qualcuno per ottenere qualcosa?' },
  { id: 'p13', category: 'PICCANTI', text: 'Qual è la cosa che proprio non sopporti a letto?' },
  { id: 'p14', category: 'PICCANTI', text: 'Hai mai usato un\'app di incontri? Com\'è andata?' },
  { id: 'p15', category: 'PICCANTI', text: 'Qual è la frase per rimorchiare peggiore che hai sentito o usato?' },
  { id: 'p16', category: 'PICCANTI', text: 'Hai mai fatto sexting?' },
  { id: 'p17', category: 'PICCANTI', text: 'Preferisci luci accese o spente?' },
  { id: 'p18', category: 'PICCANTI', text: 'Hai mai avuto una cotta per un professore o per un capo?' },
  { id: 'p19', category: 'PICCANTI', text: 'Con chi del tavolo andresti a un appuntamento?' },
  { id: 'p20', category: 'PICCANTI', text: 'Hai mai baciato qualcuno del tuo stesso sesso?' },
  { id: 'p21', category: 'PICCANTI', text: 'Qual è la cosa più romantica che hai fatto per qualcuno?' },
  { id: 'p22', category: 'PICCANTI', text: 'Ti hanno mai beccato in un momento intimo?' },
  { id: 'p23', category: 'PICCANTI', text: 'Hai mai lasciato un succhiotto in un posto ben visibile?' },
  { id: 'p24', category: 'PICCANTI', text: 'Descrivi il tuo tipo ideale.' },
  { id: 'p25', category: 'PICCANTI', text: 'Hai mai finto un orgasmo?' },
  { id: 'p26', category: 'PICCANTI', text: 'Quanto tempo è passato dall\'ultima volta?' },
  { id: 'p27', category: 'PICCANTI', text: 'Hai un tatuaggio o un piercing in un posto nascosto?' },
  { id: 'p28', category: 'PICCANTI', text: 'Hai mai avuto un amico con benefici?' },
  { id: 'p29', category: 'PICCANTI', text: 'Qual è la cosa più audace che hai fatto per sedurre qualcuno?' },
  { id: 'p30', category: 'PICCANTI', text: 'Ti sei mai fatto beccare a fissare qualcuno in modo troppo evidente?' },
  { id: 'p31', category: 'PICCANTI', text: 'Hai mai dormito nudo a casa di qualcun altro?' },
  { id: 'p32', category: 'PICCANTI', text: 'Qual è il complimento fisico più bello che hai ricevuto?' },
  { id: 'p33', category: 'PICCANTI', text: 'Qual è il segnale che ti fa capire subito che piaci a qualcuno?' },
  { id: 'p34', category: 'PICCANTI', text: 'Hai mai fatto il bagno nudo insieme ad altre persone?' },
  { id: 'p35', category: 'PICCANTI', text: 'Hai mai mandato un messaggio piccante alla persona sbagliata?' },
  { id: 'p36', category: 'PICCANTI', text: 'Secondo te {p2} è più romantico o più passionale?' },
  { id: 'p37', category: 'PICCANTI', text: 'Hai mai avuto una relazione segreta?' },
  { id: 'p38', category: 'PICCANTI', text: 'Qual è il tuo punto debole quando qualcuno ti bacia?' },
  { id: 'p39', category: 'PICCANTI', text: 'Hai mai baciato due persone diverse nella stessa sera?' },
  { id: 'p40', category: 'PICCANTI', text: 'Hai mai rimorchiato in discoteca e te ne sei pentito il giorno dopo?' },

  // ==================== 🔥 HOT SPINTO (18+) ====================
  { id: 'h01', category: 'HOT', text: 'Hai mai fatto un\'orgia?' },
  { id: 'h02', category: 'HOT', text: 'Hai mai fatto una cosa a tre?' },
  { id: 'h03', category: 'HOT', text: 'Hai mai fatto sesso in un luogo pubblico?' },
  { id: 'h04', category: 'HOT', text: 'Qual è la tua fantasia sessuale più nascosta?' },
  { id: 'h05', category: 'HOT', text: 'Qual è il posto più strano dove hai fatto sesso?' },
  { id: 'h06', category: 'HOT', text: 'Hai mai usato dei sex toys?' },
  { id: 'h07', category: 'HOT', text: 'Hai mai fatto sesso con qualcuno conosciuto la sera stessa?' },
  { id: 'h08', category: 'HOT', text: 'Qual è la cosa più spinta che hai fatto a letto?' },
  { id: 'h09', category: 'HOT', text: 'Hai mai girato un video intimo?' },
  { id: 'h10', category: 'HOT', text: 'Hai mai fatto sesso con un ex dopo esservi lasciati?' },
  { id: 'h11', category: 'HOT', text: 'Hai mai fatto sesso a casa di altri durante una festa?' },
  { id: 'h12', category: 'HOT', text: 'Quante volte al massimo in una notte?' },
  { id: 'h13', category: 'HOT', text: 'Hai mai fatto giochi di ruolo a letto?' },
  { id: 'h14', category: 'HOT', text: 'A letto preferisci comandare o farti comandare?' },
  { id: 'h15', category: 'HOT', text: 'Hai mai fatto sesso in spiaggia?' },
  { id: 'h16', category: 'HOT', text: 'Hai mai avuto una relazione aperta?' },
  { id: 'h17', category: 'HOT', text: 'Hai mai fatto sesso al telefono o in videochiamata?' },
  { id: 'h18', category: 'HOT', text: 'Hai mai fatto sesso con qualcuno molto più grande di te?' },
  { id: 'h19', category: 'HOT', text: 'Qual è la cosa più imbarazzante che ti è successa durante il sesso?' },
  { id: 'h20', category: 'HOT', text: 'Hai mai fatto sesso in un bagno pubblico o in discoteca?' },
  { id: 'h21', category: 'HOT', text: 'Hai mai provato manette o bondage?' },
  { id: 'h22', category: 'HOT', text: 'Hai mai venduto foto piccanti o pagato per vederle?' },
  { id: 'h23', category: 'HOT', text: 'Cosa vorresti provare a letto che non hai mai fatto?' },
  { id: 'h24', category: 'HOT', text: 'Hai mai fatto sesso in macchina?' },
  { id: 'h25', category: 'HOT', text: 'Sei mai stato in un privè o in un club per scambisti?' },
  { id: 'h26', category: 'HOT', text: 'Ti eccita di più guardare o essere guardato?' },
  { id: 'h27', category: 'HOT', text: 'Qual è stata la tua avventura più veloce, dal primo sguardo al letto?' },
  { id: 'h28', category: 'HOT', text: 'Hai mai fatto sesso con un collega?' },
  { id: 'h29', category: 'HOT', text: 'Hai mai fatto sesso con qualcuno nella stanza accanto?' },
  { id: 'h30', category: 'HOT', text: 'Hai mai fatto sesso in un posto dove potevate essere scoperti?' },
  { id: 'h31', category: 'HOT', text: 'Qual è il punto del corpo che ti fa impazzire quando viene toccato?' },
  { id: 'h32', category: 'HOT', text: 'Hai mai sognato di fare sesso con qualcuno di questo tavolo?' },
  { id: 'h33', category: 'HOT', text: 'Se dovessi scegliere, con chi del tavolo passeresti una notte di passione?' },
  { id: 'h34', category: 'HOT', text: 'Hai mai fatto sesso con qualcuno del tuo stesso sesso?' },
  { id: 'h35', category: 'HOT', text: 'Hai mai avuto rapporti con due persone diverse nello stesso giorno?' },
  { id: 'h36', category: 'HOT', text: 'Hai mai guardato un film porno insieme al partner?' },
  { id: 'h37', category: 'HOT', text: 'Qual è la fantasia che non hai mai confessato a un partner?' },
  { id: 'h38', category: 'HOT', text: 'Hai mai mandato un video piccante?' },
  { id: 'h39', category: 'HOT', text: 'Hai mai fatto sesso sul posto di lavoro?' },
  { id: 'h40', category: 'HOT', text: 'Qual è la tua posizione preferita?' }
];

/* Imprevisti: ogni tanto una domanda cambia le regole del turno (stesso riquadro giallo degli altri giochi).
   effect 'double' = se non risponde beve il doppio; 'free' = può saltare senza bere. */
const VERITA_TWISTS = [
  {
    id: 'tutti',
    icon: 'fa-users',
    title: 'Rispondono tutti!',
    rule: 'Questa domanda vale per tutto il tavolo: rispondete a turno, chi non vuole beve.'
  },
  {
    id: 'doppio',
    icon: 'fa-angles-up',
    title: 'Sorsi doppi!',
    rule: 'Se {p1} non risponde, beve il doppio.',
    effect: 'double'
  },
  {
    id: 'rimbalzo',
    icon: 'fa-arrow-right-arrow-left',
    title: 'Rimbalzo',
    rule: 'Dopo aver risposto, {p1} fa la stessa domanda a {p2}.'
  },
  {
    id: 'sottovoce',
    icon: 'fa-user-secret',
    title: 'Sottovoce',
    rule: '{p1} risponde solo all\'orecchio di {p2}. Se il tavolo vuole sapere, bevono tutti 1 sorso e {p2} lo rivela.'
  },
  {
    id: 'bugia',
    icon: 'fa-masks-theater',
    title: 'Verità o bugia?',
    rule: '{p1} può anche mentire: il tavolo vota se è vero. Chi sbaglia beve 1 sorso.'
  },
  {
    id: 'pass',
    icon: 'fa-ticket',
    title: 'Pass gratuito',
    rule: '{p1} può saltare questa domanda senza bere.',
    effect: 'free'
  }
];

const VERITA_MAX_CUSTOM_LENGTH = 160;

/* =========================================================================
   REGOLE PURE (si possono provare senza schermo)
========================================================================= */

/** Impostazioni di partenza: livelli 18+ spenti, imprevisti e crescendo accesi. */
function defaultVeritaSettings() {
  const categories = {};
  Object.values(VERITA_CATEGORIES).forEach(c => { categories[c.id] = c.defaultOn; });
  return { categories, twists: true, crescendo: true, adultConfirmed: false };
}

/** Unisce le impostazioni salvate a quelle di partenza (ignora valori strani). */
function sanitizeVeritaSettings(saved) {
  const base = defaultVeritaSettings();
  if (!saved || typeof saved !== 'object') return base;
  if (saved.categories && typeof saved.categories === 'object') {
    Object.keys(base.categories).forEach(id => {
      if (typeof saved.categories[id] === 'boolean') base.categories[id] = saved.categories[id];
    });
  }
  ['twists', 'crescendo', 'adultConfirmed'].forEach(k => {
    if (typeof saved[k] === 'boolean') base[k] = saved[k];
  });
  // Senza la conferma dei maggiorenni i livelli 18+ restano spenti
  if (!base.adultConfirmed) {
    Object.values(VERITA_CATEGORIES).forEach(c => { if (c.adult) base.categories[c.id] = false; });
  }
  return base;
}

/** Accendere questo livello richiede prima la conferma "siamo tutti maggiorenni"? */
function needsAdultConfirm(categoryId, settings) {
  const cat = VERITA_CATEGORIES[categoryId];
  return !!(cat && cat.adult && !(settings && settings.adultConfirmed));
}

/** Sorsi da bere se non si risponde (l'imprevisto "Sorsi doppi" li raddoppia, "Pass" li azzera). */
function refusalSips(categoryId, twistId) {
  const cat = VERITA_CATEGORIES[categoryId] || VERITA_CATEGORIES.ROMPIGHIACCIO;
  const twist = findVeritaTwist(twistId);
  if (twist && twist.effect === 'free') return 0;
  return twist && twist.effect === 'double' ? cat.sips * 2 : cat.sips;
}

/** Sistema una domanda scritta a mano: spazi, maiuscola iniziale, punteggiatura finale. '' se vuota. */
function normalizeVeritaQuestion(raw) {
  let text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, VERITA_MAX_CUSTOM_LENGTH);
  if (!text) return '';
  text = text.charAt(0).toUpperCase() + text.slice(1);
  text = text.replace(/[\s,;:]+$/, '');
  if (!/[?.!…]$/.test(text)) text += '?';
  return text;
}

/** Domande scritte da voi → domande del gioco (livello "Le vostre"). */
function customToVerita(customList) {
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

function allVeritaQuestions(customList) {
  return VERITA_QUESTIONS.concat(customToVerita(customList));
}

function countVeritaByCategory(questions) {
  const counts = {};
  Object.keys(VERITA_CATEGORIES).forEach(id => { counts[id] = 0; });
  questions.forEach(q => { if (counts[q.category] !== undefined) counts[q.category]++; });
  return counts;
}

/**
 * Quante domande dura ogni tappa del crescendo: 2-3 a testa (2,5 in media), almeno 6.
 * Con 2 giocatori 6, con 4 giocatori 10, con 6 giocatori 15.
 */
function crescendoStageSize(playersCount) {
  const n = Math.max(2, Math.floor(Number(playersCount) || 2));
  return Math.min(40, Math.max(6, Math.round(n * 2.5)));
}

/** Parte di ogni tappa (dalla seconda in poi) fatta di domande del livello appena passato: il "mix". */
const CRESCENDO_MIX = 0.3;

/**
 * Ordine delle domande dei livelli accesi (solo gli id).
 * Senza crescendo: tutto mescolato a caso.
 * Con il crescendo:
 *   - la serata sale a tappe: una tappa per livello acceso, lunga 2-3 domande a testa (crescendoStageSize);
 *   - la prima tappa ha solo domande del livello più leggero; nelle altre circa 7 domande su 10 sono
 *     del livello della tappa e 3 di quello prima (CRESCENDO_MIX), in ordine sparso;
 *   - finita la salita, tutte le domande rimaste sono mescolate, con i livelli più spinti un po' più frequenti.
 * options.players = quanti giocatori; options.offset = domande già fatte (per continuare la salita
 * da dove si era quando si cambiano i livelli a partita in corso; Infinity = salita già finita).
 */
function buildVeritaOrder(questions, categoriesOn, crescendo, random, options) {
  const rnd = typeof random === 'function' ? random : Math.random;
  const opts = options || {};
  const pool = questions.filter(q => categoriesOn[q.category] && VERITA_CATEGORIES[q.category]);
  if (!crescendo) return shuffleArray(pool.map(q => q.id), rnd);

  const levelOf = q => VERITA_CATEGORIES[q.category].level;
  const levels = [...new Set(pool.map(levelOf))].sort((a, b) => a - b);
  // Un mazzetto mescolato per ogni livello acceso (stesso livello = stesso mazzetto, anche "Le vostre")
  const groups = levels.map(lv => shuffleArray(pool.filter(q => levelOf(q) === lv).map(q => q.id), rnd));

  const stageSize = crescendoStageSize(opts.players);
  const offset = Math.max(0, Number(opts.offset) || 0);
  const order = [];

  // Prende dal livello voluto; se è finito, dal livello della tappa, poi da quelli sotto, poi da quelli sopra
  const takeFrom = (wanted, target) => {
    const tries = [wanted, target];
    for (let r = target - 1; r >= 0; r--) tries.push(r);
    for (let r = target + 1; r < groups.length; r++) tries.push(r);
    for (const r of tries) {
      if (groups[r] && groups[r].length > 0) return groups[r].pop();
    }
    return null;
  };

  // Ogni tappa: quali livelli escono e in che ordine (le prime "skip" posizioni sono già state giocate)
  for (let target = Math.floor(offset / stageSize); target < levels.length; target++) {
    const mix = target > 0 ? Math.round(stageSize * CRESCENDO_MIX) : 0;
    const wanted = shuffleArray(
      Array.from({ length: stageSize }, (_, i) => (i < mix ? target - 1 : target)),
      rnd
    );
    const skip = Math.max(0, offset - target * stageSize);
    for (const w of wanted.slice(skip)) {
      const id = takeFrom(w, target);
      if (id === null) break;
      order.push(id);
    }
  }

  // Dopo la salita: tutto mescolato, i livelli più spinti escono un po' prima (sorteggio pesato)
  const rest = [];
  groups.forEach((g, rank) => g.forEach(id => rest.push({ id, key: Math.pow(rnd(), 1 / (1 + rank)) })));
  rest.sort((a, b) => b.key - a.key);
  return order.concat(rest.map(r => r.id));
}

function findVeritaTwist(id) {
  return VERITA_TWISTS.find(t => t.id === id) || null;
}

/**
 * Imprevisto per la prossima domanda (o null): mai due di fila, stessa probabilità degli altri giochi.
 * Se la domanda nomina già {p2}, niente imprevisti che coinvolgono {p2} (sarebbe la stessa persona due volte).
 */
function pickVeritaTwist(enabled, previousTwistId, questionText, random) {
  const mentionsP2 = String(questionText || '').includes('{p2}');
  return pickFromTwists(VERITA_TWISTS, enabled, previousTwistId, random,
    t => !(mentionsP2 && t.rule.includes('{p2}')));
}

/** Conta di chi ha risposto e chi ha bevuto. kind: 'answer' | 'drink' | 'pass'. Restituisce un oggetto nuovo. */
function recordVeritaTurn(stats, playerId, kind) {
  const next = {};
  Object.keys(stats || {}).forEach(id => { next[id] = { ...stats[id] }; });
  const s = next[playerId] || { answered: 0, drunk: 0, passed: 0 };
  if (kind === 'answer') s.answered += 1;
  else if (kind === 'drink') s.drunk += 1;
  else if (kind === 'pass') s.passed += 1;
  next[playerId] = s;
  return next;
}

/**
 * Classifica della serata: giocatori ordinati dal più sincero (più risposte, meno bevute),
 * più i titoli "Il più sincero" e "Il più misterioso" (chi ha bevuto di più pur di non rispondere).
 */
function veritaLeaderboard(players, stats) {
  const rows = (players || []).map(p => {
    const s = (stats && stats[p.id]) || {};
    return { id: p.id, name: p.name, answered: s.answered || 0, drunk: s.drunk || 0, passed: s.passed || 0 };
  });
  rows.sort((a, b) => (b.answered - a.answered) || (a.drunk - b.drunk) || a.name.localeCompare(b.name, 'it'));
  const sincero = rows.length && rows[0].answered > 0 ? rows[0] : null;
  const byDrunk = [...rows].sort((a, b) => (b.drunk - a.drunk) || (a.answered - b.answered) || a.name.localeCompare(b.name, 'it'));
  const misterioso = byDrunk.length && byDrunk[0].drunk > 0 ? byDrunk[0] : null;
  return { rows, sincero, misterioso };
}
