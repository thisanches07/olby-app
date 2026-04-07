import type { ApplicationVerifier } from "firebase/auth";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  [key: string]: unknown;
}

interface Props {
  firebaseConfig: FirebaseConfig;
  attemptInvisibleVerification?: boolean;
  title?: string;
  cancelLabel?: string;
}

type WebViewMessage =
  | { type: "token"; token: string }
  | { type: "expired" }
  | { type: "error"; message: string };

function buildHtml(config: FirebaseConfig): string {
  const configJson = JSON.stringify(config);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 20px; font-family: sans-serif; background: #fff; }
    #recaptcha-container { display: flex; justify-content: center; }
  </style>
</head>
<body>
  <div id="recaptcha-container"></div>
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
    import { getAuth, RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

    function post(msg) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch(e) {}
    }

    try {
      const app = initializeApp(${configJson});
      const auth = getAuth(app);

      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: function(token) {
          post({ type: 'token', token });
        },
        'expired-callback': function() {
          post({ type: 'expired' });
        }
      });

      verifier.verify().then(function(token) {
        post({ type: 'token', token });
      }).catch(function(err) {
        post({ type: 'error', message: err.message || String(err) });
      });
    } catch(err) {
      post({ type: 'error', message: err.message || String(err) });
    }
  </script>
</body>
</html>`;
}

export const FirebaseRecaptchaVerifierModal = forwardRef<
  ApplicationVerifier,
  Props
>(function FirebaseRecaptchaVerifierModal(
  { firebaseConfig, attemptInvisibleVerification = false, title, cancelLabel },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);
  const html = useRef(buildHtml(firebaseConfig)).current;

  useImperativeHandle(ref, () => ({
    type: "recaptcha",
    verify(): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
        setVisible(true);
      });
    },
  }));

  function handleMessage(event: { nativeEvent: { data: string } }) {
    let msg: WebViewMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data) as WebViewMessage;
    } catch {
      return;
    }

    if (msg.type === "token") {
      setVisible(false);
      resolveRef.current?.(msg.token);
    } else if (msg.type === "expired" || msg.type === "error") {
      setVisible(false);
      rejectRef.current?.(
        new Error(msg.type === "error" ? msg.message : "reCAPTCHA expired"),
      );
    }
  }

  function handleCancel() {
    setVisible(false);
    rejectRef.current?.(new Error("reCAPTCHA cancelled"));
  }

  if (attemptInvisibleVerification) {
    // Hidden WebView — runs reCAPTCHA invisibly; shown only when needed
    return (
      <>
        <WebView
          style={styles.hidden}
          source={{ html }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
        />
        {visible && (
          <Modal transparent animationType="slide" onRequestClose={handleCancel}>
            <View style={styles.overlay}>
              <View style={styles.card}>
                <Text style={styles.title}>{title ?? "Verificação de segurança"}</Text>
                <WebView
                  style={styles.webview}
                  source={{ html }}
                  onMessage={handleMessage}
                  javaScriptEnabled
                  domStorageEnabled
                />
                <TouchableOpacity onPress={handleCancel} style={styles.cancel}>
                  <Text style={styles.cancelText}>{cancelLabel ?? "Cancelar"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title ?? "Verificação de segurança"}</Text>
          <WebView
            style={styles.webview}
            source={{ html }}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
          />
          <TouchableOpacity onPress={handleCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>{cancelLabel ?? "Cancelar"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  hidden: { width: 0, height: 0, position: "absolute" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    height: 400,
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  webview: { flex: 1, borderRadius: 8 },
  cancel: { paddingVertical: 12, alignItems: "center" },
  cancelText: { color: "#666", fontSize: 14 },
});
