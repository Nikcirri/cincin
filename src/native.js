// Collegamento tra i giochi (file in public/) e le funzioni del telefono Android.
// I giochi usano window.CinCinApp se c'è; nel browser queste funzioni fanno il minimo indispensabile.
import { Capacitor, SystemBars, SystemBarsStyle, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

// Plugin Android dell'app (android/app/src/main/java/com/nikcirri/cincin/AppUpdaterPlugin.java):
// scarica l'APK della nuova versione nella cache dell'app e apre l'installazione di Android.
const AppUpdater = registerPlugin('AppUpdater');

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

  /** Aggiornamento dentro l'app (solo nell'app Android). */
  updater: {
    /** Android permette a Cin Cin di installare aggiornamenti? ("Installa app sconosciute") */
    async canInstall() {
      if (!isNative) return false;
      return (await AppUpdater.canInstall()).allowed === true;
    },

    /** Apre l'impostazione "Installa app sconosciute" proprio di Cin Cin. */
    async openInstallSettings() {
      await AppUpdater.openInstallSettings();
    },

    /** Scarica l'APK (onProgress riceve la percentuale) e apre l'installazione di Android. */
    async downloadAndInstall(url, onProgress) {
      const handle = await AppUpdater.addListener('progress', (e) => {
        if (typeof onProgress === 'function') onProgress(Number(e.percent) || 0);
      });
      try {
        await AppUpdater.downloadAndInstall({ url });
      } finally {
        await handle.remove();
      }
    },
  },

  /** Apre un link fuori dall'app, nel browser del telefono. */
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

  // Ritorno nell'app (es. dalle impostazioni di Android): le pagine lo ascoltano con l'evento "cincin:resume".
  App.addListener('resume', () => {
    window.dispatchEvent(new Event('cincin:resume'));
  });

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
