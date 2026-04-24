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

import { useToast } from "@/components/obra/toast";
import { AppModal as Modal } from "@/components/ui/app-modal";
import type { DocumentSource } from "@/data/obras";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
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
      showToast({
        title: "Permissão negada",
        message: "Permissão de câmera negada",
        tone: "error",
      });
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
      showToast({
        title: "Permissão negada",
        message: "Permissão de galeria negada",
        tone: "error",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
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

  const handleScan = () => {
    onClose();
    setTimeout(async () => {
      try {
        const DocumentScanner = (
          await import("react-native-document-scanner-plugin")
        ).default;
        const { scannedImages } = await DocumentScanner.scanDocument({
          maxNumDocuments: 1,
        });
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
      } catch (err) {
        const detail = err instanceof Error ? ` (${err.message})` : "";
        showToast({
          title: "Indisponível",
          message: `Digitalização não disponível neste dispositivo${detail}`,
          tone: "error",
        });
      }
    }, 500);
  };

  const handleFilePicker = () => {
    onClose();
    setTimeout(async () => {
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
      } catch (err) {
        const detail = err instanceof Error ? ` (${err.message})` : "";
        showToast({
          title: "Erro",
          message: `Erro ao abrir gerenciador de arquivos${detail}`,
          tone: "error",
        });
      }
    }, 500);
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
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Adicionar comprovante</Text>
              <Text style={styles.subtitle}>
                Fotos, PDFs e digitalizações aceitas. Limite de 25 MB por arquivo.
              </Text>
            </View>

            <View style={styles.sourcesWrap}>
              <SourceButton
                icon="camera-alt"
                label="Câmera"
                subtitle="Capturar agora"
                color="#2563EB"
                onPress={handleCamera}
              />
              <SourceButton
                icon="photo-library"
                label="Galeria"
                subtitle="Escolher mídia"
                color="#7C3AED"
                onPress={handleGallery}
              />
              <SourceButton
                icon="document-scanner"
                label="Digitalizar"
                subtitle="Escanear página"
                color="#0891B2"
                onPress={handleScan}
              />
              <SourceButton
                icon="description"
                label="Arquivo/PDF"
                subtitle="PDF ou imagem"
                color="#D97706"
                onPress={handleFilePicker}
              />
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function SourceButton({
  icon,
  label,
  subtitle,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.sourceCard}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.sourceIcon, { backgroundColor: `${color}14` }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.sourceLabel}>{label}</Text>
      <Text style={styles.sourceSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    paddingTop: spacing[12],
    paddingHorizontal: spacing[20],
    paddingBottom: Platform.OS === "ios" ? spacing[36] : spacing[24],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: spacing[18],
  },
  header: {
    marginBottom: spacing[20],
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing[6],
    fontFamily: "Inter-Bold",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  sourcesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[12],
    marginBottom: spacing[20],
  },
  sourceCard: {
    width: "47%",
    minHeight: 116,
    borderRadius: radius.xl,
    backgroundColor: "#FFFFFF",
    padding: spacing[16],
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...shadow(1),
  },
  sourceIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[12],
  },
  sourceLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing[4],
    fontFamily: "Inter-SemiBold",
  },
  sourceSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  cancelBtn: {
    minHeight: spacing[48],
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    fontFamily: "Inter-SemiBold",
  },
});
