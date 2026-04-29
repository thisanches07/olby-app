import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
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

import { useToast } from "@/components/obra/toast";
import * as AppleAuthentication from "expo-apple-authentication";

import {
  loginWithApple,
  loginWithEmail,
  loginWithGoogleIdToken,
  registerWithEmail,
  sendCurrentUserEmailVerification,
} from "@/services/auth.service";
import { getAuthErrorMessage } from "@/utils/auth-errors";
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "@/utils/legal";
import {
  extractBrazilPhoneDigits,
  formatBRPhone,
  isValidBrazilMobilePhone,
} from "@/utils/phone";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: false,
});

type AuthMode = "login" | "register";

const PRIMARY = "#2563EB";
const BG = "#EFF6FF";
const MAX_NAME_LENGTH = 30;

// ─────────────────────────────────────────
// Password rules
// ─────────────────────────────────────────

const PASSWORD_RULES = [
  { label: "Mínimo 6 caracteres", test: (p: string) => p.length >= 6 },
  { label: "1 letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  {
    label: "1 caractere especial",
    test: (p: string) => /[^a-zA-Z0-9]/.test(p),
  },
] as const;

function validatePassword(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.label;
  }
  return null;
}

// ─────────────────────────────────────────
// Password Rules Checklist
// ─────────────────────────────────────────

function PasswordRules({ password }: { password: string }) {
  if (!password) return null;

  return (
    <View style={styles.rulesContainer}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <View key={rule.label} style={styles.ruleRow}>
            <MaterialIcons
              name={met ? "check-circle" : "radio-button-unchecked"}
              size={14}
              color={met ? "#16A34A" : "#94A3B8"}
            />
            <Text style={[styles.ruleText, met && styles.ruleTextMet]}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────
// Error Banner
// ─────────────────────────────────────────

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-6)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(-6);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <Animated.View
      style={[styles.errorBanner, { opacity, transform: [{ translateY }] }]}
    >
      <MaterialIcons name="error-outline" size={18} color="#DC2626" />
      <Text style={styles.errorBannerText}>{message}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.6}
      >
        <MaterialIcons name="close" size={17} color="#B91C1C" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────
// Google Icon
// ─────────────────────────────────────────

function GoogleIcon() {
  return (
    <View style={styles.googleIconOuter}>
      <AntDesign name="google" size={18} color="#EA4335" />
    </View>
  );
}

// ─────────────────────────────────────────
// Input Field (com forwardRef para navegação entre campos)
// ─────────────────────────────────────────

interface InputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  isPassword?: boolean;
  returnKeyType?: React.ComponentProps<typeof TextInput>["returnKeyType"];
  onSubmitEditing?: () => void;
  submitBehavior?: React.ComponentProps<typeof TextInput>["submitBehavior"];
  onFocus?: () => void;
  onBlur?: () => void;
  helperText?: string;
  maxLength?: number;
}

const InputField = React.forwardRef<TextInput, InputFieldProps>(
  function InputField(
    {
      label,
      placeholder,
      value,
      onChangeText,
      icon,
      keyboardType = "default",
      autoCapitalize = "none",
      isPassword = false,
      returnKeyType = "default",
      onSubmitEditing,
      submitBehavior = "blurAndSubmit",
      onFocus,
      onBlur,
      helperText,
      maxLength,
    },
    ref,
  ) {
    const [showPassword, setShowPassword] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = useCallback(() => {
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
      onFocus?.();
    }, [focusAnim, onFocus]);

    const handleBlur = useCallback(() => {
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
      onBlur?.();
    }, [focusAnim, onBlur]);

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
        <Animated.View
          style={[styles.inputWrapper, { borderColor, backgroundColor }]}
        >
          <MaterialIcons
            name={icon}
            size={20}
            color="#94A3B8"
            style={styles.inputIcon}
          />
          <TextInput
            ref={ref}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            maxLength={maxLength}
            secureTextEntry={isPassword && !showPassword}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            submitBehavior={submitBehavior}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowPassword((p) => !p)}
              style={styles.eyeButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={showPassword ? "visibility-off" : "visibility"}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          )}
        </Animated.View>
        {!!helperText && <Text style={styles.inputHelperText}>{helperText}</Text>}
      </View>
    );
  },
);

// ─────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────

