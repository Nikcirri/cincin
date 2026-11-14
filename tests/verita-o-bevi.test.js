// Test di Verità o Bevi (public/verita-o-bevi/questions.js). Si lanciano con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './load.js';

const V = loadScripts(['common.js', 'verita-o-bevi/questions.js'], [
  'VERITA_CATEGORIES', 'VERITA_QUESTIONS', 'VERITA_TWISTS', 'defaultVeritaSettings', 'sanitizeVeritaSettings',
  'needsAdultConfirm', 'refusalSips', 'normalizeVeritaQuestion', 'customToVerita', 'allVeritaQuestions',
  'countVeritaByCategory', 'buildVeritaOrder', 'findVeritaTwist', 'pickVeritaTwist', 'recordVeritaTurn',
  'veritaLeaderboard', 'crescendoStageSize'
]);

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const LEVELS = ['ROMPIGHIACCIO', 'SERATA', 'PERSONALI', 'SCOMODE', 'PICCANTI', 'HOT'];

test('240 domande, 40 per livello, id e testi unici', () => {
  assert.equal(V.VERITA_QUESTIONS.length, 240);
  assert.equal(new Set(V.VERITA_QUESTIONS.map(q => q.id)).size, 240);
  assert.equal(new Set(V.VERITA_QUESTIONS.map(q => q.text.toLowerCase())).size, 240);
  const counts = V.countVeritaByCategory(V.VERITA_QUESTIONS);
  for (const id of LEVELS) assert.equal(counts[id], 40, id);
  assert.equal(counts.MIE, 0);
});

test('ogni domanda: livello vero, lettera giusta, punteggiatura, solo il segnaposto {p2}', () => {
  const letters = { ROMPIGHIACCIO: 'r', SERATA: 's', PERSONALI: 'd', SCOMODE: 'c', PICCANTI: 'p', HOT: 'h' };
  for (const q of V.VERITA_QUESTIONS) {
    assert.ok(LEVELS.includes(q.category), `${q.id}: livello`);
    assert.equal(q.id[0], letters[q.category], `${q.id}: lettera del livello`);
    assert.match(q.text, /[?.!]$/, `${q.id}: punteggiatura finale`);
    assert.ok(q.text.length <= 120, `${q.id}: troppo lunga per lo schermo`);
    for (const tag of q.text.match(/\{[^}]*\}/g) || []) assert.equal(tag, '{p2}', `${q.id}: segnaposto ${tag}`);
  }
});

test('livelli: dal più leggero al più spinto, sorsi crescenti, 18+ spenti all\'inizio', () => {
  const lv = LEVELS.map(id => V.VERITA_CATEGORIES[id]);
  for (let i = 1; i < lv.length; i++) {
    assert.ok(lv[i].level > lv[i - 1].level, `${lv[i].id} dopo ${lv[i - 1].id}`);
    assert.ok(lv[i].sips >= lv[i - 1].sips, `${lv[i].id}: sorsi`);
  }
  for (const c of Object.values(V.VERITA_CATEGORIES)) {
    for (const f of ['name', 'emoji', 'description', 'color', 'glow', 'bgSoft', 'badgeClass']) assert.ok(c[f], `${c.id}.${f}`);
    assert.equal(c.defaultOn, !c.adult, `${c.id}: acceso all'inizio solo se non è 18+`);
  }
  assert.ok(V.VERITA_CATEGORIES.PICCANTI.adult && V.VERITA_CATEGORIES.HOT.adult);
});

test('impostazioni: niente 18+ senza conferma dei maggiorenni', () => {
  const d = V.defaultVeritaSettings();
  assert.equal(d.adultConfirmed, false);
  assert.equal(d.twists, true);
  assert.equal(d.crescendo, true);
  const noConfirm = V.sanitizeVeritaSettings({ categories: { HOT: true, PICCANTI: true, SERATA: false } });
  assert.equal(noConfirm.categories.HOT, false, 'hot spento senza conferma');
  assert.equal(noConfirm.categories.SERATA, false);
  const ok = V.sanitizeVeritaSettings({ categories: { HOT: true }, adultConfirmed: true, twists: false });
  assert.equal(ok.categories.HOT, true);
  assert.equal(ok.twists, false);
  assert.ok(V.needsAdultConfirm('HOT', d));
  assert.ok(!V.needsAdultConfirm('HOT', ok));
  assert.ok(!V.needsAdultConfirm('SERATA', d));
  assert.deepEqual(V.sanitizeVeritaSettings('rotto'), V.defaultVeritaSettings());
});

test('sorsi se non rispondi: per livello, doppi o zero con gli imprevisti', () => {
  assert.equal(V.refusalSips('ROMPIGHIACCIO', null), 1);
  assert.equal(V.refusalSips('HOT', null), 3);
  assert.equal(V.refusalSips('PERSONALI', 'doppio'), 4);
  assert.equal(V.refusalSips('HOT', 'pass'), 0);
  assert.equal(V.refusalSips('INVENTATA', null), 1);
});

