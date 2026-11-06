// Collegamento tra i giochi (file in public/) e le funzioni del telefono Android.
// I giochi usano window.CinCinApp se c'è; nel browser queste funzioni fanno il minimo indispensabile.
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();
// Lo schermo intero vale per tutta la sessione, anche passando da un gioco all'altro.
const BARS_KEY = 'cincin_bars_hidden';
let barsHidden = false;
try { barsHidden = sessionStorage.getItem(BARS_KEY) === '1'; } catch { barsHidden = false; }

window.CinCinApp = {
  version: __APP_VERSION__,
  isNative,

  /** 'short' = vibrazione breve, 'long' = tempo scaduto. */
  async vibrate(kind) {
    if (!isNative) return;
    try {
      await Haptics.vibrate({ duration: kind === 'long' ? 600 : 40 });
    } catch {
      // La vibrazione è un extra: se il telefono non la supporta si continua senza.
    }
  },

  /** Schermo intero nell'app: nasconde o mostra barra di stato e barra di navigazione. */
  async toggleFullscreen() {
    if (!isNative) return false;
    try {
      if (barsHidden) {
        await SystemBars.show();
      } else {
        await SystemBars.hide();
      }
      barsHidden = !barsHidden;
      try { sessionStorage.setItem(BARS_KEY, barsHidden ? '1' : '0'); } catch { /* niente */ }
    } catch {
      // Se il telefono non lo permette, si resta come prima.
    }
    return barsHidden;
  },

  isFullscreen() {
    return barsHidden;
  },

  /** Manda l'app in secondo piano (come il tasto Home): le partite restano salvate. */
  minimize() {
    if (!isNative) return;
    App.minimizeApp().catch(() => App.exitApp());
  },

  /** Apre un link fuori dall'app, nel browser del telefono (che scarica l'APK). */
  openExternal(url) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
  },
};

if (isNative) {
  SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => {});
  if (barsHidden) SystemBars.hide().catch(() => {});

  // Tasto Indietro: prima chiude le finestre e le schermate interne del gioco;
  // se non c'è niente da chiudere, dai giochi torna al menu e dal menu l'app va in secondo piano.
  App.addListener('backButton', () => {
    const handled = typeof window.handleAndroidBack === 'function' && window.handleAndroidBack();
    if (handled) return;
    if (document.body.dataset.page === 'home') {
      window.CinCinApp.minimize();
    } else {
      window.location.href = './index.html';
    }
  });
}
