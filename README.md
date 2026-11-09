# Cin Cin

Giochi per bere in compagnia, in un'unica app Android: dal menu iniziale scegli il gioco, riempi i bicchieri e passa il telefono al tavolo. Funziona senza internet e tutti i dati restano sul telefono.

## I giochi

- **Hai Mai?** – il classico: si legge la domanda ad alta voce e chi l'ha fatto beve. 120 domande in 4 categorie (Tranquille, Festa, Imbarazzanti, Piccanti 18+), imprevisti a sorpresa (al contrario, sorsi doppi, racconta…) e le vostre domande personalizzate.
- **Neon Sips** – un mazzo di 70 carte con i nomi dei giocatori: catene a tempo, bersagli, duelli 1 contro 1, scudi, nuove regole, giuria e maledizioni, più gli imprevisti (giro al contrario, salta il turno, sorsi doppi…). Mazzo modificabile, carte personalizzate, imbucati a partita in corso.

Suoni e vibrazione sono uguali in tutti i giochi e si spengono dal menu (ℹ️).

Le partite si salvano da sole: se chiudi l'app, dal gioco tocchi **Riprendi** e ricominci da dov'eri.

## Installare l'app (Android)

1. Dal telefono apri https://github.com/Nikcirri/cincin/releases/latest
2. In fondo alla pagina, sotto "Assets", tocca il file `CinCin-vX.Y.Z.apk` per scaricarlo.
3. Apri il file scaricato (dalla notifica o dall'app File).
4. Se Android dice che l'installazione è bloccata, tocca **Impostazioni**, attiva **Consenti da questa origine** e torna indietro.
5. Tocca **Installa**. Se compare un avviso di Play Protect, tocca **Installa comunque**: succede con tutte le app che non arrivano dal Play Store.

Per condividerla con gli amici basta mandare lo stesso link.

## Aggiornare

Dalla versione 1.2.0 l'app si aggiorna da sola:

1. Quando esce una versione nuova, nel menu iniziale compare in alto l'avviso **Nuova versione** con le novità.
2. Tocca **Aggiorna**: l'app scarica la nuova versione (vedi la percentuale) e apre l'installazione di Android.
3. La prima volta Android chiede il permesso **Installa app sconosciute**: tocca **Apri impostazioni**, attiva **Consenti da questa origine** e torna indietro. L'aggiornamento riparte da solo.
4. Nella finestra di Android tocca **Aggiorna** e poi **Apri**. Giocatori, carte e domande restano.

Se tocchi **Dopo**, l'aggiornamento lo ritrovi nel menu alla voce **Aggiornamenti** (in fondo), che ha anche **Controlla aggiornamenti**, **Aggiorna dall'app** e **Scarica da GitHub** (apre la pagina delle Release nel browser).

Il file scaricato resta nella memoria temporanea dell'app, una sola copia sostituita a ogni aggiornamento: per liberare spazio basta **Svuota cache** nelle impostazioni dell'app di Android.

Chi ha la versione 1.1.0 o precedenti deve installare la 1.2.0 ancora una volta a mano dal link qui sopra.

## Per chi sviluppa

- Una pagina HTML per schermata principale: `index.html` (menu), `hai-mai.html`, `neon-sips.html`. Ogni gioco ha la sua cartella in `public/` con i dati (`questions.js`, `deck.js`) e la logica (`game.js`). `public/common.js` ha le funzioni comuni: memoria, avvisi, suoni (`playSound`), vibrazione, finestre (`openModal`/`closeModal`), passaggio tra pagine, imprevisti (`pickFromTwists`, `twistBoxHtml`) e aggiornamenti. `src/style.css` è lo stile comune (Tailwind 3, caratteri Outfit e Space Grotesk, icone Font Awesome, tutto incluso nell'app) con i pezzi uguali in tutti i giochi (`icon-btn`, `pill-btn`, `game-topbar`, `cta-main`, `sticky-cta`, `twist-box`…). `src/native.js` collega le funzioni del telefono (tasto Indietro, vibrazione).
- **Aggiungere un gioco:** crea `nome-gioco.html` (copia la struttura di `hai-mai.html`), mettine la logica in `public/nome-gioco/`, aggiungi la pagina in `vite.config.js` (`rollupOptions.input`) e una voce in `GAMES` dentro `public/home.js`. Il codice generato con Gemini che usa `cdn.tailwindcss.com` funziona così com'è: basta togliere i link ai CDN e includere `/src/main.js` e `common.js`.
- `npm run dev` avvia la versione web, `npm test` controlla domande, mazzo e regole, `npm run verify` fa test e build. `python3 tests/smoke.py` (dopo `npm run build`) gioca a tutti i giochi in Chrome.
- Quando su `main` cambia la versione in `package.json`, GitHub Actions costruisce l'APK firmato e pubblica la Release `vX.Y.Z` (`.github/workflows/release.yml`). A ogni push `.github/workflows/check.yml` fa test, build web e build Android di prova.
- Aggiornamenti dentro l'app: plugin Android `android/app/src/main/java/com/nikcirri/cincin/AppUpdaterPlugin.java` (registrato in `MainActivity.java`, collegato in `src/native.js` come `window.CinCinApp.updater`), avviso e voce **Aggiornamenti** in `public/home.js`, regole pure in `public/common.js` con i test. Le novità mostrate nell'avviso sono le prime righe della sezione del `CHANGELOG.md`, che GitHub Actions copia nella Release.
- Icona: sorgente in `resources/icon.svg`, file Android in `android/app/src/main/res` (vettoriali + PNG per i telefoni più vecchi).
- Regole di lavoro: [`CLAUDE.md`](CLAUDE.md). Novità di ogni versione: [`CHANGELOG.md`](CHANGELOG.md).
