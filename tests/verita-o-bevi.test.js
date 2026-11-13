// Test di Verità o Bevi (public/verita-o-bevi/questions.js). Si lanciano con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './load.js';

const V = loadScripts(['common.js', 'verita-o-bevi/questions.js'], [
  'VERITA_CATEGORIES', 'VERITA_QUESTIONS', 'VERITA_TWISTS', 'defaultVeritaSettings', 'sanitizeVeritaSettings',
  'needsAdultConfirm', 'refusalSips', 'normalizeVeritaQuestion', 'customToVerita', 'allVeritaQuestions',
  'countVeritaByCategory', 'buildVeritaOrder', 'findVeritaTwist', 'pickVeritaTwist', 'recordVeritaTurn',
  'veritaLeaderboard'
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

test('ordine delle domande: solo livelli accesi, ognuna una volta, crescendo dal leggero allo spinto', () => {
  const on = { ROMPIGHIACCIO: true, SERATA: true, PERSONALI: true, SCOMODE: true, PICCANTI: true, HOT: true, MIE: true };
  const all = V.allVeritaQuestions([]);
  const byId = new Map(all.map(q => [q.id, q]));
  const order = V.buildVeritaOrder(all, on, true, seeded(3));
  assert.equal(order.length, 240);
  assert.equal(new Set(order).size, 240);
  const avg = ids => ids.reduce((s, id) => s + V.VERITA_CATEGORIES[byId.get(id).category].level, 0) / ids.length;
  assert.ok(avg(order.slice(0, 40)) < 2.2, 'si parte leggeri');
  assert.ok(avg(order.slice(-40)) > 5, 'si finisce spinti');
  for (const id of order.slice(0, 15)) assert.ok(V.VERITA_CATEGORIES[byId.get(id).category].level <= 2, 'le prime domande non sono 18+');

  const some = V.buildVeritaOrder(all, { SERATA: true, HOT: true }, false, seeded(9));
  assert.equal(some.length, 80);
  for (const id of some) assert.ok(['SERATA', 'HOT'].includes(byId.get(id).category));
  assert.equal(V.buildVeritaOrder(all, {}, true, seeded(1)).length, 0);
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
