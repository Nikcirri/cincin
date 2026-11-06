// Test delle funzioni comuni (public/common.js). Si lanciano con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './load.js';

const C = loadScripts(['common.js'], [
  'parseVersion', 'isNewerVersion', 'parseRelease', 'shouldAutoCheck', 'shuffleArray',
  'escapeHtml', 'cleanPlayerNames', 'makeId', 'UPDATE_API_URL', 'UPDATE_PAGE_URL'
]);

test('versioni: lettura e confronto', () => {
  assert.deepEqual([...C.parseVersion('v1.2.3')], [1, 2, 3]);
  assert.deepEqual([...C.parseVersion('10.0.1')], [10, 0, 1]);
  assert.equal(C.parseVersion('1.2'), null);
  assert.equal(C.parseVersion('ciao'), null);
  assert.ok(C.isNewerVersion('1.0.1', '1.0.0'));
  assert.ok(C.isNewerVersion('v2.0.0', '1.9.9'));
  assert.ok(C.isNewerVersion('1.10.0', '1.9.0'));
  assert.ok(!C.isNewerVersion('1.0.0', '1.0.0'));
  assert.ok(!C.isNewerVersion('0.9.0', '1.0.0'));
  assert.ok(!C.isNewerVersion('rotto', '1.0.0'));
});

test('release di GitHub: trova la versione e il file APK', () => {
  const r = C.parseRelease({
    tag_name: 'v1.4.0',
    html_url: 'https://github.com/Nikcirri/cincin/releases/tag/v1.4.0',
    assets: [{ name: 'note.txt', browser_download_url: 'x' }, { name: 'CinCin-v1.4.0.apk', browser_download_url: 'https://esempio/apk' }]
  });
  assert.equal(r.version, '1.4.0');
  assert.equal(r.apkUrl, 'https://esempio/apk');
  assert.equal(C.parseRelease({ tag_name: 'nightly' }), null);
  assert.equal(C.parseRelease(null), null);
  assert.equal(C.parseRelease({ tag_name: 'v1.0.0' }).apkUrl, null);
  assert.match(C.UPDATE_API_URL, /repos\/Nikcirri\/cincin\/releases\/latest$/);
  assert.match(C.UPDATE_PAGE_URL, /Nikcirri\/cincin\/releases\/latest$/);
});

test('controllo automatico al massimo una volta al giorno', () => {
  const now = new Date('2026-11-06T20:00:00Z');
  assert.ok(C.shouldAutoCheck(null, now));
  assert.ok(C.shouldAutoCheck('rotto', now));
  assert.ok(!C.shouldAutoCheck('2026-11-06T10:00:00Z', now));
  assert.ok(C.shouldAutoCheck('2026-11-05T19:00:00Z', now));
});

test('mescolare non perde e non duplica niente', () => {
  const arr = Array.from({ length: 50 }, (_, i) => i);
  const out = C.shuffleArray(arr);
  assert.equal(out.length, 50);
  assert.deepEqual([...out].sort((a, b) => a - b), arr);
  assert.deepEqual(arr, Array.from({ length: 50 }, (_, i) => i), 'l\'originale non cambia');
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  assert.notDeepEqual(C.shuffleArray(arr, rnd), arr);
});

test('nomi dei giocatori: spazi, doppioni e lunghezza', () => {
  assert.deepEqual([...C.cleanPlayerNames(['  Anna ', 'anna', 'Bruno', '', null, { name: 'Carla' }, 'Nome lunghissimo davvero troppo'])],
    ['Anna', 'Bruno', 'Carla', 'Nome lunghissimo d']);
  assert.deepEqual([...C.cleanPlayerNames('non è una lista')], []);
});

test('testo sicuro e id unici', () => {
  assert.equal(C.escapeHtml('<b>"Ciao" & \'tu\'</b>'), '&lt;b&gt;&quot;Ciao&quot; &amp; &#039;tu&#039;&lt;/b&gt;');
  assert.equal(C.escapeHtml(null), '');
  const ids = new Set(Array.from({ length: 200 }, () => C.makeId('p')));
  assert.equal(ids.size, 200);
});

test('impostazioni comuni: suoni e vibrazione accesi all\'inizio', () => {
  const S = loadScripts(['common.js'], ['sanitizeAppSettings']);
  assert.deepEqual({ ...S.sanitizeAppSettings(null) }, { sound: true, haptics: true });
  assert.deepEqual({ ...S.sanitizeAppSettings({ sound: false, haptics: 'no' }) }, { sound: false, haptics: true });
});

test('imprevisti comuni: mai due di fila, solo quelli permessi', () => {
  const T = loadScripts(['common.js'], ['pickFromTwists', 'TWIST_CHANCE']);
  const twists = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(T.pickFromTwists(twists, false, null, () => 0), null, 'spenti');
  assert.equal(T.pickFromTwists(twists, true, 'a', () => 0), null, 'mai due di fila');
  assert.equal(T.pickFromTwists(twists, true, null, () => 0.99), null, 'quasi sempre niente');
  assert.equal(T.pickFromTwists(twists, true, null, () => 0), 'a');
  assert.equal(T.pickFromTwists(twists, true, null, () => 0, t => t.id === 'c'), 'c', 'filtro');
  assert.equal(T.pickFromTwists(twists, true, null, () => 0, () => false), null, 'nessuno permesso');
  assert.ok(T.TWIST_CHANCE > 0 && T.TWIST_CHANCE < 0.5);
});
