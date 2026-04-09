import { FirebaseRecaptchaVerifierModal } from "@/components/firebase-recaptcha-verifier";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  type BackendUser,
  linkPhoneWithCode,
  sendPhoneCode,
} from "@/services/auth.service";
import { firebaseApp } from "@/services/firebase";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRPhone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function mapFirebaseError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? (err as { code: string }).code
      : "";
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : "";
  switch (code) {
    case "auth/invalid-verification-code":
      return "Código inválido. Tente novamente.";
    case "auth/code-expired":
      return "O código expirou. Reenvie o SMS.";
    case "auth/credential-already-in-use":
      return "Este número já está associado a outra conta.";
    case "auth/email-already-in-use":
      return "Este e-mail já está cadastrado. Tente fazer login.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos.";
    case "auth/invalid-phone-number":
      return "Número de telefone inválido.";
    case "auth/invalid-app-credential":
    case "auth/missing-app-credential":
      return "Não foi possivel validar a verificacao de segurança. Tente novamente.";
    case "auth/internal-error":
      return "Não foi possivel concluir a validacao de segurança. Tente novamente.";
    default:
      if (
        message.includes("invalid-app-credential") ||
        message.includes("missing-app-credential") ||
        message.includes("reCAPTCHA") ||
        message.includes("recaptcha")
      ) {
        return "Não foi possivel validar a verificacao de segurança. Tente novamente.";
      }
      return "Ocorreu um erro. Tente novamente.";
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhoneVerifyModalProps {
  visible: boolean;
  initialPhone?: string;
  onSuccess: (updatedUser?: BackendUser) => void;
  onClose: () => void;
  mandatory?: boolean;
  onSkip?: () => void | Promise<void>;
  /** Se presente, o modal opera em modo de cadastro: após confirm() chama onVerified(phoneE164)
   *  e o parent é responsável por criar a conta. O linkPhoneWithCode não é chamado. */
  onVerified?: (phoneE164: string) => Promise<void>;
}

type Step = "phone" | "otp" | "success";

// ─── OTP Input ───────────────────────────────────────────────────────────────

interface OtpInputProps {
  otp: string[];
  inputRefs: React.MutableRefObject<(TextInput | null)[]>;
  shakeAnim: Animated.Value;
  hasError: boolean;
  onChange: (value: string, index: number) => void;
  onKeyPress: (key: string, index: number) => void;
}

function OtpInput({
  otp,
  inputRefs,
  shakeAnim,
  hasError,
  onChange,
  onKeyPress,
}: OtpInputProps) {
  const shakeStyle = {
    transform: [{ translateX: shakeAnim }],
  };

  return (
    <Animated.View style={[styles.otpRow, shakeStyle]}>
      {otp.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          style={[
            styles.otpBox,
            digit ? styles.otpBoxFilled : {},
            hasError ? styles.otpBoxError : {},
          ]}
          value={digit}
          onChangeText={(text) => onChange(text, index)}
          onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, index)}
          keyboardType="number-pad"
          maxLength={6}
          textContentType={index === 0 ? "oneTimeCode" : "none"}
          selectTextOnFocus
          selectionColor={colors.primary}
          autoFocus={index === 0}
          caretHidden
        />
      ))}
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PhoneVerifyModal({
  visible,
  initialPhone = "",
  onSuccess,
  onClose,
  mandatory = false,
  onSkip,
  onVerified,
}: PhoneVerifyModalProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);

  const recaptchaRef =
    useRef<import("firebase/auth").ApplicationVerifier>(null);
  const confirmationRef = useRef<Awaited<
    ReturnType<typeof sendPhoneCode>
  > | null>(null);
  const otpRefs = useRef<Array<TextInput | null>>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(320)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Swipe-to-dismiss
  const panY = useRef(new Animated.Value(0)).current;

  // Refs espelho para evitar stale closures no PanResponder
  const stepRef = useRef<Step>(step);
  const mandatoryRef = useRef<boolean>(mandatory);
  const dismissRef = useRef<() => void>(() => {});

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    mandatoryRef.current = mandatory;
  }, [mandatory]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) panY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (
          (gs.dy > 100 || gs.vy > 0.5) &&
          stepRef.current !== "success" &&
          !mandatoryRef.current
        ) {
          dismissRef.current();
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  // Pre-fill phone digits from prop (strip non-digits, remove leading +55)
  useEffect(() => {
    if (visible && initialPhone) {
      let digits = initialPhone.replace(/\D/g, "");
      if (digits.startsWith("55") && digits.length > 11) {
        digits = digits.slice(2);
      }
      setPhoneRaw(digits.slice(0, 11));
    }
  }, [visible, initialPhone]);

  // Slide-up animation on open
  useEffect(() => {
    if (visible) {
      overlayAnim.setValue(0);
      slideAnim.setValue(320);
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset state when hidden
      setStep("phone");
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setIsLoading(false);
      setCountdown(60);
      confirmationRef.current = null;
      if (countdownRef.current) clearInterval(countdownRef.current);
      successScale.setValue(0);
      panY.setValue(0);
    }
  }, [visible]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step === "otp") {
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [step]);

  // Auto-submit when all 6 OTP digits are filled (WhatsApp/Instagram behavior)
  useEffect(() => {
    if (step === "otp" && otp.every((d) => d !== "") && !isLoading && !error) {
      void handleVerifyCode();
    }
  }, [otp, step, isLoading, error, handleVerifyCode]);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    panY.setValue(0);
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 320,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [overlayAnim, slideAnim, onClose, panY]);

  const handleContinueWithoutPhone = useCallback(() => {
    Keyboard.dismiss();
    panY.setValue(0);
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 320,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      void onSkip?.();
    });
  }, [overlayAnim, slideAnim, onClose, onSkip, panY]);

  useEffect(() => {
    dismissRef.current = dismiss;
  }, [dismiss]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  const handleSendCode = useCallback(async () => {
    if (phoneRaw.length !== 11 || !recaptchaRef.current) return;
    setIsLoading(true);
    setError("");
    try {
      const e164 = `+55${phoneRaw}`;
      const confirmation = await sendPhoneCode(e164, recaptchaRef.current);
      confirmationRef.current = confirmation;
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  }, [phoneRaw]);

  const handleResend = useCallback(async () => {
    if (!recaptchaRef.current) return;
    setIsLoading(true);
    setError("");
    setOtp(["", "", "", "", "", ""]);
    try {
      const e164 = `+55${phoneRaw}`;
      const confirmation = await sendPhoneCode(e164, recaptchaRef.current);
      confirmationRef.current = confirmation;
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  }, [phoneRaw]);

  const handleVerifyCode = useCallback(async () => {
    const code = otp.join("");
    if (code.length !== 6 || !confirmationRef.current) return;
    setIsLoading(true);
    setError("");
    try {
      const e164 = `+55${phoneRaw}`;

      if (onVerified) {
        // Modo cadastro: confirm() cria usuário phone-auth temporário, parent finaliza o registro
        await confirmationRef.current.confirm(code);
        await onVerified(e164);
      } else {
        // Modo perfil: vincula/atualiza telefone na conta existente
        const verificationId = confirmationRef.current.verificationId;
        const updatedUser = await linkPhoneWithCode(verificationId, code, e164);
        setStep("success");
        Animated.spring(successScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          onSuccess(updatedUser);
          onClose();
        }, 1500);
        return;
      }

      setStep("success");
      Animated.spring(successScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      shake();
      setError(mapFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  }, [otp, phoneRaw, onVerified, shake, successScale, onSuccess, onClose]);

  const handleOtpChange = useCallback(
    (text: string, index: number) => {
      setError(""); // clear stale error on any keystroke so auto-submit can re-fire
      // Handle paste / iOS oneTimeCode auto-fill (full 6-digit string)
      if (text.length === 6 && /^\d{6}$/.test(text)) {
        const filled = text.split("");
        setOtp(filled);
        otpRefs.current[5]?.focus();
        return;
      }
      const digit = text.replace(/\D/g, "").slice(-1);
      const next = [...otp];
      next[index] = digit;
      setOtp(next);
      if (digit && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    },
    [otp],
  );

  const handleOtpKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === "Backspace" && !otp[index] && index > 0) {
        const next = [...otp];
        next[index - 1] = "";
        setOtp(next);
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const handlePhoneInput = useCallback((text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    setPhoneRaw(digits);
    setError("");
  }, []);

  const formattedPhone = formatBRPhone(phoneRaw);
  const maskedDisplay = `+55 ${formattedPhone}`;
  const canSend = phoneRaw.length === 11 && !isLoading;
  const canVerify = otp.join("").length === 6 && !isLoading;
  const countdownDisplay = `${String(Math.floor(countdown / 60)).padStart(2, "0")}:${String(countdown % 60).padStart(2, "0")}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (step !== "success" && !mandatory) dismiss();
      }}
    >
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={firebaseApp.options}
        attemptInvisibleVerification
        title="Verificação de segurança"
        cancelLabel="Cancelar"
      />

      <View style={styles.root}>
        {/* Overlay — fora do KAV para sempre cobrir a tela toda */}
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              Keyboard.dismiss();
              if (step !== "success" && !mandatory) dismiss();
            }}
            activeOpacity={1}
          />
        </Animated.View>

        {/* KAV apenas para o card — behavior=padding em ambas as plataformas */}
        <KeyboardAvoidingView
          style={styles.kavContainer}
          behavior="padding"
          pointerEvents="box-none"
        >
          {/* Spacer transparente empurra o card para o fundo */}
          <View style={{ flex: 1 }} pointerEvents="none" />

          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              { transform: [{ translateY: Animated.add(slideAnim, panY) }] },
            ]}
          >
            {/* Header: handle + botão X */}
            <View style={styles.cardHeader}>
              <View
                style={styles.handle}
                hitSlop={{ top: 20, bottom: 20, left: 80, right: 80 }}
                {...panResponder.panHandlers}
              />
              {step !== "success" && !mandatory && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={dismiss}
                  hitSlop={12}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Phone Step ── */}
            {step === "phone" && (
              <>
                <View style={styles.iconWrap}>
                  <MaterialIcons
                    name="phone-iphone"
                    size={30}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.title}>Verificar número</Text>
                <Text style={styles.subtitle}>
                  Enviaremos um SMS com um código de 6 dígitos para confirmar
                  seu número.
                </Text>

                <View style={styles.phoneRow}>
                  <View style={styles.ddiChip}>
                    <Text style={styles.ddiText}>🇧🇷 +55</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={formattedPhone}
                    onChangeText={handlePhoneInput}
                    placeholder="(11) 99999-8888"
                    placeholderTextColor={colors.subtext}
                    keyboardType="phone-pad"
                    selectionColor={colors.primary}
                  />
                </View>

                {!!error && (
                  <View style={styles.errorRow}>
                    <MaterialIcons
                      name="error-outline"
                      size={14}
                      color={colors.danger}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    !canSend && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleSendCode}
                  disabled={!canSend}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <Text style={styles.primaryBtnText}>Enviando...</Text>
                  ) : (
                    <Text style={styles.primaryBtnText}>Continuar</Text>
                  )}
                </TouchableOpacity>

                {!!onSkip && !mandatory && (
                  <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={handleContinueWithoutPhone}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.skipBtnText}>
                      Continuar sem telefone
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ── OTP Step ── */}
            {step === "otp" && (
              <>
                <View style={styles.iconWrap}>
                  <MaterialIcons name="sms" size={30} color={colors.primary} />
                </View>
                <Text style={styles.title}>Digite o código</Text>
                <Text style={styles.subtitle}>
                  Enviamos um SMS para{"\n"}
                  <Text style={{ fontWeight: "700", color: colors.text }}>
                    {maskedDisplay}
                  </Text>
                </Text>

                <OtpInput
                  otp={otp}
                  inputRefs={otpRefs}
                  shakeAnim={shakeAnim}
                  hasError={!!error}
                  onChange={handleOtpChange}
                  onKeyPress={handleOtpKeyPress}
                />

                {!!error && (
                  <View style={styles.errorRow}>
                    <MaterialIcons
                      name="error-outline"
                      size={14}
                      color={colors.danger}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    !canVerify && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleVerifyCode}
                  disabled={!canVerify}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <Text style={styles.primaryBtnText}>Verificando...</Text>
                  ) : (
                    <Text style={styles.primaryBtnText}>Verificar</Text>
                  )}
                </TouchableOpacity>

                {countdown > 0 ? (
                  <Text style={styles.resendTimer}>
                    Reenviar código em{" "}
                    <Text style={{ fontWeight: "700" }}>
                      {countdownDisplay}
                    </Text>
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resendLink}>
                      Não recebi o código. Reenviar
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setStep("phone");
                    setError("");
                    setOtp(["", "", "", "", "", ""]);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backBtnText}>Alterar número</Text>
                </TouchableOpacity>

                {!!onSkip && !mandatory && (
                  <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={handleContinueWithoutPhone}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.skipBtnText}>Verificar depois</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ── Success Step ── */}
            {step === "success" && (
              <>
                <Animated.View
                  style={[
                    styles.successIcon,
                    { transform: [{ scale: successScale }] },
                  ]}
                >
                  <MaterialIcons
                    name="check-circle"
                    size={64}
                    color={colors.success}
                  />
                </Animated.View>
                <Text style={styles.title}>Número verificado!</Text>
                <Text style={styles.subtitle}>
                  Seu número foi verificado com sucesso.
                </Text>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  kavContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    paddingHorizontal: spacing[24],
    paddingTop: spacing[12],
    paddingBottom: Platform.OS === "ios" ? spacing[40] : spacing[32],
    alignItems: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: spacing[24],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: -6,
    padding: spacing[4],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[16],
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing[24],
    paddingHorizontal: spacing[8],
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: spacing[8],
  },
  ddiChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    marginRight: spacing[8],
  },
  ddiText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[16],
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: spacing[12],
    gap: spacing[4],
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[8],
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  otpRow: {
    flexDirection: "row",
    gap: spacing[8],
    marginBottom: spacing[8],
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.tintBlue,
  },
  otpBoxError: {
    borderColor: colors.danger,
    backgroundColor: "#FEF2F2",
  },
  resendTimer: {
    marginTop: spacing[16],
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  resendLink: {
    marginTop: spacing[16],
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  backBtn: {
    marginTop: spacing[12],
    paddingVertical: spacing[8],
  },
  backBtnText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  skipBtn: {
    marginTop: spacing[14],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
  },
  skipBtnText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.1,
  },
  successIcon: {
    marginBottom: spacing[16],
    marginTop: spacing[8],
  },
});
