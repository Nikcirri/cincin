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

const T = loadScripts(['common.js', 'neon-sips/deck.js'], ['NEON_TWISTS', 'findNeonTwist', 'pickNeonTwist', 'nextTurnIndex', 'CATEGORIES']);

test('imprevisti di Neon Sips: campi completi e segnaposto validi', () => {
  const ids = new Set(T.NEON_TWISTS.map(t => t.id));
  assert.equal(ids.size, T.NEON_TWISTS.length);
  assert.ok(T.NEON_TWISTS.length >= 5);
  for (const t of T.NEON_TWISTS) {
    for (const f of ['id', 'icon', 'title', 'rule']) assert.ok(t[f], `${t.id}.${f}`);
    assert.ok(Array.isArray(t.exclude), `${t.id}.exclude`);
    for (const c of t.exclude) assert.ok(T.CATEGORIES[c], `${t.id}: categoria ${c}`);
    assert.ok(t.minPlayers >= 2, `${t.id}.minPlayers`);
    assert.ok(!t.effect || ['reverse', 'skip', 'shield'].includes(t.effect), `${t.id}.effect`);
    for (const tag of t.rule.match(/\{[^}]*\}/g) || []) assert.ok(['{p1}', '{p2}', '{next}'].includes(tag), `${t.id}: ${tag}`);
  }
  assert.ok(T.findNeonTwist('salta'));
  assert.equal(T.findNeonTwist('inventato'), null);
});

test('imprevisti di Neon Sips: rispettano carta e numero di giocatori', () => {
  for (let i = 0; i < 300; i++) {
    let n = i;
    const rnd = () => { n = (n * 16807 + 11) % 2147483647; return n / 2147483647; };
    const onShield = T.pickNeonTwist(true, null, 'SCUDO', 6, rnd);
    if (onShield) assert.ok(!T.findNeonTwist(onShield).exclude.includes('SCUDO'), `${onShield} su una carta Scudo`);
    const withTwo = T.pickNeonTwist(true, null, 'DUELLO', 2, rnd);
    if (withTwo) assert.ok(T.findNeonTwist(withTwo).minPlayers <= 2, `${withTwo} con 2 giocatori`);
  }
  assert.equal(T.pickNeonTwist(true, 'doppio', 'DUELLO', 5, () => 0), null, 'mai due di fila');
  assert.equal(T.pickNeonTwist(false, null, 'DUELLO', 5, () => 0), null, 'spenti');
});

test('turni: avanti, al contrario e giro completo', () => {
  assert.equal(T.nextTurnIndex(0, 1, 4), 1);
  assert.equal(T.nextTurnIndex(3, 1, 4), 0);
  assert.equal(T.nextTurnIndex(0, -1, 4), 3);
  assert.equal(T.nextTurnIndex(2, -1, 4), 1);
  assert.equal(T.nextTurnIndex(0, 1, 0), 0);
});
