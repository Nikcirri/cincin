package com.nikcirri.cincin;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Aggiornamento dentro l'app: scarica l'APK della nuova versione da GitHub e apre l'installazione di Android.
 *
 * Sicurezza:
 * - accetta solo indirizzi delle Release di Nikcirri/cincin che finiscono con .apk;
 * - segue i reindirizzamenti di GitHub solo se restano su https;
 * - controlla che il file sia completo (dimensione attesa, archivio APK intero) e che sia proprio Cin Cin;
 * - il file sta nella cache dell'app (una sola copia, sostituita ogni volta): "Svuota cache" lo cancella.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String ALLOWED_PREFIX = "https://github.com/Nikcirri/cincin/releases/download/";
    private static final String UPDATES_DIR = "updates";
    private static final String APK_NAME = "CinCin-aggiornamento.apk";
    private static final long MIN_APK_BYTES = 1_000_000L;
    private static final int MAX_REDIRECTS = 5;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean downloading = new AtomicBoolean(false);

    /** Android permette a questa app di installare aggiornamenti? (Impostazione "Installa app sconosciute"). */
    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject ret = new JSObject();
        boolean allowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.O
            || getContext().getPackageManager().canRequestPackageInstalls();
        ret.put("allowed", allowed);
        call.resolve(ret);
    }

    /** Apre l'impostazione "Installa app sconosciute" proprio di questa app. */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
                );
            } else {
                intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Non riesco ad aprire le impostazioni: " + e.getMessage());
        }
    }

    /** Scarica l'APK (avvisando l'avanzamento con l'evento "progress") e apre l'installazione di Android. */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (!isAllowedUrl(url)) {
            call.reject("Indirizzo dell'aggiornamento non valido");
            return;
        }
        if (!downloading.compareAndSet(false, true)) {
            call.reject("Sto già scaricando l'aggiornamento");
            return;
        }
        executor.execute(() -> {
            try {
                File apk = download(url);
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(uri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                new Handler(Looper.getMainLooper()).post(() -> {
                    try {
                        getContext().startActivity(intent);
                        call.resolve();
                    } catch (Exception e) {
                        call.reject("Non riesco ad aprire l'installazione: " + e.getMessage());
                    }
                });
            } catch (Exception e) {
                call.reject("Download non riuscito: " + e.getMessage());
            } finally {
                downloading.set(false);
            }
        });
    }

    /** Solo file .apk delle Release di questo repository, senza trucchi nel percorso. */
    static boolean isAllowedUrl(String url) {
        return url != null
            && url.startsWith(ALLOWED_PREFIX)
            && url.endsWith(".apk")
            && !url.contains("..")
            && !url.contains("?")
            && !url.contains("#")
            && url.indexOf(' ') < 0;
    }

    private File download(String address) throws IOException {
        File dir = new File(getContext().getCacheDir(), UPDATES_DIR);
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("cartella non disponibile");
        // Una sola copia: si cancella quella vecchia prima di scaricare la nuova.
        File[] old = dir.listFiles();
        if (old != null) {
            for (File f : old) {
                if (!f.delete()) f.deleteOnExit();
            }
        }
        File apk = new File(dir, APK_NAME);

        HttpURLConnection conn = null;
        try {
            // GitHub rimanda a un altro indirizzo (sempre https): si seguono al massimo 5 passaggi.
            URL url = new URL(address);
            boolean ok = false;
            for (int i = 0; i <= MAX_REDIRECTS; i++) {
                if (!"https".equals(url.getProtocol())) throw new IOException("indirizzo non sicuro");
                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(false);
                conn.setConnectTimeout(15_000);
                conn.setReadTimeout(30_000);
                conn.setRequestProperty("User-Agent", "CinCin-Android");
                conn.setRequestProperty("Accept", "application/octet-stream");
                int code = conn.getResponseCode();
                if (code >= 300 && code < 400) {
                    String location = conn.getHeaderField("Location");
                    conn.disconnect();
                    conn = null;
                    if (location == null) throw new IOException("reindirizzamento senza indirizzo");
                    url = new URL(url, location);
                    continue;
                }
                if (code != HttpURLConnection.HTTP_OK) throw new IOException("HTTP " + code);
                ok = true;
                break;
            }
            if (!ok || conn == null) throw new IOException("troppi reindirizzamenti");

            long total = conn.getContentLengthLong();
            long done = 0;
            int lastPercent = -1;
            try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                byte[] buffer = new byte[64 * 1024];
                int n;
                while ((n = in.read(buffer)) != -1) {
                    out.write(buffer, 0, n);
                    done += n;
                    if (total > 0) {
                        int percent = (int) Math.min(100, (done * 100) / total);
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            JSObject progress = new JSObject();
                            progress.put("percent", percent);
                            notifyListeners("progress", progress);
                        }
                    }
                }
            }
            checkComplete(apk, total);
            return apk;
        } catch (IOException e) {
            if (apk.exists() && !apk.delete()) apk.deleteOnExit();
            throw e;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** Il file deve avere la dimensione annunciata, essere un archivio APK intero ed essere proprio Cin Cin. */
    private void checkComplete(File apk, long expected) throws IOException {
        long size = apk.length();
        if (size < MIN_APK_BYTES) throw new IOException("file incompleto");
        if (expected > 0 && size != expected) throw new IOException("file incompleto");
        if (!isWholeZip(apk)) throw new IOException("file incompleto");
        PackageInfo info = getContext().getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(), 0);
        if (info == null || !getContext().getPackageName().equals(info.packageName)) {
            throw new IOException("il file non è un aggiornamento di Cin Cin");
        }
    }

    /** Un APK è un archivio ZIP: comincia con "PK\3\4" e alla fine ha la "fine della directory" ("PK\5\6"). */
    private static boolean isWholeZip(File f) throws IOException {
        long len = f.length();
        int tail = (int) Math.min(len, 22L + 65_535L);
        byte[] head = new byte[4];
        byte[] end = new byte[tail];
        try (RandomAccessFile raf = new RandomAccessFile(f, "r")) {
            raf.readFully(head);
            raf.seek(len - tail);
            raf.readFully(end);
        }
        if (head[0] != 0x50 || head[1] != 0x4b || head[2] != 0x03 || head[3] != 0x04) return false;
        for (int i = tail - 22; i >= 0; i--) {
            if (end[i] == 0x50 && end[i + 1] == 0x4b && end[i + 2] == 0x05 && end[i + 3] == 0x06) return true;
        }
        return false;
    }
}
