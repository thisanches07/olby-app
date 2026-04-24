import { useToast } from "@/components/obra/toast";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { colors, radius, shadow, spacing } from "@/theme";
import { notifySuccess } from "@/utils/haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import { AppModal as Modal } from "@/components/ui/app-modal";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_PHOTOS = 10;
const THUMB_WIDTH = 70;
const THUMB_GAP = 8;

interface CameraSequenceModalProps {
  visible: boolean;
  onPhotosCapture: (photoUris: string[]) => void;
  onClose: () => void;
}

export function CameraSequenceModal({
  visible,
  onPhotosCapture,
  onClose,
}: CameraSequenceModalProps) {
  const { showToast } = useToast();
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const filmstripRef = useRef<ScrollView>(null);

  // Derived preview URI — single source of truth
  const previewUri = selectedIndex !== null ? (photos[selectedIndex] ?? null) : null;

  // Request permission once when modal opens
  useEffect(() => {
    if (!visible) return;
    ImagePicker.requestCameraPermissionsAsync().then((perm) => {
      setCameraPermissionGranted(perm.granted);
      if (!perm.granted) {
        showToast({
          title: "Permissão negada",
          message: "Libere o acesso à câmera nas configurações do dispositivo.",
          tone: "error",
        });
      }
    });
  }, [visible]);

  // Auto-scroll filmstrip to keep selected thumbnail visible
  useEffect(() => {
    if (selectedIndex === null) return;
    const timeout = setTimeout(() => {
      filmstripRef.current?.scrollTo({
        x: selectedIndex * (THUMB_WIDTH + THUMB_GAP),
        animated: true,
      });
    }, 50);
    return () => clearTimeout(timeout);
  }, [selectedIndex]);

  const takePhoto = async () => {
    if (!cameraPermissionGranted) {
      showToast({
        title: "Permissão negada",
        message: "Libere o acesso à câmera nas configurações do dispositivo.",
        tone: "error",
      });
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const updatedPhotos = [...photos, uri];
        setPhotos(updatedPhotos);
        setSelectedIndex(updatedPhotos.length - 1);

        if (updatedPhotos.length >= MAX_PHOTOS) {
          showToast({
            title: "Limite atingido",
            message: "Você já tem 10 fotos. Toque em Usar fotos para confirmar.",
            tone: "info",
          });
        }
      }
    } catch {
      showToast({ title: "Erro", message: "Erro ao tirar foto.", tone: "error" });
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);

    if (updatedPhotos.length === 0) {
      setSelectedIndex(null);
    } else if (selectedIndex === null || selectedIndex >= updatedPhotos.length) {
      setSelectedIndex(updatedPhotos.length - 1);
    }
    // If selectedIndex < index, it remains valid — no change needed
  };

  const resetModal = () => {
    setPhotos([]);
    setSelectedIndex(null);
  };

  const handleConfirm = () => {
    if (photos.length === 0) {
      showToast({ title: "Nenhuma foto", message: "Tire pelo menos uma foto.", tone: "error" });
      return;
    }
    notifySuccess();
    onPhotosCapture(photos);
    resetModal();
  };

  const handleCancel = () => {
    if (photos.length > 0) {
      setConfirmCancelVisible(true);
    } else {
      resetModal();
      onClose();
    }
  };

  const canTakeMore = photos.length < MAX_PHOTOS;
  const confirmLabel =
    photos.length === 0
      ? "OK"
      : `Usar ${photos.length} foto${photos.length === 1 ? "" : "s"}`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color={colors.title} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Câmera - Sequencial</Text>

          <View style={styles.headerBtn} />
        </View>

        {/* Counter */}
        <View style={styles.counterBar}>
          {photos.length === 0 ? (
            <Text style={styles.counterGuidance}>Até {MAX_PHOTOS} fotos por registro</Text>
          ) : (
            <>
              <View style={styles.counterRow}>
                <Text style={styles.counterText}>
                  {photos.length}/{MAX_PHOTOS} fotos
                </Text>
                {photos.length >= MAX_PHOTOS && (
                  <Text style={styles.counterLimitLabel}>Limite atingido</Text>
                )}
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(photos.length / MAX_PHOTOS) * 100}%` },
                  ]}
                />
              </View>
            </>
          )}
        </View>

        {/* Last Photo Preview */}
        {previewUri ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              contentFit="cover"
            />
          </View>
        ) : (
          <View style={styles.placeholderPreview}>
            <MaterialIcons
              name="photo-camera"
              size={60}
              color={colors.iconMuted}
            />
            <Text style={styles.placeholderText}>
              Clique no botão para tirar a primeira foto
            </Text>
          </View>
        )}

        {/* Photos Filmstrip */}
        {photos.length > 0 && (
          <View style={styles.miniatureSection}>
            <Text style={styles.miniatureLabel}>Fotos tiradas:</Text>

            <ScrollView
              ref={filmstripRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.miniatureContent}
            >
              {photos.map((uri, index) => (
                <PressableScale
                  key={index}
                  scaleTo={0.93}
                  style={[
                    styles.miniatureContainer,
                    selectedIndex === index && styles.miniatureContainerSelected,
                  ]}
                  onPress={() => setSelectedIndex(index)}
                >
                  <Image
                    source={{ uri }}
                    style={styles.miniatureImage}
                    contentFit="cover"
                  />

                  <TouchableOpacity
                    style={styles.miniatureRemoveBtn}
                    onPress={() => removePhoto(index)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="close"
                      size={12}
                      color={colors.white}
                    />
                  </TouchableOpacity>

                  <Text style={styles.miniatureIndex}>{index + 1}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <PressableScale
            style={[
              styles.actionBtn,
              styles.cameraBtn,
              !canTakeMore && styles.buttonDisabled,
            ]}
            scaleTo={0.96}
            onPress={takePhoto}
            disabled={!canTakeMore}
          >
            <MaterialIcons
              name="photo-camera"
              size={24}
              color={canTakeMore ? colors.white : colors.disabledText}
            />
            <Text
              style={[
                styles.actionBtnText,
                !canTakeMore && styles.actionBtnTextDisabled,
              ]}
            >
              {canTakeMore ? "Tirar Foto" : "Limite atingido"}
            </Text>
          </PressableScale>

          <PressableScale
            style={[styles.actionBtn, styles.confirmBtn]}
            scaleTo={0.96}
            onPress={handleConfirm}
          >
            <MaterialIcons name="check" size={24} color={colors.white} />
            <Text style={styles.actionBtnText}>{confirmLabel}</Text>
          </PressableScale>
        </View>

        <ConfirmSheet
          visible={confirmCancelVisible}
          icon="delete-outline"
          iconColor="#EF4444"
          title="Descartar fotos?"
          message={`Você tem ${photos.length} foto(s). Tem certeza que deseja descartar?`}
          confirmLabel="Descartar"
          confirmVariant="destructive"
          onConfirm={() => {
            setConfirmCancelVisible(false);
            resetModal();
            onClose();
          }}
          onClose={() => setConfirmCancelVisible(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerBtn: {
    width: spacing[40],
    height: spacing[40],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },

  counterBar: {
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    gap: spacing[8],
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.title,
  },
  counterGuidance: {
    fontSize: 13,
    color: colors.subtext,
    fontStyle: "italic",
  },
  counterLimitLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.danger,
    letterSpacing: 0.3,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },

  previewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing[20],
    marginVertical: spacing[20],
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.gray100,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },

  placeholderPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing[20],
    marginVertical: spacing[20],
    borderRadius: radius.lg,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    gap: spacing[12],
  },
  placeholderText: {
    fontSize: 13,
    color: colors.subtext,
    textAlign: "center",
  },

  miniatureSection: {
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[12],
    gap: spacing[8],
  },
  miniatureLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.subtext,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  miniatureContent: {
    gap: THUMB_GAP,
    paddingRight: spacing[20],
  },
  miniatureContainer: {
    position: "relative",
    borderWidth: 2.5,
    borderColor: "transparent",
    borderRadius: radius.xs + 2,
  },
  miniatureContainerSelected: {
    borderColor: colors.primary,
  },
  miniatureImage: {
    width: THUMB_WIDTH,
    height: THUMB_WIDTH,
    borderRadius: radius.xs,
    backgroundColor: colors.gray100,
  },
  miniatureRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: spacing[20],
    height: spacing[20],
    borderRadius: spacing[10],
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(1, colors.black),
  },
  miniatureIndex: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: spacing[20],
    height: spacing[20],
    borderRadius: spacing[10],
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: spacing[20],
  },

  buttonContainer: {
    flexDirection: "row",
    gap: spacing[12],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[14],
    gap: spacing[8],
    borderRadius: radius.md,
    ...shadow(1, colors.black),
  },
  cameraBtn: {
    backgroundColor: colors.primary,
  },
  confirmBtn: {
    backgroundColor: colors.success,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  actionBtnTextDisabled: {
    color: colors.disabledText,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
