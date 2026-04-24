import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useToast } from "@/components/obra/toast";
import { AppModal as Modal } from "@/components/ui/app-modal";
import { CharacterLimitHint } from "@/components/ui/character-limit-hint";
import type { DocumentKind, DocumentSource } from "@/data/obras";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import {
  getDocumentSizeLimitLabel,
  type LocalDocumentAsset,
} from "@/utils/document-upload";
import {
  DOCUMENT_KIND_COLORS,
  DOCUMENT_KIND_ICONS,
  DOCUMENT_KIND_LABELS,
} from "@/utils/documents";

const KIND_OPTIONS: DocumentKind[] = [
  "PLANT",
  "CONTRACT",
  "REPORT",
  "INVOICE",
  "RECEIPT",
  "PERMIT",
  "PHOTO",
  "DELIVERY",
  "OTHER",
];

interface ProjectDocumentUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (
    asset: LocalDocumentAsset,
    options: { kind: DocumentKind; source: DocumentSource; title?: string },
  ) => Promise<void>;
}

export function ProjectDocumentUploadSheet({
  visible,
  onClose,
  onUpload,
}: ProjectDocumentUploadSheetProps) {
  const { showToast } = useToast();
  const [selectedKind, setSelectedKind] = useState<DocumentKind>("PLANT");
  const [customTitle, setCustomTitle] = useState("");

  const selectedTone = useMemo(
    () => DOCUMENT_KIND_COLORS[selectedKind],
    [selectedKind],
  );

  const submitAsset = (asset: LocalDocumentAsset, source: DocumentSource) => {
    const kind = selectedKind;
    const title = customTitle.trim() || undefined;
    setCustomTitle("");
    setSelectedKind("PLANT");
    onClose();
    void onUpload(asset, { kind, source, title });
  };

  const handleCamera = async () => {
    Keyboard.dismiss();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    submitAsset(
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? `documento_${Date.now()}.jpg`,
        fileSize: asset.fileSize,
      },
      "CAMERA",
    );
  };

  const handleGallery = async () => {
    Keyboard.dismiss();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    submitAsset(
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? `documento_${Date.now()}.jpg`,
        fileSize: asset.fileSize,
      },
      "GALLERY",
    );
  };

  const handleFilePicker = async () => {
    Keyboard.dismiss();
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const file = result.assets[0];
    submitAsset(
      {
        uri: file.uri,
        mimeType: file.mimeType ?? "application/pdf",
        fileName: file.name,
        fileSize: file.size,
      },
      "FILE_PICKER",
    );
  };

  const handleScan = () => {
    Keyboard.dismiss();
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

        submitAsset(
          {
            uri: scannedImages[0],
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
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
              <Text style={styles.title}>Novo documento</Text>
              <Text style={styles.subtitle}>
                Organize plantas, contratos, relatórios e arquivos técnicos sem
                pesar a obra.
              </Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Titulo opcional</Text>
              <TextInput
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="Ex.: Planta executiva - revisão 03"
                placeholderTextColor="#9CA3AF"
                style={[
                  styles.input,
                  customTitle.length >= 30 && styles.inputAtLimit,
                ]}
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <CharacterLimitHint current={customTitle.length} max={30} />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Categoria</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.kindRow}
              >
                {KIND_OPTIONS.map((kind) => {
                  const isActive = selectedKind === kind;
                  const tone = DOCUMENT_KIND_COLORS[kind];

                  return (
                    <TouchableOpacity
                      key={kind}
                      style={[
                        styles.kindChip,
                        isActive && {
                          backgroundColor: `${tone}14`,
                          borderColor: `${tone}40`,
                        },
                      ]}
                      onPress={() => setSelectedKind(kind)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons
                        name={DOCUMENT_KIND_ICONS[kind] as never}
                        size={16}
                        color={isActive ? tone : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.kindChipText,
                          isActive && { color: tone },
                        ]}
                      >
                        {DOCUMENT_KIND_LABELS[kind]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.limitHint}>
                Limite para {DOCUMENT_KIND_LABELS[selectedKind].toLowerCase()}:{" "}
                {getDocumentSizeLimitLabel(selectedKind)}.
              </Text>
            </View>

            <View style={styles.sourcesWrap}>
              <SourceButton
                icon="description"
                label="Arquivo"
                subtitle="PDF ou imagem"
                color={selectedTone}
                onPress={handleFilePicker}

              />
              <SourceButton
                icon="camera-alt"
                label="Câmera"
                subtitle="Capturar agora"
                color={selectedTone}
                onPress={handleCamera}

              />
              <SourceButton
                icon="photo-library"
                label="Galeria"
                subtitle="Escolher mídia"
                color={selectedTone}
                onPress={handleGallery}

              />
              <SourceButton
                icon="document-scanner"
                label="Digitalizar"
                subtitle="Escanear página"
                color={selectedTone}
                onPress={handleScan}

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
  fieldBlock: {
    marginBottom: spacing[18],
  },
  inputAtLimit: {
    borderColor: "#FCA5A5",
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: "Inter-SemiBold",
    marginBottom: spacing[10],
  },
  input: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: spacing[14],
    fontSize: 14,
    color: colors.text,
    fontFamily: "Inter-Regular",
  },
  kindRow: {
    gap: spacing[8],
    paddingRight: spacing[12],
  },
  limitHint: {
    marginTop: spacing[10],
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  kindChip: {
    height: 38,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[12],
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
  },
  kindChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    fontFamily: "Inter-SemiBold",
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
