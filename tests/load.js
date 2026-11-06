// Carica gli script classici di public/ (quelli che nell'app si usano con <script src>) per i test.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/** files = percorsi dentro public/, names = cosa restituire (funzioni e costanti globali). */
export function loadScripts(files, names) {
  const code = files.map(f => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8')).join('\n;\n');
  const ctx = vm.createContext({ console, Math, Date, JSON });
  vm.runInContext(`${code}\n;globalThis.__out = { ${names.join(', ')} };`, ctx);
  return ctx.__out;
}
