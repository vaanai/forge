package com.vivaa.forge;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final String PENDING_SHARE_KEY = "forge_pending_share";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleShareIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleShareIntent(intent);
    }

    private void handleShareIntent(Intent intent) {
        if (intent == null) return;
        if (!Intent.ACTION_SEND.equals(intent.getAction())) return;
        if (intent.getType() == null || !intent.getType().equals("text/plain")) return;

        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if ((text == null || text.isEmpty()) && (subject == null || subject.isEmpty())) return;

        try {
            JSONObject payload = new JSONObject();
            if (text != null && !text.isEmpty()) payload.put("text", text);
            if (subject != null && !subject.isEmpty()) payload.put("subject", subject);

            getSharedPreferences("CapacitorStorage", MODE_PRIVATE)
                .edit()
                .putString(PENDING_SHARE_KEY, payload.toString())
                .apply();

            if (bridge != null && bridge.getWebView() != null) {
                String js = "window.dispatchEvent(new CustomEvent('shareReceived', { detail: "
                    + payload.toString() + " }))";
                bridge.eval(js, null);
            }

            intent.setAction(null);
        } catch (Exception ignored) {
            // Share payload could not be processed
        }
    }
}