test('domande scritte a mano: sistemate e nel livello "Le vostre"', () => {
  assert.equal(V.normalizeVeritaQuestion('  qual è il tuo   segreto  '), 'Qual è il tuo segreto?');
  assert.equal(V.normalizeVeritaQuestion('Racconta un aneddoto.'), 'Racconta un aneddoto.');
  assert.equal(V.normalizeVeritaQuestion('ciao,'), 'Ciao?');
  assert.equal(V.normalizeVeritaQuestion('   '), '');
  assert.ok(V.normalizeVeritaQuestion('x'.repeat(400)).length <= 161);
  const qs = V.customToVerita([{ id: 'v_1', text: 'Domanda?' }, { id: 'v_1', text: 'doppione' }, { id: 'v_2', text: '' }, null]);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].category, 'MIE');
  assert.equal(V.allVeritaQuestions([{ id: 'v_1', text: 'Domanda?' }]).length, 241);
});

const ALL_ON = { ROMPIGHIACCIO: true, SERATA: true, PERSONALI: true, SCOMODE: true, PICCANTI: true, HOT: true, MIE: true };
const ALL = V.allVeritaQuestions([]);
const BY_ID = new Map(ALL.map(q => [q.id, q]));
const levelOf = id => V.VERITA_CATEGORIES[BY_ID.get(id).category].level;

test('ordine senza crescendo: solo livelli accesi, ognuna una volta', () => {
  const some = V.buildVeritaOrder(ALL, { SERATA: true, HOT: true }, false, seeded(9));
  assert.equal(some.length, 80);
  assert.equal(new Set(some).size, 80);
  for (const id of some) assert.ok(['SERATA', 'HOT'].includes(BY_ID.get(id).category));
  assert.equal(V.buildVeritaOrder(ALL, {}, true, seeded(1)).length, 0);
  assert.equal(V.buildVeritaOrder(ALL, {}, false, seeded(1)).length, 0);
});

test('crescendo: tappe di 2-3 domande a testa', () => {
  assert.equal(V.crescendoStageSize(2), 6);
  assert.equal(V.crescendoStageSize(3), 8);
  assert.equal(V.crescendoStageSize(4), 10);
  assert.equal(V.crescendoStageSize(6), 15);
  assert.equal(V.crescendoStageSize(8), 20);
  assert.equal(V.crescendoStageSize(undefined), 6);
  for (let n = 2; n <= 12; n++) {
    const per = V.crescendoStageSize(n) / n;
    assert.ok(per >= 2 && per <= 3, `${n} giocatori: ${per} domande a testa`);
  }
});

test('crescendo: prima tappa leggera, poi si sale a ogni tappa con un po\' di mix', () => {
  for (const seed of [3, 7, 11, 42, 99]) {
    const order = V.buildVeritaOrder(ALL, ALL_ON, true, seeded(seed), { players: 4 });
    assert.equal(order.length, 240, 'tutte le domande');
    assert.equal(new Set(order).size, 240, 'ognuna una volta');
    const stage = i => order.slice(i * 10, i * 10 + 10).map(levelOf);
    assert.ok(stage(0).every(lv => lv === 1), `seed ${seed}: le prime 2-3 a testa sono tutte Rompighiaccio`);
    for (let i = 1; i < 6; i++) {
      const lv = stage(i);
      assert.ok(lv.every(l => l === i + 1 || l === i), `seed ${seed}, tappa ${i + 1}: solo il livello della tappa e quello prima`);
      assert.ok(lv.filter(l => l === i + 1).length >= 5, `seed ${seed}, tappa ${i + 1}: soprattutto il livello della tappa`);
    }
    // Il mix c'è davvero: in ogni tappa dalla seconda in poi 3 domande su 10 sono del livello prima, in ordine sparso
    for (let i = 1; i < 6; i++) assert.equal(stage(i).filter(l => l === i).length, 3, `seed ${seed}, tappa ${i + 1}: mix`);
    assert.ok([1, 2, 3, 4, 5].some(i => stage(i)[9] === i || stage(i)[0] === i + 1), `seed ${seed}: mix in ordine sparso`);
    // Alle scomode e alle hot si arriva in fretta, non dopo 200 domande
    assert.ok(order.slice(0, 40).some(id => levelOf(id) === 4), `seed ${seed}: Scomode entro 40 domande`);
    assert.ok(order.slice(0, 60).some(id => levelOf(id) === 6), `seed ${seed}: Hot entro 60 domande`);
    // Dopo la salita: tutto mescolato, i livelli spinti un po' più frequenti
    const after = order.slice(60, 120).map(levelOf);
    assert.ok(new Set(after).size >= 5, `seed ${seed}: dopo la salita i livelli sono mescolati`);
    assert.ok(after.filter(l => l >= 5).length > after.filter(l => l === 1).length, `seed ${seed}: più domande spinte che leggere`);
  }
});

