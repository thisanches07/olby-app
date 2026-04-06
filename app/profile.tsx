import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  deleteUser,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/contexts/subscription-context";
import { getStatusBadge } from "@/services/subscription.service";
import { api } from "@/services/api";
import { type BackendUser } from "@/services/auth.service";
import { firebaseAuth } from "@/services/firebase";
import { PhoneVerifyModal } from "@/components/phone-verify-modal";
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "@/utils/legal";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

// ─── Types ───────────────────────────────────────────────────────────────────

type SheetConfig = {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  confirmLabel: string;
  confirmBg: string;
  successMessage?: string;
  onConfirm: () => Promise<void>;
};

type ToastState = {
  message: string;
  type: "success" | "error";
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function getFirstName(displayName: string | null): string {
  if (!displayName) return "";
  return displayName.trim().split(" ")[0];
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({
  state,
  onHide,
}: {
  state: ToastState | null;
  onHide: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    anim.setValue(0);

    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 11,
    }).start();

    timerRef.current = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(onHide);
    }, 3200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state]);

  if (!state) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const isSuccess = state.type === "success";

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY }],
          opacity: anim,
          backgroundColor: isSuccess ? "#166534" : "#991B1B",
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.toastIconWrap,
          { backgroundColor: isSuccess ? "#15803D" : "#B91C1C" },
        ]}
      >
        <MaterialIcons
          name={isSuccess ? "check" : "error-outline"}
          size={16}
          color={colors.white}
        />
      </View>
      <Text style={styles.toastText} numberOfLines={2}>
        {state.message}
      </Text>
    </Animated.View>
  );
}

// ─── Confirm Sheet ────────────────────────────────────────────────────────────

