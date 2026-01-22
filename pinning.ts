Great — here’s how to **add a WebView interceptor with SSL pinning on Android** for a hybrid app.

Because you're using a hybrid app with a WebView, **you must intercept requests at the WebView layer**, not just rely on OkHttp-level SSL pinning (which won't catch traffic from WebView by default).

---

## STEP-BY-STEP: SSL Pinning Interceptor for Android WebView

### 1. **Create a custom `WebViewClient`**

You'll override `shouldInterceptRequest` and perform SSL pinning **manually** for HTTPS requests.

```kotlin
import android.webkit.*
import android.content.Context
import android.os.Build
import java.io.*
import java.net.URL
import javax.net.ssl.*

class PinningWebViewClient(
    private val context: Context,
    private val isDevMode: Boolean = false // set to true in debug/dev
) : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest
    ): WebResourceResponse? {
        val url = request.url.toString()

        if (!url.startsWith("https://")) return null

        return try {
            val connection = URL(url).openConnection() as HttpsURLConnection

            // Set pinned SSL context
            connection.sslSocketFactory = getPinnedSSLSocketFactory()
            connection.connect()

            val contentType = connection.contentType ?: "text/html"
            val encoding = connection.contentEncoding ?: "utf-8"
            val inputStream = connection.inputStream

            WebResourceResponse(contentType, encoding, inputStream)
        } catch (e: Exception) {
            e.printStackTrace()

            if (isDevMode) {
                // 🔓 Dev fallback: ignore pinning failure, allow request to go through WebView normally
                return null
            } else {
                // Prod fallback: serve error message or block request entirely
                val errorMessage = "<html><body><h3>Secure connection failed.</h3><p>SSL verification error.</p></body></html>"
                val stream = ByteArrayInputStream(errorMessage.toByteArray(Charsets.UTF_8))
                return WebResourceResponse("text/html", "utf-8", stream)
            }
        }
    }

    private fun getPinnedSSLSocketFactory(): SSLSocketFactory {
        // TODO: Load your pinned cert from res/raw or assets
        val certificateInputStream = context.resources.openRawResource(R.raw.my_cert) // replace with actual cert
        return SSLPinningHelper.createPinnedFactory(certificateInputStream)
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
