// Test delle funzioni comuni (public/common.js). Si lanciano con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadScripts } from './load.js';

const C = loadScripts(['common.js'], [
  'parseVersion', 'isNewerVersion', 'parseRelease', 'shouldAutoCheck', 'shuffleArray',
  'escapeHtml', 'cleanPlayerNames', 'makeId', 'UPDATE_API_URL', 'UPDATE_PAGE_URL', 'UPDATE_APK_PREFIX',
  'isAllowedApkUrl', 'pickApkAsset', 'releaseNotes', 'sanitizeUpdateState', 'cachedRelease', 'shouldAnnounceUpdate'
]);

const APK = 'https://github.com/Nikcirri/cincin/releases/download/v1.4.0/CinCin-v1.4.0.apk';

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

test('release di GitHub: versione, file APK, pagina e novità', () => {
  const r = C.parseRelease({
    tag_name: 'v1.4.0',
    html_url: 'https://github.com/Nikcirri/cincin/releases/tag/v1.4.0',
    body: 'Introduzione.\n\n- **Uno**: primo\n  - dettaglio rientrato\n- `Due`\n\n### Come installare\n- non è una novità',
    assets: [{ name: 'note.txt', browser_download_url: 'x' }, { name: 'CinCin-v1.4.0.apk', browser_download_url: APK }]
  });
  assert.equal(r.version, '1.4.0');
  assert.equal(r.apkUrl, APK);
  assert.equal(r.pageUrl, 'https://github.com/Nikcirri/cincin/releases/tag/v1.4.0');
  assert.deepEqual([...r.notes], ['Uno: primo', 'Due']);
  assert.equal(C.parseRelease({ tag_name: 'nightly' }), null);
  assert.equal(C.parseRelease(null), null);
  assert.equal(C.parseRelease({ tag_name: 'v1.0.0' }).apkUrl, null);
  assert.deepEqual([...C.parseRelease({ tag_name: 'v1.0.0' }).notes], []);
  assert.equal(C.parseRelease({ tag_name: 'v1.0.0', html_url: 'https://cattivo.example/x' }).pageUrl, C.UPDATE_PAGE_URL, 'pagina di un altro sito ignorata');
  assert.match(C.UPDATE_API_URL, /repos\/Nikcirri\/cincin\/releases\/latest$/);
  assert.match(C.UPDATE_PAGE_URL, /Nikcirri\/cincin\/releases\/latest$/);
});

test('indirizzi dell\'APK: solo le Release di Nikcirri/cincin', () => {
  assert.equal(C.UPDATE_APK_PREFIX, 'https://github.com/Nikcirri/cincin/releases/download/');
  assert.ok(C.isAllowedApkUrl(APK));
  for (const bad of [
    null,
    '',
    'http://github.com/Nikcirri/cincin/releases/download/v1.4.0/CinCin-v1.4.0.apk',
    'https://github.com/Nikcirri/altro/releases/download/v1.4.0/CinCin-v1.4.0.apk',
    'https://github.com/Nikcirri/cincin/releases/download/v1.4.0/CinCin-v1.4.0.zip',
    'https://github.com/Nikcirri/cincin/releases/download/../../altro/x.apk',
    'https://github.com/Nikcirri/cincin/releases/download/v1/x.apk?y=.apk',
    'https://github.com/Nikcirri/cincin/releases/download/v1/x .apk',
    'https://github.com.cattivo.example/Nikcirri/cincin/releases/download/v1/x.apk'
  ]) {
    assert.ok(!C.isAllowedApkUrl(bad), `rifiutato: ${bad}`);
  }
});

test('scelta del file APK tra quelli della Release', () => {
  assert.equal(C.pickApkAsset([
    { name: 'altro.apk', browser_download_url: 'https://github.com/Nikcirri/cincin/releases/download/v1.4.0/altro.apk' },
    { name: 'CinCin-v1.4.0.apk', browser_download_url: APK }
  ]), APK, 'prima quello che si chiama CinCin-…');
  assert.equal(C.pickApkAsset([{ name: 'CinCin-v1.4.0.apk', browser_download_url: 'https://altrove.example/CinCin.apk' }]), null, 'mai da altri siti');
  assert.equal(C.pickApkAsset([{ name: 'note.txt', browser_download_url: APK.replace('.apk', '.txt') }]), null);
  assert.equal(C.pickApkAsset('rotto'), null);
});

test('novità: solo l\'elenco principale, al massimo 6, testi lunghi accorciati', () => {
  const body = Array.from({ length: 9 }, (_, i) => `- Novità ${i + 1}`).join('\n');
  assert.equal(C.releaseNotes(body).length, 6);
  assert.equal(C.releaseNotes(body, 3).length, 3);
  const long = C.releaseNotes(`- ${'parola '.repeat(40)}`)[0];
  assert.ok(long.length <= 110 && long.endsWith('…'));
  assert.deepEqual([...C.releaseNotes('niente elenco')], []);
  assert.deepEqual([...C.releaseNotes('- Uno\r\n- Due\r\n')], ['Uno', 'Due'], 'a capo di Windows');
});

test('controllo automatico al massimo ogni 10 minuti', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  assert.ok(C.shouldAutoCheck(null, now));
  assert.ok(C.shouldAutoCheck('rotto', now));
  assert.ok(!C.shouldAutoCheck('2026-11-09T11:55:00Z', now));
  assert.ok(C.shouldAutoCheck('2026-11-09T11:50:00Z', now));
  assert.ok(C.shouldAutoCheck('2026-11-08T12:00:00Z', now));
});

test('ultima versione già vista: usata senza chiedere di nuovo a GitHub', () => {
  const state = { lastCheck: '2026-11-09T11:55:00Z', latestVersion: '1.4.0', apkUrl: APK, pageUrl: 'https://github.com/Nikcirri/cincin/releases/tag/v1.4.0', notes: ['Uno', 2] };
  const r = C.cachedRelease(state, '1.2.0');
  assert.equal(r.version, '1.4.0');
  assert.equal(r.apkUrl, APK);
  assert.deepEqual([...r.notes], ['Uno']);
  assert.equal(C.cachedRelease(state, '1.4.0'), null, 'già installata');
  assert.equal(C.cachedRelease(null, '1.2.0'), null);
  assert.equal(C.cachedRelease({ ...state, apkUrl: 'https://altrove.example/x.apk' }, '1.2.0').apkUrl, null, 'APK di altri siti ignorato');
  const clean = C.sanitizeUpdateState({ latestVersion: 'rotta', pageUrl: 'https://altrove.example' });
  assert.equal(clean.latestVersion, null);
  assert.equal(clean.pageUrl, C.UPDATE_PAGE_URL);
});

test('messaggio "App aggiornata" solo al primo avvio dopo un aggiornamento', () => {
  assert.ok(C.shouldAnnounceUpdate('1.1.0', '1.2.0', true));
  assert.ok(!C.shouldAnnounceUpdate('1.2.0', '1.2.0', true), 'stessa versione');
  assert.ok(!C.shouldAnnounceUpdate('1.3.0', '1.2.0', true), 'versione più vecchia');
  assert.ok(C.shouldAnnounceUpdate(null, '1.2.0', true), 'dalla 1.1.0 (che non salvava la versione)');
  assert.ok(!C.shouldAnnounceUpdate(null, '1.2.0', false), 'prima installazione');
  assert.ok(!C.shouldAnnounceUpdate('1.1.0', '0.0.0-dev', true), 'versione di prova senza numero vero');
  assert.ok(!C.shouldAnnounceUpdate('1.1.0', 'rotta', true));
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
