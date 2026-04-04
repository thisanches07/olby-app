import { useToast } from "@/components/obra/toast";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { PhotoItem } from "@/hooks/use-diary-state";
import type { LocalPhotoAsset } from "@/utils/photo-upload";
import { CameraSequenceModal } from "./camera-sequence-modal";

const PRIMARY = "#2563EB";
const MAX_NEW_PHOTOS = 10;

interface GalleryPickerProps {
  /** Fotos já enviadas ao backend (apenas leitura no form). */
  existingPhotos?: PhotoItem[];
  /** Callback chamado quando a lista de novas fotos locais muda. */
  onNewPhotosSelected: (assets: LocalPhotoAsset[]) => void;
}

export function GalleryPicker({
  existingPhotos = [],
  onNewPhotosSelected,
}: GalleryPickerProps) {
  const { showToast } = useToast();
  const [newAssets, setNewAssets] = useState<LocalPhotoAsset[]>([]);
  const [showCameraModal, setShowCameraModal] = useState(false);
  // Stores assets pending user confirmation when over the limit (fallback for Android API <34)
  const [pendingOverflow, setPendingOverflow] = useState<{
    assets: ImagePicker.ImagePickerAsset[];
    spacesLeft: number;
  } | null>(null);

  const updateNew = (assets: LocalPhotoAsset[]) => {
    setNewAssets(assets);
    onNewPhotosSelected(assets);
  };

  const handleCameraPhotos = (uris: string[]) => {
    const cameraAssets: LocalPhotoAsset[] = uris.map((uri) => ({
      uri,
      mimeType: "image/jpeg",
    }));
    const updated = [...newAssets, ...cameraAssets].slice(0, MAX_NEW_PHOTOS);
    updateNew(updated);
    setShowCameraModal(false);
  };

  const pickFromGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast({ title: "Permissão negada", message: "Precisa de acesso à galeria.", tone: "error" });
        return;
      }

      const spacesLeft = MAX_NEW_PHOTOS - newAssets.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: spacesLeft,
        quality: 0.85,
      });

      if (result.canceled) return;

      const selected = result.assets;
      if (selected.length > spacesLeft) {
        // Fallback for Android API <34 which may ignore selectionLimit
        setPendingOverflow({ assets: selected, spacesLeft });
      } else {
        addPickerAssets(selected);
      }
    } catch {
      showToast({ title: "Erro", message: "Erro ao selecionar imagens.", tone: "error" });
    }
  };

  const addPickerAssets = (
    assets: ImagePicker.ImagePickerAsset[],
  ) => {
    const mapped: LocalPhotoAsset[] = assets.map((a) => ({
      uri: a.uri,
      mimeType: a.mimeType ?? "image/jpeg",
      fileSize: a.fileSize ?? null,
    }));
    const updated = [...newAssets, ...mapped].slice(0, MAX_NEW_PHOTOS);
    updateNew(updated);
  };

  const removeNew = (index: number) => {
    updateNew(newAssets.filter((_, i) => i !== index));
  };

  const canAddMore = newAssets.length < MAX_NEW_PHOTOS;
  const spacesLeft = MAX_NEW_PHOTOS - newAssets.length;
  const totalExisting = existingPhotos.length;

  const cameraLabel = canAddMore
    ? `Câmera · ${spacesLeft} vaga${spacesLeft === 1 ? "" : "s"}`
    : "Câmera";
  const galleryLabel = canAddMore
    ? `Galeria · ${spacesLeft} vaga${spacesLeft === 1 ? "" : "s"}`
    : "Galeria";

  return (
    <View style={styles.container}>
      {/* Botões de seleção */}
      <View style={styles.buttonRow}>
        <PressableScale
          style={[styles.button, !canAddMore && styles.buttonDisabled]}
          onPress={() => setShowCameraModal(true)}
          disabled={!canAddMore}
          scaleTo={0.96}
        >
          <MaterialIcons
            name="camera-alt"
            size={18}
            color={canAddMore ? "#FFFFFF" : "#B0B0B0"}
          />
          <Text
            style={[styles.buttonText, !canAddMore && styles.buttonTextDisabled]}
          >
            {cameraLabel}
          </Text>
        </PressableScale>

        <PressableScale
          style={[styles.button, !canAddMore && styles.buttonDisabled]}
          onPress={pickFromGallery}
          disabled={!canAddMore}
          scaleTo={0.96}
        >
          <MaterialIcons
            name="image"
            size={18}
            color={canAddMore ? "#FFFFFF" : "#B0B0B0"}
          />
          <Text
            style={[styles.buttonText, !canAddMore && styles.buttonTextDisabled]}
          >
            {galleryLabel}
          </Text>
        </PressableScale>
      </View>

      {/* Fotos existentes (somente leitura) */}
      {totalExisting > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.label}>
            Fotos enviadas ({totalExisting})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewContent}
          >
            {existingPhotos.map((photo) => (
              <View key={photo.id} style={styles.photoContainer}>
                <Image
                  source={{ uri: photo.thumbUrl }}
                  style={styles.photoPreview}
                  contentFit="cover"
                />
                {/* Ícone de cadeado indicando foto já enviada */}
                <View style={styles.lockedBadge}>
                  <MaterialIcons name="check-circle" size={14} color="#22C55E" />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Novas fotos selecionadas (pendentes de upload) */}
      {newAssets.length > 0 && (
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Text style={styles.label}>
              Novas fotos ({newAssets.length}/{MAX_NEW_PHOTOS})
            </Text>
            {newAssets.length > 3 && (
              <Text style={styles.scrollHint}>→ deslize para ver mais</Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewContent}
          >
            {newAssets.map((asset, index) => (
              <View key={`new-${index}`} style={styles.photoContainer}>
                <Image
                  source={{ uri: asset.uri }}
                  style={styles.photoPreview}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeNew(index)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.photoIndex}>{index + 1}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <ConfirmSheet
        visible={!!pendingOverflow}
        icon="photo-library"
        iconColor={PRIMARY}
        confirmVariant="primary"
        title="Limite de fotos"
        message={`Você pode adicionar apenas ${pendingOverflow?.spacesLeft} foto(s) mais. Selecionadas ${pendingOverflow?.assets.length}.`}
        confirmLabel={`Adicionar apenas ${pendingOverflow?.spacesLeft}`}
        onConfirm={() => {
          if (pendingOverflow) {
            addPickerAssets(pendingOverflow.assets.slice(0, pendingOverflow.spacesLeft));
          }
          setPendingOverflow(null);
        }}
        onClose={() => setPendingOverflow(null)}
      />

      <CameraSequenceModal
        visible={showCameraModal}
        onPhotosCapture={handleCameraPhotos}
        onClose={() => setShowCameraModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  buttonTextDisabled: {
    color: "#B0B0B0",
  },
  previewSection: {
    gap: 8,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  scrollHint: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  previewContent: {
    gap: 12,
    minHeight: 110,
  },
  photoContainer: {
    position: "relative",
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  removeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  lockedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoIndex: {
    position: "absolute",
    bottom: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PRIMARY,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
    elevation: 2,
  },
});