function ConfirmSheet({
  config,
  onClose,
  onError,
  onSuccess,
}: {
  config: SheetConfig | null;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message?: string) => void;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localConfig, setLocalConfig] = useState<SheetConfig | null>(null);

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(320)).current;

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setModalVisible(true);
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
    }
  }, [config]);

  const dismiss = useCallback(
    (callback?: () => void) => {
      if (loading) return;
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
        setModalVisible(false);
        callback?.();
        onClose();
      });
    },
    [loading, overlayAnim, slideAnim, onClose],
  );

  const handleConfirm = useCallback(async () => {
    if (!localConfig) return;
    setLoading(true);
    try {
      await localConfig.onConfirm();
      dismiss(() => onSuccess(localConfig.successMessage));
    } catch {
      onError("Nao foi possivel concluir esta operacao.");
    } finally {
      setLoading(false);
    }
  }, [localConfig, dismiss, onSuccess, onError]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss()}
    >
      <View style={sheet.root}>
        {/* Overlay */}
        <Animated.View
          style={[sheet.overlay, { opacity: overlayAnim }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => dismiss()}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Card */}
        <Animated.View
          style={[sheet.card, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={sheet.handle} />

          <View
            style={[
              sheet.iconWrap,
              { backgroundColor: localConfig?.iconBg ?? colors.tintBlue },
            ]}
          >
            <MaterialIcons
              name={localConfig?.icon ?? "info"}
              size={30}
              color={localConfig?.iconColor ?? colors.primary}
            />
          </View>

          <Text style={sheet.title}>{localConfig?.title}</Text>
          <Text style={sheet.description}>{localConfig?.description}</Text>

          <TouchableOpacity
            style={[
              sheet.confirmBtn,
              { backgroundColor: localConfig?.confirmBg ?? colors.primary },
              loading && sheet.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={sheet.confirmText}>
                {localConfig?.confirmLabel}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={sheet.cancelBtn}
            onPress={() => dismiss()}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Text style={sheet.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Info Row ────────────────────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
  editable?: boolean;
  isEditing: boolean;
  error?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  isLast?: boolean;
  badge?: React.ReactNode;
}

function InfoRow({
  icon,
  label,
  value,
  editable = false,
  isEditing,
  error,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "words",
  isLast = false,
  badge,
}: InfoRowProps) {
  const showInput = editable && isEditing;

  return (
    <View style={[styles.infoRowWrap, !isLast && styles.rowBorder]}>
      <View style={styles.infoRow}>
        <View
          style={[
            styles.infoIconWrap,
            error ? { backgroundColor: "#FEE2E2" } : {},
          ]}
        >
          <MaterialIcons
            name={icon}
            size={18}
            color={error ? colors.danger : colors.primary}
          />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>{label}</Text>
          {showInput ? (
            <TextInput
              style={[styles.infoInput, error && styles.infoInputError]}
              value={value}
              onChangeText={onChangeText}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={false}
              placeholderTextColor={colors.subtext}
              selectionColor={colors.primary}
            />
          ) : (
            <>
              <Text
                style={[
                  styles.rowValue,
                  !editable && styles.rowValueReadonly,
                ]}
                numberOfLines={1}
              >
                {value || "—"}
              </Text>
              {!!badge && !isEditing && badge}
            </>
          )}
        </View>
        {!editable && (
          <MaterialIcons
            name="lock-outline"
            size={14}
            color={colors.subtext}
          />
        )}
        {editable && isEditing && (
          <MaterialIcons name="edit" size={14} color={error ? colors.danger : colors.primary} />
        )}
      </View>
      {!!error && (
        <View style={styles.infoErrorRow}>
          <MaterialIcons name="error-outline" size={13} color={colors.danger} />
          <Text style={styles.infoErrorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Action Row ──────────────────────────────────────────────────────────────

function ActionRow({
  icon,
  iconBg,
  iconColor,
  label,
  sublabel,
  onPress,
  isLast = false,
  labelColor = colors.text,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  isLast?: boolean;
  labelColor?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionRow, !isLast && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.actionLabel, { color: labelColor }]}>
          {label}
        </Text>
        {sublabel && <Text style={styles.actionSublabel}>{sublabel}</Text>}
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.subtext} />
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { plan } = useSubscription();

  const isGoogleUser = user?.providerData?.some(
    (p) => p.providerId === "google.com",
  ) ?? false;

  const subBadge = getStatusBadge(plan?.subscriptionStatus ?? null);
  const subSublabel = plan
    ? `${plan.name} · ${subBadge.label}`
    : "Gratuito";

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState(user?.phoneNumber ?? "");
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [showPhoneVerify, setShowPhoneVerify] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [nameError, setNameError] = useState("");

  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);

  useEffect(() => {
    api.get<{ phone?: string | null; phoneVerifiedAt?: string | null }>("/users/me")
      .then((u) => {
        if (u.phone) {
          setPhone(u.phone);
          setPhone(u.phone);
        }
        setPhoneVerifiedAt(u.phoneVerifiedAt ?? null);
      })
      .catch(() => {});
  }, []);

  const saveBarAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToastState({ message, type });
  }, []);

  const enterEdit = useCallback(() => {
    setDraftName(name);
    setNameError("");
    setIsEditing(true);
    Animated.spring(saveBarAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [name, phone, saveBarAnim]);

  const cancelEdit = useCallback(() => {
    setDraftName(name);
    setNameError("");
    Animated.timing(saveBarAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setIsEditing(false));
  }, [name, phone, saveBarAnim]);

  const saveChanges = useCallback(async () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      setNameError("O nome não pode estar vazio.");
      return;
    }
    setNameError("");
    setIsSaving(true);
    try {
      const firebaseUser = firebaseAuth.currentUser;
      if (firebaseUser && trimmedName !== name) {
        await updateProfile(firebaseUser, { displayName: trimmedName });
      }
      if (trimmedName !== name) {
        await api.patch("/users/me", { name: trimmedName });
      }
      setName(trimmedName);
      Animated.timing(saveBarAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setIsEditing(false));
      showToast("Perfil atualizado com sucesso!", "success");
    } catch {
      showToast("Erro ao salvar alteracoes.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [draftName, name, saveBarAnim, showToast]);

  const handleLogout = useCallback(() => {
    setSheetConfig({
      icon: "logout",
      iconBg: "#FEF3C7",
      iconColor: "#B45309",
      title: "Sair da conta",
      description: "Tem certeza que deseja encerrar sua sessão?",
      confirmLabel: "Sair",
      confirmBg: "#B45309",
      onConfirm: async () => {
        await signOut();
      },
    });
  }, [signOut]);

  const handleChangePassword = useCallback(() => {
    const email = user?.email;
    if (!email) return;
    setSheetConfig({
      icon: "lock-reset",
      iconBg: colors.tintBlue,
      iconColor: colors.primary,
      title: "Redefinir senha",
      description: `Enviaremos um link de redefinição para:\n\n${email}`,
      confirmLabel: "Enviar link",
      confirmBg: colors.primary,
      successMessage: "E-mail de redefinição enviado! Verifique sua caixa de entrada.",
      onConfirm: async () => {
        await sendPasswordResetEmail(firebaseAuth, email);
      },
    });
  }, [user?.email]);

  const handleDeleteAccount = useCallback(() => {
    setSheetConfig({
      icon: "delete-forever",
      iconBg: "#FEE2E2",
      iconColor: colors.danger,
      title: "Excluir conta",
      description:
        "Esta ação é permanente e não pode ser desfeita. Todos os seus dados serão removidos.",
      confirmLabel: "Excluir minha conta",
      confirmBg: colors.danger,
      onConfirm: async () => {
        const fbUser = firebaseAuth.currentUser;
        if (!fbUser) throw new Error("Usuário não encontrado.");
        try {
          await deleteUser(fbUser);
        } catch (err: unknown) {
          const code =
            err && typeof err === "object" && "code" in err
              ? (err as { code: string }).code
              : null;
          if (code === "auth/requires-recent-login") {
            throw new Error(
              "Por segurança, saia da conta e entre novamente antes de excluir.",
            );
          }
          throw err;
        }
      },
    });
  }, []);

  const initials = getInitials(user?.displayName ?? name, user?.email ?? null);
  const firstName = getFirstName(user?.displayName ?? name);
  const photoUrl = user?.photoURL ?? null;
  const [avatarImageError, setAvatarImageError] = useState(false);

  const saveBarTranslate = saveBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  useEffect(() => {
    setAvatarImageError(false);
  }, [photoUrl]);

  const openPrivacy = useCallback(() => {
    void Linking.openURL(PRIVACY_POLICY_URL);
  }, []);

  const openTerms = useCallback(() => {
    void Linking.openURL(TERMS_OF_USE_URL);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="light" />

      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>

        <Text style={styles.navTitle}>Perfil</Text>

        <TouchableOpacity
          style={styles.navButton}
          onPress={isEditing ? cancelEdit : enterEdit}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          <Text style={styles.navAction}>
            {isEditing ? "Cancelar" : "Editar"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                {photoUrl && !avatarImageError ? (
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.avatarImage}
                    onError={() => setAvatarImageError(true)}
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
            </View>
            <Text style={styles.heroName}>{name || "Usuário"}</Text>
            {user?.email ? (
              <Text style={styles.heroSub}>{user.email}</Text>
            ) : null}
          </View>

          {/* Informações */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informações Pessoais</Text>
          </View>
          <View style={styles.card}>
            <InfoRow
              icon="person-outline"
              label="Nome completo"
              value={isEditing ? draftName : name}
              editable
              isEditing={isEditing}
              error={nameError}
              onChangeText={(t) => {
                setDraftName(t);
                if (nameError) setNameError("");
              }}
              autoCapitalize="words"
            />
            <InfoRow
              icon="phone"
              label="Telefone"
              value={phone}
              editable={false}
              isEditing={isEditing}
              keyboardType="phone-pad"
              autoCapitalize="none"
              badge={
                !isEditing ? (
                  phoneVerifiedAt ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={styles.verifiedBadge}>
                        <MaterialIcons name="verified" size={12} color={colors.success} />
                        <Text style={styles.verifiedText}>Verificado</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setShowPhoneVerify(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.verifyBtnText}>Alterar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : phone ? (
                    <TouchableOpacity
                      style={styles.verifyBtn}
                      onPress={() => setShowPhoneVerify(true)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.verifyBtnText}>Verificar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.verifyBtn}
                      onPress={() => setShowPhoneVerify(true)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.verifyBtnText}>Adicionar</Text>
                    </TouchableOpacity>
                  )
                ) : undefined
              }
            />
            <InfoRow
              icon="mail-outline"
              label="E-mail"
              value={user?.email ?? ""}
              editable={false}
              isEditing={isEditing}
              isLast
            />
          </View>

          {/* Conta */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Conta</Text>
          </View>
          <View style={styles.card}>
            <ActionRow
              icon="workspace-premium"
              iconBg="#EFF6FF"
              iconColor={colors.primary}
              label="Minha assinatura"
              sublabel={subSublabel}
              onPress={() => router.push("/subscription/my-plan")}
            />
            {isGoogleUser ? (
              <View style={[styles.actionRow, styles.rowBorder]}>
                <View style={[styles.actionIconWrap, { backgroundColor: "#F0FDF4" }]}>
                  <MaterialIcons name="lock-outline" size={18} color={colors.textMuted} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.actionLabel, { color: colors.textMuted }]}>
                    Trocar senha
                  </Text>
                  <Text style={styles.actionSublabel}>Conta gerenciada pelo Google</Text>
                </View>
                <MaterialIcons name="info-outline" size={16} color={colors.textMuted} />
              </View>
            ) : (
              <ActionRow
                icon="lock-reset"
                iconBg={colors.tintBlue}
                iconColor={colors.primary}
                label="Trocar senha"
                sublabel="Enviar link de redefinição por e-mail"
                onPress={handleChangePassword}
              />
            )}
            <ActionRow
              icon="logout"
              iconBg="#FEF3C7"
              iconColor="#B45309"
              label="Sair da conta"
              sublabel="Encerrar sessão atual"
              onPress={handleLogout}
              isLast
            />
          </View>

          {/* Zona de Perigo */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.danger }]}>
              Zona de Perigo
            </Text>
          </View>
          <View style={[styles.card, styles.dangerCard]}>
            <ActionRow
              icon="delete-forever"
              iconBg="#FEE2E2"
              iconColor={colors.danger}
              label="Excluir conta"
              sublabel="Ação permanente e irreversível"
              onPress={handleDeleteAccount}
              isLast
              labelColor={colors.danger}
            />
          </View>

          {/* Legal */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Legal</Text>
          </View>
          <View style={styles.card}>
            <ActionRow
              icon="policy"
              iconBg={colors.tintBlue}
              iconColor={colors.primary}
              label="Política de Privacidade"
              sublabel="Como tratamos seus dados no Obly App"
              onPress={openPrivacy}
            />
            <ActionRow
              icon="description"
              iconBg="#EEF2FF"
              iconColor={colors.primary}
              label="Termos de Uso"
              sublabel="Regras de uso e responsabilidades"
              onPress={openTerms}
              isLast
            />
          </View>

          <View style={styles.versionSpacer} />
          <Text style={styles.versionText}>Obly App · v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Bar */}
      <Animated.View
        style={[
          styles.saveBar,
          { transform: [{ translateY: saveBarTranslate }] },
        ]}
        pointerEvents={isEditing ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveChanges}
          activeOpacity={0.85}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <MaterialIcons
                name="check"
                size={18}
                color={colors.white}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.saveButtonText}>Salvar alterações</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Confirm Sheet */}
      <ConfirmSheet
        config={sheetConfig}
        onClose={() => setSheetConfig(null)}
        onError={(msg) => showToast(msg, "error")}
        onSuccess={(msg) => msg && showToast(msg, "success")}
      />

      {/* Toast */}
      <Toast state={toastState} onHide={() => setToastState(null)} />

      {/* Phone Verify Modal */}
      <PhoneVerifyModal
        visible={showPhoneVerify}
        initialPhone={phone}
        onSuccess={(updatedUser) => {
          if (updatedUser?.phone) setPhone(updatedUser.phone);
          setPhoneVerifiedAt(updatedUser?.phoneVerifiedAt ?? new Date().toISOString());
          showToast("Número verificado com sucesso!", "success");
        }}
        onClose={() => setShowPhoneVerify(false)}
      />
    </SafeAreaView>
  );
}

// ─── Sheet Styles ─────────────────────────────────────────────────────────────

const sheet = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    paddingHorizontal: spacing[24],
    paddingTop: spacing[12],
    paddingBottom: spacing[40],
    alignItems: "center",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing[24],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing[28],
  },
  confirmBtn: {
    width: "100%",
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[10],
    ...shadow(2),
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  cancelBtn: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  flex: {
    flex: 1,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: colors.primary,
  },
  navButton: {
    minWidth: 64,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.3,
  },
  navAction: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textAlign: "right",
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing[40],
    backgroundColor: colors.bg,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: spacing[8],
    paddingBottom: spacing[32],
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius["2xl"],
    borderBottomRightRadius: radius["2xl"],
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[14],
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  sectionHeader: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[24],
    paddingBottom: spacing[8],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  card: {
    marginHorizontal: spacing[16],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow(1),
  },
  dangerCard: {
    borderColor: "#FECACA",
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  // Info row
  infoRowWrap: {
    backgroundColor: colors.surface,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
    minHeight: 64,
    gap: spacing[12],
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.tintBlue,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  rowValueReadonly: {
    color: colors.textMuted,
  },
  infoInput: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
    padding: 0,
    margin: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  infoInputError: {
    borderBottomColor: colors.danger,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.success,
  },
  verifyBtn: {
    marginTop: 2,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.tintBlue,
    alignSelf: "flex-start",
  },
  verifyBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  infoErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing[16],
    paddingBottom: spacing[10],
  },
  infoErrorText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: "500",
  },

  // Action row
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
    minHeight: 64,
    gap: spacing[12],
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  actionSublabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Save bar
  saveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[20],
    paddingTop: spacing[12],
    paddingBottom: spacing[32],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...shadow(2, colors.primary),
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },

  // Toast
  toast: {
    position: "absolute",
    bottom: 104,
    left: spacing[16],
    right: spacing[16],
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[14],
    gap: spacing[10],
    ...shadow(2),
  },
  toastIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.white,
    lineHeight: 18,
  },

  // Version
  versionSpacer: {
    flex: 1,
    minHeight: spacing[40],
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: colors.subtext,
    paddingBottom: spacing[24],
  },
});
