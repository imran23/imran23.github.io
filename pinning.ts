Great — here’s how to **add a WebView interceptor with SSL pinning on Android** for a hybrid app.

Because you're using a hybrid app with a WebView, **you must intercept requests at the WebView layer**, not just rely on OkHttp-level SSL pinning (which won't catch traffic from WebView by default).

---

## STEP-BY-STEP: SSL Pinning Interceptor for Android WebView

### 1. **Create a custom `WebViewClient`**

You'll override `shouldInterceptRequest` and perform SSL pinning **manually** for HTTPS requests.

```kotlin
package com.company.proj.webview

import android.content.Context
import android.util.Base64
import android.util.Log
import android.webkit.*
import com.company.proj.network.SSLConfig
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.net.URL
import java.security.MessageDigest
import java.security.cert.X509Certificate
import javax.net.ssl.*

/**
 * WebViewClient that enforces SSL pinning for HTTPS requests.
 *
 * - Uses the same SPKI pins as OkHttp (shared via SSLConfig)
 * - Blocks connections on pin mismatch (prod)
 * - Allows fallback in dev/debug mode
 */
class SSLPinningWebViewClient(
    private val context: Context,
    private val isDevMode: Boolean
) : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest
    ): WebResourceResponse? {

        val url = request.url ?: return null
        if (url.scheme != "https") return null

        return try {
            val connection = url.toURL().openConnection() as HttpsURLConnection
            connection.connect()

            // Validate certificate pin
            validatePinnedCertificate(connection, url.host)

            val contentType = connection.contentType ?: "text/html"
            val encoding = connection.contentEncoding ?: "utf-8"
            val inputStream = connection.inputStream

            WebResourceResponse(contentType, encoding, inputStream)

        } catch (e: Exception) {
            Log.e("SSLPinningWebView", "SSL pinning failed for ${request.url}", e)

            if (isDevMode) {
                // DEV MODE:
                // Allow WebView to proceed normally (no pin enforcement)
                null
            } else {
                // PROD MODE:
                // Block request and return security error page
                buildErrorResponse()
            }
        }
    }

    /**
     * Validates the server certificate against pinned SPKI hashes.
     */
    private fun validatePinnedCertificate(
        connection: HttpsURLConnection,
        host: String
    ) {
        val certs = connection.serverCertificates
        if (certs.isEmpty()) {
            throw SSLPeerUnverifiedException("No server certificates")
        }

        val x509 = certs[0] as X509Certificate
        val publicKey = x509.publicKey.encoded
        val sha256 = sha256Base64(publicKey)

        val validPins = SSLConfig.HOST_PINS[host]
            ?: throw SSLPeerUnverifiedException("No pins configured for host: $host")

        if (!validPins.contains("sha256/$sha256")) {
            throw SSLPeerUnverifiedException("Pin mismatch for host: $host")
        }
    }

    /**
     * Computes SHA‑256 Base64 hash of public key (SPKI pin).
     */
    private fun sha256Base64(data: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(data)
        return Base64.encodeToString(digest, Base64.NO_WRAP)
    }

    /**
     * Builds a safe error response for production pinning failures.
     */
    private fun buildErrorResponse(): WebResourceResponse {
        val html = """
            <html>
              <body style="font-family:sans-serif;padding:24px;">
                <h3>Secure Connection Failed</h3>
                <p>This connection could not be verified.</p>
                <p>Please try again later.</p>
              </body>
            </html>
        """.trimIndent()

        return WebResourceResponse(
            "text/html",
            "utf-8",
            ByteArrayInputStream(html.toByteArray())
        )
    }
}


```

---

### 2. **Attach `PinningWebViewClient` to your WebView**

In your `MainActivity.kt` or wherever you initialize the WebView:

```kotlin
val myWebView = findViewById<WebView>(R.id.webview)
myWebView.webViewClient = PinningWebViewClient()
myWebView.loadUrl("https://your-secure-site.com")


/// for fallback usage
val isDev = BuildConfig.DEBUG
webView.webViewClient = PinningWebViewClient(this, isDev)

```

---

### 3. **Implement SSLPinningHelper**

Here’s a helper that loads a pinned certificate:

```kotlin
object SSLPinningHelper {
    fun createPinnedFactory(certInputStream: InputStream): SSLSocketFactory {
        val cf = CertificateFactory.getInstance("X.509")
        val ca = cf.generateCertificate(certInputStream)

        val keyStore = KeyStore.getInstance(KeyStore.getDefaultType())
        keyStore.load(null, null)
        keyStore.setCertificateEntry("ca", ca)

        val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        tmf.init(keyStore)

        val context = SSLContext.getInstance("TLS")
        context.init(null, tmf.trustManagers, null)
        return context.socketFactory
    }
}
```

Store your `.cer` or `.pem` file inside `res/raw` or `assets` and load via:

```kotlin
val certInputStream = context.resources.openRawResource(R.raw.my_cert)
```

---

### 4. **Test**

* Try with correct cert: request should load fine.
* Try replacing the cert or using a different host: it should fail silently or with a broken page.

---

### 🔐 Advanced: Public Key Pinning (SHA256 hash)

If you prefer to pin by **public key hash** (like in iOS TrustKit), you can use libraries like [Conscrypt](https://github.com/google/conscrypt) or manually verify the cert's public key hash.

---

Would you like help with:

* Adding a fallback if cert pinning fails?
* iOS version of the same thing?
* Managing multiple certs or backup pins?

Let me know and I’ll build the next part.
