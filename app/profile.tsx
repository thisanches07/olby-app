import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

import { PhoneVerifyModal } from "@/components/phone-verify-modal";
import { useSubscription } from "@/contexts/subscription-context";
import { useAccountDeletion } from "@/hooks/use-account-deletion";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/services/api";
import { unlinkPhone } from "@/services/auth.service";
import { firebaseAuth } from "@/services/firebase";
import { getStatusBadge } from "@/services/subscription.service";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "@/utils/legal";

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
              <Text style={sheet.confirmText}>{localConfig?.confirmLabel}</Text>
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
                style={[styles.rowValue, !editable && styles.rowValueReadonly]}
                numberOfLines={1}
              >
                {value || "—"}
              </Text>
              {!!badge && !isEditing && badge}
            </>
          )}
        </View>
        {!editable && (
          <MaterialIcons name="lock-outline" size={14} color={colors.subtext} />
        )}
        {editable && isEditing && (
          <MaterialIcons
            name="edit"
            size={14}
            color={error ? colors.danger : colors.primary}
          />
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

// ─── Phone Row ───────────────────────────────────────────────────────────────

function PhoneRow({
  phone,
  phoneVerifiedAt,
  isEditing,
  isEmailUser,
  onAdd,
  onEdit,
  onRemove,
}: {
  phone: string;
  phoneVerifiedAt: string | null;
  isEditing: boolean;
  isEmailUser: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const hasPhone = !!phone;
  const isVerified = !!phoneVerifiedAt;

  return (
    <View style={[styles.infoRowWrap, styles.rowBorder]}>
      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <MaterialIcons name="phone" size={18} color={colors.primary} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>Telefone</Text>
          <Text
            style={[styles.rowValue, !hasPhone && styles.rowValueReadonly]}
            numberOfLines={1}
          >
            {phone || "Não informado"}
          </Text>
          {!isEditing && (
            <View style={styles.phoneActions}>
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons
                    name="verified"
                    size={11}
                    color={colors.success}
                  />
                  <Text style={styles.verifiedText}>Verificado</Text>
                </View>
              )}
              {hasPhone ? (
                <>
                  <TouchableOpacity
                    style={styles.phoneChip}
                    onPress={onEdit}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.phoneChipText}>
                      {isVerified ? "Alterar" : "Verificar"}
                    </Text>
                  </TouchableOpacity>
                  {!isEmailUser && (
                    <TouchableOpacity
                      style={[styles.phoneChip, styles.phoneChipDanger]}
                      onPress={onRemove}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.phoneChipText,
                          styles.phoneChipTextDanger,
                        ]}
                      >
                        Remover
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={styles.phoneChip}
                  onPress={onAdd}
                  activeOpacity={0.7}
                >
                  <Text style={styles.phoneChipText}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
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
        <Text style={[styles.actionLabel, { color: labelColor }]}>{label}</Text>
        {sublabel && <Text style={styles.actionSublabel}>{sublabel}</Text>}
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.subtext} />
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, signOut, emailVerified, refreshUser, sendVerificationEmail } =
    useAuth();
  const { plan } = useSubscription();
  const accountDeletion = useAccountDeletion();

  const isGoogleUser =
    user?.providerData?.some((p) => p.providerId === "google.com") ?? false;

  const subBadge = getStatusBadge(plan?.subscriptionStatus ?? null);
  const subSublabel = plan ? `${plan.name} · ${subBadge.label}` : "Gratuito";

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
  const [isSendingVerificationEmail, setIsSendingVerificationEmail] =
    useState(false);
  const [isRefreshingEmailVerification, setIsRefreshingEmailVerification] =
    useState(false);

  const saveBarAnim = useRef(new Animated.Value(0)).current;
  const modalOverlayOpacityAnim = useRef(new Animated.Value(0)).current;
  const modalCardScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalCardOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    api
      .get<{ phone?: string | null; phoneVerifiedAt?: string | null }>(
        "/users/me",
      )
      .then((u) => {
        if (u.phone) {
          setPhone(u.phone);
          setPhone(u.phone);
        }
        setPhoneVerifiedAt(u.phoneVerifiedAt ?? null);
      })
      .catch(() => {});
  }, []);

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
        await firebaseUser.updateProfile({ displayName: trimmedName });
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

  /**
   * Monitora o estado do fluxo de deleção de conta e gerencia as modais
   */
  useEffect(() => {
    if (accountDeletion.errorMessage) {
      showToast(accountDeletion.errorMessage, "error");
      return;
    }

    switch (accountDeletion.modalState) {
      case "no-subscription": {
        // CENÁRIO A: SEM subscrição - modal de confirmação normal
        setSheetConfig({
          icon: "delete-forever",
          iconBg: "#FEE2E2",
          iconColor: colors.danger,
          title: "Excluir conta",
          description:
            "Esta ação é permanente e não pode ser desfeita. Todos os seus dados, projetos e arquivos serão removidos.",
          confirmLabel: "Excluir minha conta",
          confirmBg: colors.danger,
          onConfirm: accountDeletion.confirmDeletion,
        });
        break;
      }
      case "has-subscription": {
        // CENÁRIO B: COM subscrição - modal bloqueante
        // (não vamos usar a ConfirmSheet padrão para este caso, criar uma modal customizada abaixo)
        break;
      }
      case "checking":
      case "deleting": {
        // Estados de carregamento - não fazer nada, já estar na modal anterior
        break;
      }
      case null: {
        // Modal fechada
        break;
      }
    }
  }, [accountDeletion.modalState, accountDeletion.errorMessage, showToast]);

  /**
   * Anima o modal premium quando aparece
   */
  useEffect(() => {
    if (accountDeletion.modalState === "has-subscription") {
      modalOverlayOpacityAnim.setValue(0);
      modalCardScaleAnim.setValue(0.9);
      modalCardOpacityAnim.setValue(0);

      Animated.parallel([
        Animated.timing(modalOverlayOpacityAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.spring(modalCardScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 11,
        }),
        Animated.timing(modalCardOpacityAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalOverlayOpacityAnim.setValue(0);
      modalCardScaleAnim.setValue(0.9);
      modalCardOpacityAnim.setValue(0);
    }
  }, [
    accountDeletion.modalState,
    modalOverlayOpacityAnim,
    modalCardScaleAnim,
    modalCardOpacityAnim,
  ]);

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
      successMessage:
        "E-mail de redefinição enviado! Verifique sua caixa de entrada.",
      onConfirm: async () => {
        await firebaseAuth.sendPasswordResetEmail(email);
      },
    });
  }, [user?.email]);

  const handleDeleteAccount = useCallback(() => {
    accountDeletion.startDeletion();
  }, [accountDeletion]);

  const handleSendVerificationEmail = useCallback(async () => {
    setIsSendingVerificationEmail(true);
    try {
      await sendVerificationEmail();
      showToast(
        "Link de verificação enviado. Confira sua caixa de entrada.",
        "success",
      );
    } catch {
      showToast("Nao foi possivel enviar o e-mail de verificacao.", "error");
    } finally {
      setIsSendingVerificationEmail(false);
    }
  }, [sendVerificationEmail, showToast]);

  const handleRefreshEmailVerification = useCallback(async () => {
    setIsRefreshingEmailVerification(true);
    try {
      await refreshUser();
      showToast(
        firebaseAuth.currentUser?.emailVerified
          ? "E-mail verificado com sucesso."
          : "Seu e-mail ainda nao foi verificado.",
        firebaseAuth.currentUser?.emailVerified ? "success" : "error",
      );
    } catch {
      showToast("Nao foi possivel atualizar o status do e-mail.", "error");
    } finally {
      setIsRefreshingEmailVerification(false);
    }
  }, [refreshUser, showToast]);

  const handleRemovePhone = useCallback(() => {
    setSheetConfig({
      icon: "phone-disabled",
      iconBg: "#FEE2E2",
      iconColor: colors.danger,
      title: "Remover celular",
      description:
        "Seu número será desvinculado da conta. Você poderá adicionar outro número depois.",
      confirmLabel: "Remover número",
      confirmBg: colors.danger,
      successMessage: "Número removido com sucesso.",
      onConfirm: async () => {
        await unlinkPhone();
        setPhone("");
        setPhoneVerifiedAt(null);
      },
    });
  }, []);

  const initials = getInitials(user?.displayName ?? name, user?.email ?? null);
  const photoUrl = user?.photoURL ?? null;
  const [avatarImageError, setAvatarImageError] = useState(false);
  const isEmailPasswordUser =
    user?.providerData?.some((p) => p.providerId === "password") ?? false;
  const shouldShowEmailVerificationCard =
    !!user?.email && isEmailPasswordUser && !emailVerified;

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
              {isEditing && (
                <View style={styles.avatarEditBadge}>
                  <MaterialIcons name="edit" size={12} color={colors.white} />
                </View>
              )}
            </View>
            <Text style={styles.heroName}>{name || "Usuário"}</Text>
            {user?.email ? (
              <Text style={styles.heroSub}>{user.email}</Text>
            ) : null}
          </View>

          {shouldShowEmailVerificationCard ? (
            <View style={styles.emailVerifyCard}>
              <View style={styles.emailVerifyGlow} />
              <View style={styles.emailVerifyBadge}>
                <MaterialIcons
                  name="verified-user"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.emailVerifyBadgeText}>Seguranca da conta</Text>
              </View>

              <View style={styles.emailVerifyHeader}>
                <View style={styles.emailVerifyIconWrap}>
                  <MaterialIcons
                    name="mark-email-unread"
                    size={20}
                    color={colors.white}
                  />
                </View>
                <View style={styles.emailVerifyCopy}>
                  <Text style={styles.emailVerifyTitle}>
                    Confirme seu e-mail principal
                  </Text>
                  <Text style={styles.emailVerifyText}>
                    Proteja o acesso a sua conta e mantenha a recuperacao de
                    senha sem friccao.
                  </Text>
                </View>
              </View>

              <View style={styles.emailVerifyEmailPill}>
                <MaterialIcons
                  name="alternate-email"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.emailVerifyEmailText} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>

              <View style={styles.emailVerifyHintRow}>
                <MaterialIcons
                  name="info-outline"
                  size={14}
                  color={colors.textMuted}
                />
                <Text style={styles.emailVerifyHintText}>
                  O link abre fora do app. Volte aqui depois para atualizar o
                  status.
                </Text>
              </View>

              <View style={styles.emailVerifyActions}>
                <TouchableOpacity
                  style={styles.emailVerifyPrimaryBtn}
                  onPress={handleSendVerificationEmail}
                  activeOpacity={0.8}
                  disabled={
                    isSendingVerificationEmail || isRefreshingEmailVerification
                  }
                >
                  {isSendingVerificationEmail ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.emailVerifyPrimaryText}>
                      Enviar link de verificacao
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.emailVerifySecondaryBtn}
                  onPress={handleRefreshEmailVerification}
                  activeOpacity={0.8}
                  disabled={
                    isSendingVerificationEmail || isRefreshingEmailVerification
                  }
                >
                  {isRefreshingEmailVerification ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.emailVerifySecondaryText}>
                      Ja confirmei meu e-mail
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

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
            <PhoneRow
              phone={phone}
              phoneVerifiedAt={phoneVerifiedAt}
              isEditing={isEditing}
              isEmailUser={
                isGoogleUser === false &&
                (user?.providerData?.some((p) => p.providerId === "password") ??
                  false)
              }
              onAdd={() => setShowPhoneVerify(true)}
              onEdit={() => setShowPhoneVerify(true)}
              onRemove={handleRemovePhone}
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
                <View
                  style={[
                    styles.actionIconWrap,
                    { backgroundColor: "#F0FDF4" },
                  ]}
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                </View>
                <View style={styles.rowContent}>
                  <Text
                    style={[styles.actionLabel, { color: colors.textMuted }]}
                  >
                    Trocar senha
                  </Text>
                  <Text style={styles.actionSublabel}>
                    Conta gerenciada pelo Google
                  </Text>
                </View>
                <MaterialIcons
                  name="info-outline"
                  size={16}
                  color={colors.textMuted}
                />
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

      {/* Account Deletion - Has Subscription Modal (Cenário B) */}
      <Modal
        visible={accountDeletion.modalState === "has-subscription"}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => accountDeletion.closeModal()}
      >
        <Animated.View
          style={[
            styles.premiumModalOverlay,
            { opacity: modalOverlayOpacityAnim },
          ]}
        >
          <TouchableOpacity
            style={styles.premiumModalBackdrop}
            activeOpacity={1}
            onPress={() => accountDeletion.closeModal()}
          />

          <Animated.View
            style={[
              styles.premiumSubscriptionCard,
              {
                opacity: modalCardOpacityAnim,
                transform: [
                  {
                    scale: modalCardScaleAnim,
                  },
                ],
              },
            ]}
          >
            {/* Header Background */}
            <View style={styles.cardHeaderBg} />

            {/* Icon Container */}
            <View style={styles.premiumIconContainer}>
              <View style={styles.premiumIconInner}>
                <MaterialIcons
                  name="workspace-premium"
                  size={40}
                  color="#FFFFFF"
                />
              </View>
            </View>

            {/* Content */}
            <View style={styles.premiumCardContent}>
              <Text style={styles.premiumModalTitle}>Assinatura Ativa</Text>

              <Text style={styles.premiumModalSubtitle}>
                Você possui um plano ativo. Cancele antes de deletar a conta.
              </Text>

              {/* Premium Period Info */}
              {accountDeletion.subscriptionStatus?.currentPeriodEnd && (
                <View style={styles.premiumPeriodBox}>
                  <View style={styles.premiumPeriodDot} />
                  <View style={styles.premiumPeriodContent}>
                    <Text style={styles.premiumPeriodLabel}>Acesso até</Text>
                    <Text style={styles.premiumPeriodDate}>
                      {new Date(
                        accountDeletion.subscriptionStatus.currentPeriodEnd,
                      ).toLocaleDateString("pt-BR", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Provider Info */}
              {accountDeletion.subscriptionStatus?.provider && (
                <View style={styles.premiumProviderChip}>
                  <MaterialIcons
                    name="verified"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.premiumProviderText}>
                    Gerenciado por {accountDeletion.subscriptionStatus.provider}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.premiumButtonGroup}>
              <TouchableOpacity
                style={styles.premiumButtonPrimary}
                onPress={() => {
                  accountDeletion.closeModal();
                  router.push("/subscription/my-plan");
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="settings"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.premiumButtonPrimaryText}>
                  Gerenciar Assinatura
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.premiumButtonSecondary}
                onPress={accountDeletion.retryAfterCancellation}
                activeOpacity={0.7}
              >
                <Text style={styles.premiumButtonSecondaryText}>
                  Já Cancelei, Tentar Novamente
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.premiumDivider} />

            {/* Footer Text */}
            <TouchableOpacity
              onPress={() => accountDeletion.closeModal()}
              activeOpacity={0.7}
            >
              <Text style={styles.premiumFooterText}>Voltar para o Perfil</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Phone Verify Modal */}
      <PhoneVerifyModal
        visible={showPhoneVerify}
        initialPhone={phone}
        onSuccess={(updatedUser) => {
          if (updatedUser?.phone) setPhone(updatedUser.phone);
          setPhoneVerifiedAt(
            updatedUser?.phoneVerifiedAt ?? new Date().toISOString(),
          );
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
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[14],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
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
  emailVerifyCard: {
    marginHorizontal: spacing[16],
    marginTop: spacing[6],
    padding: spacing[18],
    borderRadius: radius["2xl"],
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#D7E6FF",
    gap: spacing[16],
    ...shadow(2),
  },
  emailVerifyGlow: {
    position: "absolute",
    top: -28,
    right: -24,
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  emailVerifyBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    paddingHorizontal: spacing[10],
    paddingVertical: spacing[6],
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.12)",
  },
  emailVerifyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.2,
  },
  emailVerifyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
  },
  emailVerifyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    ...shadow(1),
  },
  emailVerifyCopy: {
    flex: 1,
    gap: spacing[5],
  },
  emailVerifyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  emailVerifyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  emailVerifyEmailPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#D9E4F5",
    paddingHorizontal: spacing[14],
  },
  emailVerifyEmailText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  emailVerifyHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[8],
  },
  emailVerifyHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  emailVerifyActions: {
    gap: spacing[10],
  },
  emailVerifyPrimaryBtn: {
    minHeight: 50,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[16],
    ...shadow(1),
  },
  emailVerifyPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.1,
  },
  emailVerifySecondaryBtn: {
    minHeight: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[12],
  },
  emailVerifySecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: -0.1,
  },
  sectionHeader: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[28],
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
  phoneActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  phoneChip: {
    paddingHorizontal: spacing[10],
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.tintBlue,
  },
  phoneChipDanger: {
    backgroundColor: "#FEE2E2",
  },
  phoneChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  phoneChipTextDanger: {
    color: colors.danger,
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

  // ─── Premium Account Deletion Modal ──────────────────────────────────────

  premiumModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.56)",
    alignItems: "center",
    justifyContent: "center",
  },

  premiumModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  premiumSubscriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius["2xl"],
    marginHorizontal: spacing[20],
    maxWidth: "90%",
    overflow: "hidden",
    ...shadow(4),
  },

  cardHeaderBg: {
    height: 96,
    backgroundColor: colors.primary,
    opacity: 0.08,
  },

  premiumIconContainer: {
    position: "absolute",
    top: 24,
    left: "50%",
    marginLeft: -44,
    width: 88,
    height: 88,
    zIndex: 10,
  },

  premiumIconInner: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(3),
    borderWidth: 3,
    borderColor: colors.surface,
  },

  premiumCardContent: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[64],
    paddingBottom: spacing[24],
    alignItems: "center",
  },

  premiumModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: spacing[8],
  },

  premiumModalSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing[24],
  },

  premiumPeriodBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    backgroundColor: colors.tintBlue,
    paddingVertical: spacing[14],
    paddingHorizontal: spacing[16],
    borderRadius: radius.lg,
    marginBottom: spacing[16],
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },

  premiumPeriodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },

  premiumPeriodContent: {
    flex: 1,
  },

  premiumPeriodLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  premiumPeriodDate: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },

  premiumProviderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    backgroundColor: "rgba(59, 130, 246, 0.06)",
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[10],
    borderRadius: radius.pill,
    marginBottom: spacing[4],
  },

  premiumProviderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },

  premiumButtonGroup: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[8],
    paddingBottom: spacing[20],
    gap: spacing[10],
  },

  premiumButtonPrimary: {
    width: "100%",
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...shadow(2),
  },

  premiumButtonPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },

  premiumButtonSecondary: {
    width: "100%",
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "rgba(59, 130, 246, 0.04)",
  },

  premiumButtonSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },

  premiumDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing[24],
  },

  premiumFooterText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing[14],
  },
});
