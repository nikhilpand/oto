package com.oto.music.auth

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject
import org.json.JSONTokener

/**
 * YtMusicAuthModule — Native Android in-app Google Sign-In & Cookie Session Extraction
 *
 * Implements clean-room Google Authentication for YouTube Music via native Android WebView
 * and CookieManager, replicating BitChord's reverse-engineered YtMusicLoginScreen protocol.
 */
class YtMusicAuthModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "YtMusicAuthModule"

    private var activeDialog: Dialog? = null

    companion object {
        private const val TAG = "OTO_AUTH"
        private const val MUSIC_ORIGIN = "https://music.youtube.com"
        private const val LOGIN_URL =
            "https://accounts.google.com/ServiceLogin" +
                "?ltmpl=music&service=youtube&passive=true" +
                "&continue=https%3A%2F%2Fmusic.youtube.com%2F"

        // Clean mobile Chrome UA without "wv" or "Version/4.0" to bypass Google's disallowed_useragent block
        private const val CLEAN_USER_AGENT =
            "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36"

        private val API_SID_NAMES = setOf("SAPISID", "__Secure-3PAPISID", "__Secure-1PAPISID")

        private val GOOGLE_ORIGINS = listOf(
            "https://music.youtube.com",
            "https://www.youtube.com",
            "https://youtube.com",
            "https://accounts.google.com",
            "https://www.google.com",
            "https://google.com"
        )

        fun hasApiSid(cookieHeader: String): Boolean =
            cookieHeader.split(';').any { entry ->
                val name = entry.substringBefore('=').trim()
                val value = entry.substringAfter('=', "").trim()
                name in API_SID_NAMES && value.isNotEmpty()
            }

        fun getAllCookies(): String {
            val manager = runCatching { CookieManager.getInstance() }.getOrNull() ?: return ""
            val origins = listOf(
                "https://music.youtube.com",
                "https://www.youtube.com",
                "https://youtube.com",
                "https://accounts.google.com"
            )
            val map = linkedMapOf<String, String>()
            for (origin in origins) {
                val jar = manager.getCookie(origin) ?: continue
                for (entry in jar.split(';')) {
                    val trimmed = entry.trim()
                    if (trimmed.isEmpty()) continue
                    val name = trimmed.substringBefore('=').trim()
                    val value = trimmed.substringAfter('=', "").trim()
                    if (name.isNotEmpty() && value.isNotEmpty()) {
                        map[name] = value
                    }
                }
            }
            return map.entries.joinToString("; ") { "${it.key}=${it.value}" }
        }

        fun parseConfig(raw: String?): JSONObject? {
            if (raw == null || raw == "null" || raw.isBlank()) return null
            return try {
                val tokener = JSONTokener(raw)
                when (val value = tokener.nextValue()) {
                    is JSONObject -> value
                    is String -> {
                        val innerTokener = JSONTokener(value)
                        innerTokener.nextValue() as? JSONObject
                    }
                    else -> null
                }
            } catch (e: Exception) {
                Log.w(TAG, "parseConfig exception: ${e.message}")
                null
            }
        }

        /**
         * Probe JavaScript returns a raw JS object literal so that WebView natively
         * JSON-serializes it without double-encoding.
         */
        private const val YTCFG_PROBE = """
(function () {
  try {
    if (!window.ytcfg || !window.ytcfg.get) return null;
    var get = function (key) {
      var value = window.ytcfg.get(key);
      return (value === undefined || value === null || value === '') ? null : String(value);
    };
    return {
      loggedIn: String(!!window.ytcfg.get('LOGGED_IN')),
      pageId: get('DELEGATED_SESSION_ID'),
      dataSyncId: get('DATASYNC_ID'),
      authUser: get('SESSION_INDEX'),
      visitorData: get('VISITOR_DATA'),
      clientVersion: get('INNERTUBE_CLIENT_VERSION')
    };
  } catch (e) {
    return null;
  }
})()
"""
    }

    @SuppressLint("SetJavaScriptEnabled")
    @ReactMethod
    fun openGoogleSignIn(promise: Promise) {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        activity.runOnUiThread {
            try {
                if (activeDialog?.isShowing == true) {
                    activeDialog?.dismiss()
                    activeDialog = null
                }

                val dialog = Dialog(activity, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
                dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
                dialog.window?.setBackgroundDrawable(ColorDrawable(Color.parseColor("#0A0A0B")))

                val rootLayout = LinearLayout(activity).apply {
                    orientation = LinearLayout.VERTICAL
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setBackgroundColor(Color.parseColor("#0A0A0B"))
                }

                // Top Header Bar
                val header = LinearLayout(activity).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        dpToPx(56)
                    )
                    setPadding(dpToPx(16), 0, dpToPx(16), 0)
                    gravity = Gravity.CENTER_VERTICAL
                    setBackgroundColor(Color.parseColor("#141416"))
                }

                val titleView = TextView(activity).apply {
                    text = "Sign in with Google"
                    setTextColor(Color.parseColor("#F5F5F7"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }

                val confirmBtn = Button(activity).apply {
                    text = "Confirm Profile"
                    setTextColor(Color.parseColor("#0A0A0B"))
                    setBackgroundColor(Color.parseColor("#D4973B"))
                    visibility = View.GONE
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        dpToPx(38)
                    )
                }

                var isResolved = false
                var cachedSession: WritableMap? = null

                fun sendSession(map: WritableMap) {
                    if (isResolved) return
                    isResolved = true
                    Log.d(TAG, "Resolving session: authUser=${map.getString("authUser")}, cookieLen=${map.getString("cookie")?.length}")
                    activity.runOnUiThread {
                        try {
                            dialog.dismiss()
                        } catch (e: Exception) {
                            Log.w(TAG, "Dismiss exception: ${e.message}")
                        }
                    }
                    promise.resolve(map)
                }

                val closeBtn = TextView(activity).apply {
                    text = "✕"
                    setTextColor(Color.parseColor("#8E8E93"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
                    setPadding(dpToPx(12), dpToPx(8), dpToPx(12), dpToPx(8))
                    setOnClickListener {
                        if (!isResolved) {
                            isResolved = true
                            Log.d(TAG, "User clicked close button (X)")
                            dialog.dismiss()
                            promise.reject("CANCELLED", "User closed Google sign-in")
                        }
                    }
                }

                header.addView(titleView)
                header.addView(confirmBtn)
                header.addView(closeBtn)
                rootLayout.addView(header)

                // Progress Bar
                val progressBar = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal).apply {
                    isIndeterminate = true
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        dpToPx(3)
                    )
                    visibility = View.VISIBLE
                }
                rootLayout.addView(progressBar)

                // WebView Container
                val webView = WebView(activity).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        0,
                        1f
                    )
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.userAgentString = CLEAN_USER_AGENT
                    setBackgroundColor(Color.parseColor("#0A0A0B"))
                }

                fun attemptCapture(view: WebView, force: Boolean) {
                    if (isResolved) return
                    val cookies = getAllCookies()
                    val hasSid = hasApiSid(cookies)
                    Log.d(TAG, "attemptCapture: hasSid=$hasSid, force=$force, url=${view.url}")

                    if (!hasSid && !force) {
                        return
                    }

                    runCatching { CookieManager.getInstance().flush() }

                    view.evaluateJavascript(YTCFG_PROBE) { rawResult ->
                        if (isResolved) return@evaluateJavascript
                        Log.d(TAG, "Probe rawResult: $rawResult")
                        val config = parseConfig(rawResult)
                        val loggedIn = config?.optString("loggedIn", "false") == "true"

                        if (loggedIn || hasSid) {
                            activity.runOnUiThread {
                                confirmBtn.visibility = View.VISIBLE
                                titleView.text = "Account Ready"
                            }

                            val pageId = config?.optString("pageId", "")?.takeIf { it.isNotEmpty() }
                            val dataSyncId = config?.optString("dataSyncId", "")?.takeIf { it.isNotEmpty() }
                            val authUser = config?.optString("authUser", "0")?.takeIf { it.isNotEmpty() } ?: "0"
                            val visitorData = config?.optString("visitorData", "")?.takeIf { it.isNotEmpty() }
                            val clientVersion = config?.optString("clientVersion", "1.20250101.01.00") ?: "1.20250101.01.00"

                            val map = Arguments.createMap().apply {
                                putString("cookie", cookies)
                                if (dataSyncId != null) putString("dataSyncId", dataSyncId)
                                if (pageId != null) putString("pageId", pageId)
                                putString("authUser", authUser)
                                if (visitorData != null) putString("visitorData", visitorData)
                                putString("clientVersion", clientVersion)
                            }

                            cachedSession = map

                            if (force) {
                                sendSession(map)
                            }
                        }
                    }
                }

                // Attach confirm button click listener immediately
                confirmBtn.setOnClickListener {
                    Log.d(TAG, "Confirm button clicked! cachedSession!=null: ${cachedSession != null}")
                    val current = cachedSession
                    if (current != null) {
                        sendSession(current)
                    } else {
                        val cookies = getAllCookies()
                        if (hasApiSid(cookies)) {
                            val map = Arguments.createMap().apply {
                                putString("cookie", cookies)
                                putString("authUser", "0")
                                putString("clientVersion", "1.20250101.01.00")
                            }
                            sendSession(map)
                        } else {
                            titleView.text = "Signing in..."
                            attemptCapture(webView, force = true)
                        }
                    }
                }

                webView.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        progressBar.visibility = View.GONE
                        Log.d(TAG, "onPageFinished: $url")
                        if (url != null && (url.startsWith(MUSIC_ORIGIN) || url.contains("music.youtube.com"))) {
                            view?.let { attemptCapture(it, force = false) }
                        }
                    }

                    override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                        progressBar.visibility = View.VISIBLE
                        Log.d(TAG, "onPageStarted: $url")
                        if (url != null && (url.startsWith(MUSIC_ORIGIN) || url.contains("music.youtube.com"))) {
                            view?.let { attemptCapture(it, force = false) }
                        }
                    }
                }

                rootLayout.addView(webView)
                dialog.setContentView(rootLayout)

                dialog.setOnCancelListener {
                    if (!isResolved) {
                        isResolved = true
                        Log.d(TAG, "Dialog onCancel triggered (back key)")
                        promise.reject("CANCELLED", "User cancelled Google sign-in")
                    }
                }

                activeDialog = dialog
                dialog.show()

                Log.d(TAG, "Loading login URL: $LOGIN_URL")
                webView.loadUrl(LOGIN_URL)
            } catch (e: Exception) {
                Log.e(TAG, "openGoogleSignIn exception: ${e.message}", e)
                promise.reject("SIGN_IN_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun clearGoogleCookies(promise: Promise) {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        activity.runOnUiThread {
            try {
                val manager = CookieManager.getInstance()
                for (origin in GOOGLE_ORIGINS) {
                    val jar = manager.getCookie(origin) ?: continue
                    val host = origin.substringAfter("://")
                    for (entry in jar.split(';')) {
                        val name = entry.substringBefore('=').trim()
                        if (name.isEmpty()) continue
                        manager.setCookie(origin, "$name=; Max-Age=0; Path=/")
                        manager.setCookie(origin, "$name=; Max-Age=0; Path=/; Domain=$host")
                        manager.setCookie(origin, "$name=; Max-Age=0; Path=/; Domain=.$host")
                    }
                }
                manager.flush()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("COOKIE_CLEAR_ERROR", e.message, e)
            }
        }
    }

    private fun dpToPx(dp: Int): Int {
        val metrics = reactApplicationContext.resources.displayMetrics
        return (dp * metrics.density).toInt()
    }
}

