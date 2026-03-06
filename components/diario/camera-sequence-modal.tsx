import { useToast } from "@/components/obra/toast";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { colors, radius, shadow, spacing } from "@/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MAX_PHOTOS = 10;

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
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showToast({ title: "Permissão negada", message: "Precisa de acesso à câmera.", tone: "error" });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const updatedPhotos = [...photos, uri];
        setPhotos(updatedPhotos);
        setLastPhotoUri(uri);

        if (updatedPhotos.length >= MAX_PHOTOS) {
          showToast({ title: "Limite atingido", message: "Você já tem 10 fotos. Clique em OK para confirmar.", tone: "info" });
        }
      }
    } catch {
      showToast({ title: "Erro", message: "Erro ao tirar foto.", tone: "error" });
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    if (index === photos.length - 1) {
      setLastPhotoUri(updatedPhotos[updatedPhotos.length - 1] || null);
    }
  };

  const resetModal = () => {
    setPhotos([]);
    setLastPhotoUri(null);
  };

  const handleConfirm = () => {
    if (photos.length === 0) {
      showToast({ title: "Nenhuma foto", message: "Tire pelo menos uma foto.", tone: "error" });
      return;
    }
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
          <Text style={styles.counterText}>
            {photos.length}/{MAX_PHOTOS} fotos
          </Text>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(photos.length / MAX_PHOTOS) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Last Photo Preview */}
        {lastPhotoUri ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: lastPhotoUri }}
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

        {/* Photos Miniatures */}
        {photos.length > 0 && (
          <View style={styles.miniatureSection}>
            <Text style={styles.miniatureLabel}>Fotos tiradas:</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.miniatureContent}
            >
              {photos.map((uri, index) => (
                <View key={index} style={styles.miniatureContainer}>
                  <Image
                    source={{ uri }}
                    style={styles.miniatureImage}
                    contentFit="cover"
                  />

                  <TouchableOpacity
                    style={styles.miniatureRemoveBtn}
                    onPress={() => removePhoto(index)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="close"
                      size={12}
                      color={colors.white}
                    />
                  </TouchableOpacity>

                  <Text style={styles.miniatureIndex}>{index + 1}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.cameraBtn,
              !canTakeMore && styles.buttonDisabled,
            ]}
            onPress={takePhoto}
            disabled={!canTakeMore}
            activeOpacity={0.7}
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
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.confirmBtn]}
            onPress={handleConfirm}
            activeOpacity={0.7}
          >
            <MaterialIcons name="check" size={24} color={colors.white} />
            <Text style={styles.actionBtnText}>OK</Text>
          </TouchableOpacity>
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
  counterText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.title,
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
    gap: spacing[8],
    paddingRight: spacing[20],
  },
  miniatureContainer: {
    position: "relative",
  },
  miniatureImage: {
    width: 70,
    height: 70,
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
