// Test di Hai Mai? (public/hai-mai/questions.js). Si lanciano con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './load.js';

const H = loadScripts(['common.js', 'hai-mai/questions.js'], [
  'HAI_MAI_CATEGORIES', 'HAI_MAI_QUESTIONS', 'HAI_MAI_TWISTS', 'defaultHaiMaiSettings', 'sanitizeHaiMaiSettings',
  'normalizeCustomQuestion', 'customToQuestions', 'allHaiMaiQuestions', 'countByCategory', 'buildHaiMaiOrder',
  'pickTwist', 'findTwist'
]);

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

test('120 domande, 30 per categoria, id e testi unici', () => {
  assert.equal(H.HAI_MAI_QUESTIONS.length, 120);
  const ids = new Set(H.HAI_MAI_QUESTIONS.map(q => q.id));
  assert.equal(ids.size, 120);
  const texts = new Set(H.HAI_MAI_QUESTIONS.map(q => q.text.toLowerCase()));
  assert.equal(texts.size, 120);
  const counts = H.countByCategory(H.HAI_MAI_QUESTIONS);
  assert.equal(counts.TRANQUILLE, 30);
  assert.equal(counts.FESTA, 30);
  assert.equal(counts.IMBARAZZANTI, 30);
  assert.equal(counts.PICCANTI, 30);
  assert.equal(counts.MIE, 0);
});

test('ogni domanda è una domanda "… mai …?" di una categoria vera', () => {
  for (const q of H.HAI_MAI_QUESTIONS) {
    assert.ok(H.HAI_MAI_CATEGORIES[q.category] && q.category !== 'MIE', `${q.id}: categoria`);
    assert.match(q.text, /^(Hai|Ti sei|Sei) mai /, `${q.id}: inizio`);
    assert.ok(q.text.endsWith('?'), `${q.id}: punto di domanda`);
    assert.equal(q.id[0], q.category[0].toLowerCase(), `${q.id}: lettera della categoria`);
  }
});

test('impostazioni: piccanti spente all\'inizio, valori strani ignorati', () => {
  const d = H.defaultHaiMaiSettings();
  assert.equal(d.categories.PICCANTI, false);
  assert.equal(d.categories.TRANQUILLE, true);
  assert.equal(d.twists, true);
  const s = H.sanitizeHaiMaiSettings({ categories: { PICCANTI: true, FESTA: 'sì', INVENTATA: true }, twists: false });
  assert.equal(s.categories.PICCANTI, true);
  assert.equal(s.categories.FESTA, true);
  assert.equal(s.categories.INVENTATA, undefined);
  assert.equal(s.twists, false);
  assert.deepEqual(H.sanitizeHaiMaiSettings('rotto'), H.defaultHaiMaiSettings());
});

test('domande scritte a mano: sistemate bene', () => {
  assert.equal(H.normalizeCustomQuestion('  hai mai   ballato   la macarena  '), 'Hai mai ballato la macarena?');
  assert.equal(H.normalizeCustomQuestion('Hai mai perso un aereo.'), 'Hai mai perso un aereo?');
  assert.equal(H.normalizeCustomQuestion('Hai mai urlato!!!'), 'Hai mai urlato?');
  assert.equal(H.normalizeCustomQuestion('Hai mai cantato?'), 'Hai mai cantato?');
  assert.equal(H.normalizeCustomQuestion('Hai mai '), '');
  assert.equal(H.normalizeCustomQuestion('hai mai?'), '');
  assert.equal(H.normalizeCustomQuestion(''), '');
  assert.ok(H.normalizeCustomQuestion('x'.repeat(500)).length <= 161);
});

test('le vostre domande entrano nella categoria "Le vostre" senza doppioni', () => {
  const custom = [{ id: 'q_1', text: 'Hai mai visto Roma?' }, { id: 'q_1', text: 'doppione' }, { id: 'q_2', text: '  ' }, null];
  const qs = H.customToQuestions(custom);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].category, 'MIE');
  assert.equal(H.allHaiMaiQuestions(custom).length, 121);
  assert.equal(H.countByCategory(H.allHaiMaiQuestions(custom)).MIE, 1);
});

test('il mazzo contiene solo le categorie accese, ognuna una volta', () => {
  const all = H.allHaiMaiQuestions([{ id: 'q_x', text: 'Hai mai provato?' }]);
  const on = { TRANQUILLE: true, FESTA: false, IMBARAZZANTI: false, PICCANTI: true, MIE: true };
  const order = H.buildHaiMaiOrder(all, on, seeded(7));
  assert.equal(order.length, 61);
  assert.equal(new Set(order).size, 61);
  const byId = new Map(all.map(q => [q.id, q]));
  for (const id of order) assert.ok(on[byId.get(id).category], id);
  assert.equal(H.buildHaiMaiOrder(all, {}, seeded(1)).length, 0);
});

test('imprevisti: mai due di fila, spenti = niente, esistono tutti', () => {
  assert.equal(H.pickTwist(false, null, () => 0), null);
  assert.equal(H.pickTwist(true, 'doppio', () => 0), null);
  assert.ok(H.findTwist(H.pickTwist(true, null, () => 0)));
  assert.equal(H.pickTwist(true, null, () => 0.99), null);
  const rnd = seeded(42);
  let prev = null;
  let count = 0;
  for (let i = 0; i < 2000; i++) {
    const t = H.pickTwist(true, prev, rnd);
    if (t) {
      assert.equal(prev, null, 'due imprevisti di fila');
      count++;
    }
    prev = t;
  }
  assert.ok(count > 150 && count < 450, `imprevisti: ${count} su 2000`);
  for (const t of H.HAI_MAI_TWISTS) {
    for (const f of ['id', 'icon', 'title', 'rule', 'sips']) assert.ok(t[f], `${t.id}.${f}`);
  }
});
