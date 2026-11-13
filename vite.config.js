import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // Percorsi relativi: l'app funziona dentro Android senza server e senza internet.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    emptyOutDir: true,
    // Una pagina HTML per ogni schermata principale: menu iniziale + un file per ogni gioco.
    rollupOptions: {
      input: {
        home: 'index.html',
        haiMai: 'hai-mai.html',
        neonSips: 'neon-sips.html',
        veritaOBevi: 'verita-o-bevi.html',
      },
    },
  },
});
