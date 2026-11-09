package com.nikcirri.cincin;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin dell'app (non da npm): scarica e installa gli aggiornamenti da GitHub.
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        // Durante i giochi lo schermo non si spegne da solo (il telefono gira sul tavolo).
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
