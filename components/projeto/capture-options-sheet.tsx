import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AppModal as Modal } from "@/components/ui/app-modal";
import { useToast } from "@/components/obra/toast";
import type { DocumentSource } from "@/data/obras";
import type { LocalDocumentAsset } from "@/utils/document-upload";

interface CaptureOptionsSheetProps {
  visible: boolean;
  onAssetSelected: (asset: LocalDocumentAsset, source: DocumentSource) => void;
  onClose: () => void;
}

export function CaptureOptionsSheet({
  visible,
  onAssetSelected,
  onClose,
}: CaptureOptionsSheetProps) {
  const { showToast } = useToast();

  const handleCamera = async () => {
    onClose();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showToast({ title: "Permissão negada", message: "Permissão de câmera negada", tone: "error" });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    onAssetSelected(
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? `foto_${Date.now()}.jpg`,
        fileSize: asset.fileSize,
      },
      "CAMERA",
    );
  };

  const handleGallery = async () => {
    onClose();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({ title: "Permissão negada", message: "Permissão de galeria negada", tone: "error" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    onAssetSelected(
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? `imagem_${Date.now()}.jpg`,
        fileSize: asset.fileSize,
      },
      "GALLERY",
    );
  };

  const handleScan = async () => {
    onClose();
    try {
      const DocumentScanner = (await import("react-native-document-scanner-plugin")).default;
      const { scannedImages } = await DocumentScanner.scanDocument({ maxNumDocuments: 1 });
      if (!scannedImages?.length) return;
      const uri = scannedImages[0];
      onAssetSelected(
        {
          uri,
          mimeType: "image/jpeg",
          fileName: `digitalizacao_${Date.now()}.jpg`,
        },
        "SCAN",
      );
    } catch {
      showToast({
        title: "Indisponível",
        message: "Digitalização não disponível neste dispositivo",
        tone: "error",
      });
    }
  };

  const handleFilePicker = async () => {
    onClose();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      onAssetSelected(
        {
          uri: file.uri,
          mimeType: file.mimeType ?? "application/pdf",
          fileName: file.name,
          fileSize: file.size,
        },
        "FILE_PICKER",
      );
    } catch {
      showToast({ title: "Erro", message: "Erro ao abrir gerenciador de arquivos", tone: "error" });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Adicionar comprovante</Text>

            <View style={styles.options}>
              <Option
                icon="camera-alt"
                label="Câmera"
                color="#2563EB"
                onPress={handleCamera}
              />
              <Option
                icon="photo-library"
                label="Galeria"
                color="#7C3AED"
                onPress={handleGallery}
              />
              <Option
                icon="document-scanner"
                label="Digitalizar"
                color="#0891B2"
                onPress={handleScan}
              />
              <Option
                icon="description"
                label="Arquivo/PDF"
                color="#D97706"
                onPress={handleFilePicker}
              />
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function Option({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.option} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.optionIcon, { backgroundColor: `${color}18` }]}>
        <MaterialIcons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Inter-Bold",
  },
  options: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  option: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    fontFamily: "Inter-SemiBold",
  },
  cancelBtn: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    fontFamily: "Inter-Bold",
  },
});
