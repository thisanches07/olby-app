import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestPasswordReset } from "@/services/auth.service";
import { getAuthErrorMessage } from "@/utils/auth-errors";

const PRIMARY = "#2563EB";
const BG = "#EFF6FF";

// ─────────────────────────────────────────
// Input Field (mesma estrutura do login)
// ─────────────────────────────────────────

interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  editable?: boolean;
}

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  onSubmitEditing,
  editable = true,
}: InputFieldProps) {
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () =>
    Animated.timing(focusAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start();
  const handleBlur = () =>
    Animated.timing(focusAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#E2E8F0", PRIMARY],
  });
  const backgroundColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#F8FAFC", "#FFFFFF"],
  });

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.inputWrapper, { borderColor, backgroundColor }]}>
        <MaterialIcons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, !editable && styles.inputDisabled]}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
        />
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Informe o e-mail cadastrado na sua conta.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError("Digite um e-mail válido.");
      return;
    }
    try {
      setLoading(true);
      await requestPasswordReset(trimmed);
      setSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header com botão voltar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            // ── Estado de sucesso ──────────────────────────────────────
            <View style={styles.card}>
              <View style={styles.successIconWrap}>
                <MaterialIcons name="mark-email-read" size={40} color={PRIMARY} />
              </View>

              <Text style={styles.title}>Verifique seu e-mail</Text>
              <Text style={styles.description}>
                Enviamos um link de redefinição para{" "}
                <Text style={styles.emailHighlight}>{email.trim()}</Text>. Verifique também a
                pasta de spam.
              </Text>

              <View style={styles.tipBox}>
                <MaterialIcons name="info-outline" size={16} color="#2563EB" />
                <Text style={styles.tipText}>
                  O link expira em 1 hora. Se não receber, aguarde alguns minutos e tente novamente.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <MaterialIcons name="arrow-back" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>Voltar para o login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setSent(false);
                  setEmail("");
                  setError(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Enviar para outro e-mail</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── Formulário ────────────────────────────────────────────
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <MaterialIcons name="lock-reset" size={36} color={PRIMARY} />
              </View>

              <Text style={styles.title}>Esqueceu sua senha?</Text>
              <Text style={styles.description}>
                Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.
              </Text>

              {/* Error Banner */}
              {error && (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={17} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    onPress={() => setError(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                  >
                    <MaterialIcons name="close" size={16} color="#B91C1C" />
                  </TouchableOpacity>
                </View>
              )}

              <InputField
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={handleSend}
                editable={!loading}
              />

              <View style={styles.googleNote}>
                <MaterialIcons name="info-outline" size={14} color="#64748B" />
                <Text style={styles.googleNoteText}>
                  Se você entrou com Google ou Apple, não é necessário redefinir senha.{" "}
                  <Text
                    style={styles.googleNoteLink}
                    onPress={() => router.back()}
                  >
                    Voltar e usar o botão do provedor.
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleSend}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Enviar link de redefinição</Text>
                    <MaterialIcons
                      name="send"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    gap: 20,
  },

  // ── Icon ──
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },

  // ── Text ──
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
  },
  emailHighlight: {
    fontWeight: "700",
    color: "#1E293B",
  },

  // ── Tip box ──
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: "#2563EB",
    lineHeight: 18,
    fontWeight: "500",
  },

  // ── Error Banner ──
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "500",
    lineHeight: 18,
  },

  // ── Input ──
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 13,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#1E293B" },
  inputDisabled: { color: "#94A3B8" },

  // ── Buttons ──
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
  },
  googleNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  googleNoteText: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  googleNoteLink: {
    color: PRIMARY,
    fontWeight: "600",
  },
});
