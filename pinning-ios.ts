Here's the **iOS version** of SSL pinning for a hybrid app using `WKWebView` with fallback handling.

This approach uses a custom `URLProtocol` to intercept WebView requests and perform SSL pinning with graceful fallback behavior for **prod vs dev** environments.

---

### ✅ Step 1: Create `PinningURLProtocol.swift`

```swift
import Foundation

class PinningURLProtocol: URLProtocol, URLSessionDelegate {
    static var isDevMode = false // Set this from AppDelegate or build config

    private var dataTask: URLSessionDataTask?

    override class func canInit(with request: URLRequest) -> Bool {
        // Intercept only HTTPS requests
        return request.url?.scheme == "https" && URLProtocol.property(forKey: "Handled", in: request) == nil
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        var newRequest = request
        URLProtocol.setProperty(true, forKey: "Handled", in: &newRequest)

        let config = URLSessionConfiguration.default
        let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)

        dataTask = session.dataTask(with: newRequest) { data, response, error in
            if let error = error {
                print(" SSL Pinning failed: \(error.localizedDescription)")

                if Self.isDevMode {
                    //  Dev fallback: let it go through normal request
                    self.client?.urlProtocol(self, didFailWithError: error)
                } else {
                    //  Prod fallback: block or serve error HTML
                    let errorHtml = "<html><body><h3>Secure connection failed.</h3><p>SSL error occurred.</p></body></html>"
                    let errorData = errorHtml.data(using: .utf8)!
                    let response = URLResponse(url: self.request.url!, mimeType: "text/html", expectedContentLength: errorData.count, textEncodingName: "utf-8")

                    self.client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                    self.client?.urlProtocol(self, didLoad: errorData)
                    self.client?.urlProtocolDidFinishLoading(self)
                }
                return
            }

            if let response = response, let data = data {
                self.client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .allowed)
                self.client?.urlProtocol(self, didLoad: data)
                self.client?.urlProtocolDidFinishLoading(self)
            }
        }

        dataTask?.resume()
    }

    override func stopLoading() {
        dataTask?.cancel()
    }

    //  SSL pinning logic (use certificate or public key hash here)
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {

        if let serverTrust = challenge.protectionSpace.serverTrust {
            // Load your local cert from bundle
            if let pinnedCertPath = Bundle.main.path(forResource: "your_cert", ofType: "cer"),
               let pinnedCertData = try? Data(contentsOf: URL(fileURLWithPath: pinnedCertPath)),
               let serverCert = SecTrustGetCertificateAtIndex(serverTrust, 0) {

                let serverCertData = SecCertificateCopyData(serverCert) as Data

                if serverCertData == pinnedCertData {
                    //  Certificate matches
                    let credential = URLCredential(trust: serverTrust)
                    completionHandler(.useCredential, credential)
                    return
                }
            }
        }

        //  Pinning failed
        completionHandler(.cancelAuthenticationChallenge, nil)
    }
}
```

---

### Step 2: Register `PinningURLProtocol` in AppDelegate

```objc
// AppDelegate.m
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import "YourAppName-Swift.h" // <-- This makes Swift class available

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Register protocol before WebView init
  [NSURLProtocol registerClass:[PinningURLProtocol class]];
  [PinningURLProtocol setIsDevMode:YES]; // or NO in release

  // ... your existing React Native setup ...
}
```

>  If using SwiftUI or React Native v0.70+, you'll register `PinningURLProtocol` before initializing `WKWebView`.

---

###  Step 3: Bundle the `.cer` file

1. Drag your pinned `.cer` certificate file into your Xcode project.
2. Ensure it's added to the **target membership** of your app.
3. Name it `your_cert.cer` or update the filename in code accordingly.

---

###  Dev vs Prod Mode

* `PinningURLProtocol.isDevMode = true` enables dev fallback.
* In production, pinning failure returns a safe error page and blocks malicious requests.

---
