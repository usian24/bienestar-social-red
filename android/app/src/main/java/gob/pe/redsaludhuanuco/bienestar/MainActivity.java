package gob.pe.redsaludhuanuco.bienestar;

import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebBackForwardList;
import android.webkit.WebHistoryItem;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressedAt = 0L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        configureDevWebViewCache();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleCapacitorBackNavigation();
            }
        });
    }

    private void configureDevWebViewCache() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (isDebuggable) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            webView.clearCache(false);
        }
    }

    private void handleCapacitorBackNavigation() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            moveTaskToBack(true);
            return;
        }

        final WebView webView = getBridge().getWebView();
        webView.evaluateJavascript(
            "(function(){ try { return typeof window.__handleAppBackButton === 'function' ? Boolean(window.__handleAppBackButton()) : false; } catch(e) { return false; } })()",
            result -> {
                if (isFinishing() || isDestroyed()) {
                    return;
                }
                if ("true".equals(result)) {
                    return;
                }

                String currentUrl = webView.getUrl();
                String currentPath = extractPath(currentUrl);
                boolean isHttpPage = currentUrl != null && (currentUrl.startsWith("http://") || currentUrl.startsWith("https://"));
                boolean isRootDashboard = "/inicio".equals(currentPath) || "/".equals(currentPath);
                boolean isLoginScreen = "/login".equals(currentPath);

                if ((!isHttpPage || (!isRootDashboard && !isLoginScreen)) && canSafelyGoBack(webView)) {
                    webView.goBack();
                    return;
                }

                if (isHttpPage && !isRootDashboard && !isLoginScreen) {
                    webView.evaluateJavascript("window.location.replace('/inicio');", null);
                    return;
                }

                if (!isHttpPage) {
                    webView.loadUrl(resolveDashboardUrl());
                    return;
                }

                long now = System.currentTimeMillis();
                if (now - lastBackPressedAt < 2000L) {
                    moveTaskToBack(true);
                } else {
                    lastBackPressedAt = now;
                    Toast.makeText(
                        MainActivity.this,
                        "Presiona atrás nuevamente para salir",
                        Toast.LENGTH_SHORT
                    ).show();
                }
            }
        );
    }

    private String resolveDashboardUrl() {
        try {
            if (getBridge() != null && getBridge().getServerUrl() != null && !getBridge().getServerUrl().isEmpty()) {
                String base = getBridge().getServerUrl();
                if (base.endsWith("/")) {
                    base = base.substring(0, base.length() - 1);
                }
                return base + "/inicio";
            }
        } catch (Exception ignored) {
            // Usar URL local por defecto
        }
        return "http://localhost:3000/inicio";
    }

    private boolean canSafelyGoBack(WebView webView) {
        if (!webView.canGoBack()) {
            return false;
        }
        WebBackForwardList list = webView.copyBackForwardList();
        int prevIndex = list.getCurrentIndex() - 1;
        if (prevIndex < 0) {
            return false;
        }
        WebHistoryItem prevItem = list.getItemAtIndex(prevIndex);
        if (prevItem == null) {
            return false;
        }
        String prevUrl = prevItem.getUrl();
        String prevPath = extractPath(prevUrl);
        return !"/login".equals(prevPath) && (prevUrl == null || !prevUrl.startsWith("chrome-error://"));
    }

    private String extractPath(String url) {
        if (url == null) return "";
        try {
            String path = Uri.parse(url).getPath();
            if (path == null || path.isEmpty()) return "/";
            if (path.length() > 1 && path.endsWith("/")) {
                return path.substring(0, path.length() - 1);
            }
            return path;
        } catch (Exception e) {
            return "";
        }
    }
}
