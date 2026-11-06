// Test del mazzo di Neon Sips (public/neon-sips/deck.js). Si lanciano con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './load.js';

const N = loadScripts(['common.js', 'neon-sips/deck.js'], ['CATEGORIES', 'MASTER_DECK']);

test('70 carte con id unici e categorie esistenti', () => {
  assert.equal(N.MASTER_DECK.length, 70);
  const ids = new Set(N.MASTER_DECK.map(c => c.id));
  assert.equal(ids.size, 70);
  for (const c of N.MASTER_DECK) {
    assert.ok(N.CATEGORIES[c.category], `carta ${c.id}: categoria ${c.category}`);
    for (const f of ['title', 'text', 'sips']) assert.ok(typeof c[f] === 'string' && c[f].trim(), `carta ${c.id}.${f}`);
  }
});

test('le 7 categorie hanno il numero di carte giusto e tutti i colori', () => {
  const counts = {};
  N.MASTER_DECK.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
  assert.deepEqual(counts, { CATENA: 12, BERSAGLIO: 12, DUELLO: 12, SCUDO: 6, REGOLA: 10, GIURIA: 10, MALEDIZIONE: 8 });
  for (const cat of Object.values(N.CATEGORIES)) {
    for (const f of ['name', 'color', 'glow', 'bgSoft', 'icon', 'badgeClass']) assert.ok(cat[f], `${cat.id}.${f}`);
  }
});

test('nei testi ci sono solo i segnaposto {p1} e {p2}', () => {
  for (const c of N.MASTER_DECK) {
    const tags = `${c.text} ${c.ruleTitle || ''}`.match(/\{[^}]*\}/g) || [];
    for (const t of tags) assert.ok(t === '{p1}' || t === '{p2}', `carta ${c.id}: segnaposto ${t}`);
  }
});

test('i duelli nominano due giocatori, scudi e maledizioni almeno chi li riceve', () => {
  for (const c of N.MASTER_DECK) {
    if (c.category === 'DUELLO') {
      assert.ok(c.text.includes('{p1}') && c.text.includes('{p2}'), `carta ${c.id}`);
    }
    if (c.category === 'SCUDO' || c.category === 'MALEDIZIONE') assert.ok(c.text.includes('{p1}'), `carta ${c.id}`);
  }
});

test('regole e maledizioni hanno testo breve e durata', () => {
  for (const c of N.MASTER_DECK.filter(c => c.category === 'REGOLA' || c.category === 'MALEDIZIONE')) {
    assert.ok(c.ruleTitle && c.ruleTitle.length <= 45, `carta ${c.id}: ruleTitle`);
    assert.ok(Number.isInteger(c.duration) && c.duration >= 1 && c.duration <= 30, `carta ${c.id}: durata`);
  }
});