export default function LoginScreen() {
  const { showToast } = useToast();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [nome, setNome] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para navegação entre campos
  const nomeRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const senhaRef = useRef<TextInput>(null);
  const confirmSenhaRef = useRef<TextInput>(null);

  const scrollRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const showError = (msg: string) => setError(msg);
  const clearError = () => setError(null);
  const isBusy = loading || googleLoading || appleLoading;
  const isNameAtLimit = nome.length >= MAX_NAME_LENGTH;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setIsKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);


  const handleLogin = async () => {
    clearError();
    if (!email || !senha) {
      showError("Preencha o e-mail e a senha para continuar.");
      return;
    }
    try {
      setLoading(true);
      await loginWithEmail(email, senha);
      router.replace("/(tabs)");
    } catch (err) {
      showError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    clearError();
    if (!nome || !email || !senha || !confirmSenha) {
      showError("Preencha todos os campos para criar sua conta.");
      return;
    }
    // Telefone é opcional — se preenchido precisa ter 11 dígitos (DDD + número)
    if (phoneRaw.length > 0 && !isValidBrazilMobilePhone(phoneRaw)) {
      showError("Informe seu celular com DDD (11 dígitos).");
      return;
    }
    const ruleError = validatePassword(senha);
    if (ruleError) {
      showError(`A senha precisa ter ${ruleError.toLowerCase()}.`);
      return;
    }
    if (senha !== confirmSenha) {
      showError("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }

    try {
      setLoading(true);
      await registerWithEmail(email, senha, nome, phoneRaw || undefined);
      await sendCurrentUserEmailVerification();
      showToast({
        title: "Confirme seu e-mail",
        message: "Enviamos um link de verificação para sua caixa de entrada.",
        tone: "info",
      });
      router.replace("/(tabs)");
    } catch (err) {
      showError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    clearError();
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === "cancelled") return;
      const idToken = response.data?.idToken;
      if (!idToken) {
        showError("Não foi possível obter o token do Google. Tente novamente.");
        return;
      }
      await loginWithGoogleIdToken(idToken);
      router.replace("/(tabs)");
    } catch (err: any) {
      if (
        err.code === statusCodes.SIGN_IN_CANCELLED ||
        err.code === statusCodes.IN_PROGRESS
      ) {
        return;
      }
      showError(getAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    clearError();
    try {
      setAppleLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      console.log(
        "name >",
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      );
      console.log(
        "email >",
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      );

      console.log("[AUTH][APPLE_UI] Apple signInAsync response", {
        user: credential.user ?? null,
        email: credential.email ?? null,
        fullName: credential.fullName ?? null,
        hasIdentityToken: Boolean(credential.identityToken),
        identityTokenLength: credential.identityToken?.length ?? 0,
        realUserStatus: credential.realUserStatus ?? null,
      });
      if (!credential.identityToken) {
        showError("Não foi possível obter o token da Apple. Tente novamente.");
        return;
      }
      await loginWithApple(credential.identityToken, credential.fullName);
      router.replace("/(tabs)");
    } catch (err) {
      // Cancel silencioso — usuário fechou o sheet intencionalmente
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "ERR_REQUEST_CANCELED"
      ) {
        return;
      }
      showError(getAuthErrorMessage(err));
    } finally {
      setAppleLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setEmail("");
    setSenha("");
    setConfirmSenha("");
    setNome("");
    setPhoneRaw("");
    clearError();
  };

  // Rola para o fim quando as regras de senha aparecem,
  // garantindo que o usuário as veja enquanto digita
  const handleSenhaChange = (text: string) => {
    const wasEmpty = senha === "";
    setSenha(text);
    if (wasEmpty && text.length === 1 && mode === "register") {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const openPrivacy = useCallback(() => {
    void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  }, []);

  const openTerms = useCallback(() => {
    void WebBrowser.openBrowserAsync(TERMS_OF_USE_URL);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "android" ? "height" : undefined}
        enabled={Platform.OS === "android"}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            isKeyboardVisible && styles.scrollKeyboardOpen,
          ]}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Obly App</Text>
            <Text style={styles.tagline}>
              Gerencie suas obras com facilidade
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === "login" && styles.tabActive]}
                onPress={() => switchMode("login")}
              >
                <Text
                  style={[
                    styles.tabText,
                    mode === "login" && styles.tabTextActive,
                  ]}
                >
                  Entrar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, mode === "register" && styles.tabActive]}
                onPress={() => switchMode("register")}
              >
                <Text
                  style={[
                    styles.tabText,
                    mode === "register" && styles.tabTextActive,
                  ]}
                >
                  Criar Conta
                </Text>
              </TouchableOpacity>
            </View>

            {/* Google Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                isBusy && styles.googleButtonDisabled,
              ]}
              onPress={handleGoogleAuth}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={styles.googleButtonText}>
                    {mode === "login"
                      ? "Entrar com Google"
                      : "Cadastrar com Google"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple Button — iOS only */}
            {Platform.OS === "ios" && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  mode === "login"
                    ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={14}
                style={[
                  styles.appleButton,
                  isBusy && styles.appleButtonDisabled,
                ]}
                onPress={handleAppleAuth}
              />
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou continue com e-mail</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Error Banner */}
            {error && <ErrorBanner message={error} onDismiss={clearError} />}

            {/* Form */}
            <View style={styles.form}>
              {mode === "register" && (
                <>
                  <InputField
                    ref={nomeRef}
                    label="Nome completo"
                    placeholder="Seu nome"
                    value={nome}
                    onChangeText={(text) => setNome(text.slice(0, MAX_NAME_LENGTH))}
                    icon="person-outline"
                    autoCapitalize="words"
                    maxLength={MAX_NAME_LENGTH}
                    helperText={
                      isNameAtLimit
                        ? `Limite maximo de ${MAX_NAME_LENGTH} caracteres atingido.`
                        : undefined
                    }
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                  />
                  <InputField
                    ref={phoneRef}
                    label="Celular"
                    placeholder="(11) 99999-8888"
                    value={formatBRPhone(phoneRaw)}
                    onChangeText={(text) =>
                      setPhoneRaw(extractBrazilPhoneDigits(text))
                    }
                    icon="phone"
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                </>
              )}

              <InputField
                ref={emailRef}
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                icon="mail-outline"
                keyboardType="email-address"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => senhaRef.current?.focus()}
              />

              <InputField
                ref={senhaRef}
                label="Senha"
                placeholder="••••••••"
                value={senha}
                onChangeText={handleSenhaChange}
                icon="lock-outline"
                isPassword
                returnKeyType={mode === "login" ? "done" : "next"}
                submitBehavior={mode === "login" ? "blurAndSubmit" : "submit"}
                onSubmitEditing={
                  mode === "login"
                    ? handleLogin
                    : () => confirmSenhaRef.current?.focus()
                }
              />

              {mode === "login" && (
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => router.push("/forgot-password")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotLinkText}>Esqueceu sua senha?</Text>
                </TouchableOpacity>
              )}

              {mode === "register" && (
                <>
                  <PasswordRules password={senha} />

                  <InputField
                    ref={confirmSenhaRef}
                    label="Confirmar senha"
                    placeholder="••••••••"
                    value={confirmSenha}
                    onChangeText={setConfirmSenha}
                    icon="lock-outline"
                    isPassword
                    returnKeyType="done"
                    submitBehavior="blurAndSubmit"
                    onSubmitEditing={handleRegister}
                  />
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isBusy && styles.primaryButtonDisabled,
                ]}
                onPress={mode === "login" ? handleLogin : handleRegister}
                disabled={isBusy}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      {mode === "login" ? "Entrar" : "Criar Conta"}
                    </Text>
                    <MaterialIcons
                      name="arrow-forward"
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.legalTextContainer}>
                <Text style={styles.legalText}>
                  Ao continuar, você concorda com nossos
                  <Text style={styles.legalLink} onPress={openTerms}>
                    {" "}
                    Termos de Uso
                  </Text>{" "}
                  e
                  <Text style={styles.legalLink} onPress={openPrivacy}>
                    {" "}
                    Política de Privacidade
                  </Text>
                  .
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/*
        TODO: Manter a verificacao de telefone comentada no cadastro por enquanto.
        Quando esse fluxo for revisado, podemos reativar o PhoneVerifyModal abaixo
        e voltar a usar completeRegistrationWithPhone/onVerified.

        <PhoneVerifyModal
          visible={showPhoneVerify}
          initialPhone={`+55${phoneRaw}`}
          onVerified={async (phoneE164) => {
            await completeRegistrationWithPhone(email, senha, nome, phoneE164);
            await sendCurrentUserEmailVerification();
          }}
          onSuccess={() => {
            setPhoneVerified(new Date().toISOString());
            setRegistrationInProgress(false);
            showToast({
              title: "Confirme seu e-mail",
              message:
                "Enviamos um link de verificacao para sua caixa de entrada.",
              tone: "info",
            });
            router.replace("/(tabs)");
          }}
          onClose={() => {
            setRegistrationInProgress(false);
            setShowPhoneVerify(false);
          }}
          onSkip={handleRegisterWithoutPhone}
        />
      */}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    justifyContent: "center",
  },
  scrollKeyboardOpen: {
    justifyContent: "flex-start",
    paddingTop: 12,
    paddingBottom: 24,
  },
  logoSection: { alignItems: "center", marginBottom: 28 },
  logoImage: { width: 88, height: 88, borderRadius: 22, marginBottom: 14 },
  appName: { fontSize: 30, fontWeight: "800", color: "#1E293B" },
  tagline: { fontSize: 14, color: "#64748B" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 28, padding: 24 },

  tabRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 11,
  },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  tabTextActive: { color: "#1E293B" },

  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "#FAFAFA",
    marginBottom: 20,
  },
  googleButtonDisabled: { opacity: 0.7 },
  appleButton: {
    height: 52,
    borderRadius: 14,
    marginBottom: 20,
  },
  appleButtonDisabled: { opacity: 0.7 },
  googleIconOuter: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8EDF2",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },

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
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "500",
    lineHeight: 18,
  },

  rulesContainer: {
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  ruleText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  ruleTextMet: {
    color: "#16A34A",
  },
  inputHelperText: {
    marginTop: 6,
    fontSize: 12,
    color: "#B45309",
    fontWeight: "600",
  },

  form: { gap: 14 },
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
  eyeButton: { padding: 6 },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  legalTextContainer: {
    marginTop: 10,
  },
  legalText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
  legalLink: {
    color: PRIMARY,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -6,
  },
  forgotLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },
});
