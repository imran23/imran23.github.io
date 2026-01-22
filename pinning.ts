Great — here’s how to **add a WebView interceptor with SSL pinning on Android** for a hybrid app.

Because you're using a hybrid app with a WebView, **you must intercept requests at the WebView layer**, not just rely on OkHttp-level SSL pinning (which won't catch traffic from WebView by default).

---

## STEP-BY-STEP: SSL Pinning Interceptor for Android WebView

### 1. **Create a custom `WebViewClient`**

You'll override `shouldInterceptRequest` and perform SSL pinning **manually** for HTTPS requests.

```kotlin
import android.webkit.WebView
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebViewClient
import java.io.InputStream
import java.net.URL
import javax.net.ssl.*

class PinningWebViewClient : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest
    ): WebResourceResponse? {
        val url = request.url.toString()

        // Only intercept HTTPS requests
        if (!url.startsWith("https://")) return null

        return try {
            val connection = URL(url).openConnection() as HttpsURLConnection

            // Set SSLContext with pinned cert
            connection.sslSocketFactory = getPinnedSSLSocketFactory()
            connection.connect()

            val contentType = connection.contentType ?: "text/html"
            val inputStream: InputStream = connection.inputStream

            WebResourceResponse(contentType, connection.contentEncoding, inputStream)
        } catch (e: Exception) {
            e.printStackTrace()
            null // Let WebView handle fallback
        }
    }

    private fun getPinnedSSLSocketFactory(): SSLSocketFactory {
        // Load certificate or public key hash
        val certificateInputStream = ... // Load from /res/raw or assets
        val factory = SSLPinningHelper.createPinnedFactory(certificateInputStream)
        return factory
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
