// Collegamento tra i giochi (file in public/) e le funzioni del telefono Android.
// I giochi usano window.CinCinApp se c'è; nel browser queste funzioni fanno il minimo indispensabile.
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

window.CinCinApp = {
  version: __APP_VERSION__,
  isNative,

  /** 'short' = tocco leggero (carta girata), 'long' = tempo scaduto. */
  async vibrate(kind) {
    if (!isNative) return;
    try {
      if (kind === 'long') {
        await Haptics.vibrate({ duration: 600 });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch {
      // La vibrazione è un extra: se il telefono non la supporta si continua senza.
    }
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
  // Le versioni precedenti avevano lo schermo intero: le barre di sistema tornano sempre visibili.
  SystemBars.show().catch(() => {});

  // Tasto Indietro: prima chiude le finestre e le schermate interne del gioco;
  // se non c'è niente da chiudere, dai giochi torna al menu e dal menu l'app va in secondo piano.
  App.addListener('backButton', () => {
    const handled = typeof window.handleAndroidBack === 'function' && window.handleAndroidBack();
    if (handled) return;
    if (document.body.dataset.page === 'home') {
      window.CinCinApp.minimize();
    } else if (typeof window.goHome === 'function') {
      window.goHome();
    } else {
      window.location.href = './index.html';
    }
  });
}
