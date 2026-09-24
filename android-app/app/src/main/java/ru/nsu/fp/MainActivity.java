package ru.nsu.fp;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.File;

public class MainActivity extends Activity {
    private static final String START_URL = "https://belovvlad.github.io/NSU_FP_Y4_S1/";
    private static final String INTERNAL_HOST = "belovvlad.github.io";
    private static final int APP_BG = Color.rgb(8, 13, 18);
    private static final int TEXT = Color.rgb(234, 212, 183);

    private FrameLayout root;
    private WebView webView;
    private TextView stateView;
    private long updateDownloadId = -1L;
    private BroadcastReceiver downloadReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureEdgeToEdge();

        root = new FrameLayout(this);
        root.setBackgroundColor(APP_BG);
        setContentView(root);
        applySafeInsets();

        stateView = new TextView(this);
        stateView.setText("NSU FP\nЗагрузка…");
        stateView.setTextColor(TEXT);
        stateView.setTextSize(18f);
        stateView.setGravity(Gravity.CENTER);
        stateView.setBackgroundColor(APP_BG);
        root.addView(stateView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        try {
            registerUpdateReceiver();
        } catch (Throwable ignored) {
            downloadReceiver = null;
        }

        try {
            webView = new WebView(this);
            configureWebView();
            root.addView(webView, 0, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
            ));
            root.requestApplyInsets();

            if (savedInstanceState == null) webView.loadUrl(START_URL);
            else webView.restoreState(savedInstanceState);
        } catch (Throwable error) {
            stateView.setText("Не удалось запустить Android WebView.\n\n" +
                    error.getClass().getSimpleName() + ": " +
                    (error.getMessage() == null ? "без описания" : error.getMessage()));
        }
    }

    private void configureEdgeToEdge() {
        Window window = getWindow();

        // Reliable status-bar-only fullscreen. This hides the top status bar
        // without using browser fullscreen and without touching the Back gesture.
        window.setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        window.setNavigationBarColor(APP_BG);
        if (Build.VERSION.SDK_INT >= 29) {
            window.setNavigationBarContrastEnforced(false);
        }

        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams params = window.getAttributes();
            params.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(params);
        }
    }

    private void applySafeInsets() {
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int left = insets.getSystemWindowInsetLeft();
            int right = insets.getSystemWindowInsetRight();
            int bottom = insets.getSystemWindowInsetBottom();
            if (webView != null) webView.setPadding(left, 0, right, bottom);
            if (stateView != null) stateView.setPadding(left, 0, right, bottom);
            return insets;
        });
        root.requestApplyInsets();
    }

    private void configureWebView() {
        webView.setBackgroundColor(APP_BG);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " NSUFPAndroid/" + BuildConfig.VERSION_CODE);

        webView.addJavascriptInterface(new NativeBridge(), "NSUFPAndroid");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                stateView.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    stateView.setVisibility(View.VISIBLE);
                    CharSequence description = error == null ? "Неизвестная ошибка" : error.getDescription();
                    stateView.setText("Не удалось открыть сайт.\n\n" + description +
                            "\n\nПроверьте интернет и запустите приложение снова.");
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openExternalIfNeeded(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternalIfNeeded(Uri.parse(url));
            }
        });
    }

    private final class NativeBridge {
        @JavascriptInterface
        public int getVersionCode() {
            return BuildConfig.VERSION_CODE;
        }

        @JavascriptInterface
        public String getVersionName() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public String startUpdate(String url) {
            try {
                Uri uri = Uri.parse(url);
                String host = uri.getHost();
                String path = uri.getPath();
                boolean allowed = "raw.githubusercontent.com".equalsIgnoreCase(host)
                        && path != null
                        && path.equals("/BelovVlad/NSU_FP_Y4_S1/main/docs/android/NSU-FP.apk");
                if (!allowed) return "error:Недопустимый адрес APK.";

                if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
                    runOnUiThread(() -> startActivity(new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + getPackageName())
                    )));
                    return "permission";
                }

                runOnUiThread(() -> enqueueUpdate(uri));
                return "downloading";
            } catch (Exception error) {
                return "error:" + (error.getMessage() == null ? "Не удалось начать обновление." : error.getMessage());
            }
        }
    }

    private void enqueueUpdate(Uri uri) {
        try {
            File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) throw new IllegalStateException("Нет каталога загрузок.");
            File target = new File(dir, "NSU-FP-update.apk");
            if (target.exists()) target.delete();

            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle("NSU FP — обновление");
            request.setDescription("Загрузка новой версии приложения");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "NSU-FP-update.apk");

            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            updateDownloadId = manager.enqueue(request);
        } catch (Exception error) {
            updateDownloadId = -1L;
        }
    }

    private void registerUpdateReceiver() {
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
                if (id == updateDownloadId) installDownloadedApk(id);
            }
        };
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(downloadReceiver, filter);
    }

    private void installDownloadedApk(long id) {
        DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
        try (Cursor cursor = manager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) return;
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            if (status != DownloadManager.STATUS_SUCCESSFUL) return;
        }

        Uri apk = manager.getUriForDownloadedFile(id);
        if (apk == null) return;
        Intent install = new Intent(Intent.ACTION_VIEW);
        install.setDataAndType(apk, "application/vnd.android.package-archive");
        install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(install);
    }

    private boolean openExternalIfNeeded(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String host = uri.getHost();
        String path = uri.getPath();

        if (("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))
                && INTERNAL_HOST.equalsIgnoreCase(host)
                && path != null
                && path.startsWith("/NSU_FP_Y4_S1/")) return false;

        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception ignored) {}
        return true;
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (downloadReceiver != null) {
            try { unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
        }
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }
}