test('crescendo: la lunghezza delle tappe dipende dai giocatori', () => {
  const two = V.buildVeritaOrder(ALL, ALL_ON, true, seeded(5), { players: 2 });
  assert.ok(two.slice(0, 6).every(id => levelOf(id) === 1), '2 giocatori: 6 domande leggere');
  assert.ok(two.slice(6, 12).every(id => [1, 2].includes(levelOf(id))), '2 giocatori: poi Serata alcolica');
  assert.ok(two.slice(0, 36).some(id => levelOf(id) === 6), '2 giocatori: Hot entro 36 domande');
  const six = V.buildVeritaOrder(ALL, ALL_ON, true, seeded(5), { players: 6 });
  assert.ok(six.slice(0, 15).every(id => levelOf(id) === 1), '6 giocatori: 15 domande leggere');
});

test('crescendo: con pochi livelli accesi sale tra quelli, e riprende da dove si era', () => {
  const order = V.buildVeritaOrder(ALL, { SERATA: true, SCOMODE: true }, true, seeded(8), { players: 3 });
  assert.equal(order.length, 80);
  assert.ok(order.slice(0, 8).every(id => levelOf(id) === 2), 'si parte dal più leggero acceso');
  assert.ok(order.slice(8, 16).every(id => [2, 4].includes(levelOf(id))), 'poi il successivo acceso');
  // Ripresa a partita in corso: già fatte 25 domande con 4 giocatori → si è alla tappa 3 (Personali)
  const resumed = V.buildVeritaOrder(ALL, ALL_ON, true, seeded(4), { players: 4, offset: 25 });
  assert.ok(resumed.slice(0, 5).every(id => [2, 3].includes(levelOf(id))), 'riprende dalla tappa giusta');
  assert.ok(resumed.slice(5, 15).every(id => [3, 4].includes(levelOf(id))), 'e continua a salire');
  // Secondo giro: salita già fatta, tutto mescolato
  const again = V.buildVeritaOrder(ALL, ALL_ON, true, seeded(4), { players: 4, offset: Infinity });
  assert.equal(again.length, 240);
  assert.ok(new Set(again.slice(0, 20).map(levelOf)).size >= 4, 'secondo giro già mescolato');
});

test('crescendo: se un livello finisce si prende dal più vicino, senza perdere domande', () => {
  const custom = [{ id: 'v_1', text: 'Una?' }, { id: 'v_2', text: 'Due?' }];
  const all = V.allVeritaQuestions(custom);
  const order = V.buildVeritaOrder(all, { MIE: true, HOT: true }, true, seeded(2), { players: 4 });
  assert.equal(order.length, 42);
  assert.equal(new Set(order).size, 42);
  assert.deepEqual([...order.slice(0, 2)].sort(), ['v_1', 'v_2'], 'prima le vostre (livello più leggero acceso)');
});

test('imprevisti: completi, mai due di fila, mai {p2} due volte', () => {
  assert.ok(V.VERITA_TWISTS.length >= 5);
  for (const t of V.VERITA_TWISTS) {
    for (const f of ['id', 'icon', 'title', 'rule']) assert.ok(t[f], `${t.id}.${f}`);
    assert.ok(!t.effect || ['double', 'free'].includes(t.effect), `${t.id}.effect`);
    for (const tag of t.rule.match(/\{[^}]*\}/g) || []) assert.ok(['{p1}', '{p2}'].includes(tag), `${t.id}: ${tag}`);
  }
  assert.equal(V.pickVeritaTwist(false, null, 'Domanda?', () => 0), null);
  assert.equal(V.pickVeritaTwist(true, 'doppio', 'Domanda?', () => 0), null);
  const rnd = seeded(5);
  for (let i = 0; i < 2000; i++) {
    const t = V.pickVeritaTwist(true, null, 'Cosa pensi davvero di {p2}?', rnd);
    if (t) assert.ok(!V.findVeritaTwist(t).rule.includes('{p2}'), `${t} su una domanda che nomina già {p2}`);
  }
});

test('conti della serata e classifica', () => {
  let stats = {};
  stats = V.recordVeritaTurn(stats, 'a', 'answer');
  stats = V.recordVeritaTurn(stats, 'a', 'answer');
  stats = V.recordVeritaTurn(stats, 'b', 'drink');
  stats = V.recordVeritaTurn(stats, 'b', 'drink');
  stats = V.recordVeritaTurn(stats, 'c', 'pass');
  const before = V.recordVeritaTurn(stats, 'c', 'answer');
  assert.equal(stats.c.answered, 0, 'il vecchio oggetto non cambia');
  assert.equal(before.c.answered, 1);
  const players = [{ id: 'a', name: 'Anna' }, { id: 'b', name: 'Bruno' }, { id: 'c', name: 'Carla' }, { id: 'd', name: 'Dario' }];
  const lb = V.veritaLeaderboard(players, stats);
  assert.equal(lb.sincero.name, 'Anna');
  assert.equal(lb.misterioso.name, 'Bruno');
  assert.deepEqual(lb.rows.map(r => r.name), ['Anna', 'Carla', 'Dario', 'Bruno']);
  const empty = V.veritaLeaderboard(players, {});
  assert.equal(empty.sincero, null);
  assert.equal(empty.misterioso, null);
});
