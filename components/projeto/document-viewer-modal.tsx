import { AppModal as Modal } from "@/components/ui/app-modal";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "@/components/obra/toast";
import type { DocumentAttachment } from "@/data/obras";
import { documentsService } from "@/services/documents.service";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentViewerModalProps {
  visible: boolean;
  document: DocumentAttachment | null;
  projectId: string;
  onClose: () => void;
}

export function DocumentViewerModal({
  visible,
  document,
  projectId,
  onClose,
}: DocumentViewerModalProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const { showToast } = useToast();

  const isImage = document?.contentType?.startsWith("image/");

  useEffect(() => {
    if (!visible || !document) {
      setViewUrl(null);
      setDownloadDone(false);
      return;
    }
    if (document.status !== "READY") return;

    setLoading(true);
    documentsService
      .getAccess(projectId, document.id)
      .then((access) => {
        const url = access.viewUrl ?? null;
        if (!url) {
          showToast({
            title: "Erro",
            message: "URL de visualização indisponível",
            tone: "error",
          });
          onClose();
          return;
        }
        setViewUrl(url);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        showToast({
          title: "Erro",
          message: "Erro ao carregar documento",
          tone: "error",
        });
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, document?.id, document?.status, projectId, onClose, showToast]);

  const handleOpen = () => {
    if (viewUrl) WebBrowser.openBrowserAsync(viewUrl);
  };

  const handleDownload = async () => {
    if (downloading || !viewUrl || !document) return;
    setDownloading(true);
    try {
      const safeFilename = document.originalFileName.replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );
      const localUri = `${FileSystem.cacheDirectory}${safeFilename}`;
      const { uri } = await FileSystem.downloadAsync(viewUrl, localUri);

      if (isImage) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          showToast({
            title: "Permissão negada",
            message: "Permita acesso à galeria para salvar a imagem",
            tone: "error",
          });
          return;
        }
        await MediaLibrary.saveToLibraryAsync(uri);
        setDownloadDone(true);
        showToast({
          title: "Salvo!",
          message: "Imagem salva na galeria",
          tone: "success",
        });
        setTimeout(() => setDownloadDone(false), 2500);
      } else {
        if (Platform.OS === "ios") {
          await Share.share({ url: uri });
        } else {
          // Android: open in browser (user can save from there)
          await WebBrowser.openBrowserAsync(viewUrl);
        }
        setDownloadDone(true);
        setTimeout(() => setDownloadDone(false), 2500);
      }
    } catch {
      showToast({
        title: "Erro",
        message: "Não foi possível baixar o arquivo",
        tone: "error",
      });
    } finally {
      setDownloading(false);
    }
  };

  // ── Download button ────────────────────────────────────────────────────────
  const DownloadBtn = () => (
    <TouchableOpacity
      style={styles.iconBtn}
      onPress={handleDownload}
      disabled={downloading || !viewUrl}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {downloading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : downloadDone ? (
        <MaterialIcons name="check-circle" size={22} color="#4ADE80" />
      ) : (
        <MaterialIcons
          name="file-download"
          size={22}
          color={viewUrl ? "#FFFFFF" : "rgba(255,255,255,0.3)"}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {document?.originalFileName ?? "Documento"}
          </Text>

          <DownloadBtn />
        </View>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : document?.status !== "READY" ? (
            <View style={styles.statusContainer}>
              <MaterialIcons name="hourglass-empty" size={48} color="#9CA3AF" />
              <Text style={styles.statusText}>
                {document?.status === "FAILED"
                  ? "Falha no processamento do documento. Delete-o e tente novamente"
                  : "Documento ainda sendo processado..."}
              </Text>
            </View>
          ) : isImage && viewUrl ? (
            /* ── Image inline viewer ───────────────────────────────── */
            <Image
              source={{ uri: viewUrl }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          ) : !isImage ? (
            /* ── PDF / other file preview card ────────────────────── */
            <View style={styles.pdfCard}>
              <View style={styles.pdfIconWrap}>
                <MaterialIcons
                  name="picture-as-pdf"
                  size={56}
                  color="#EF4444"
                />
              </View>

              <Text style={styles.pdfFilename} numberOfLines={2}>
                {document?.originalFileName ?? "documento.pdf"}
              </Text>
              {document?.sizeBytes ? (
                <Text style={styles.pdfSize}>
                  {formatBytes(document.sizeBytes)}
                </Text>
              ) : null}

              <View style={styles.pdfActions}>
                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={handleOpen}
                  disabled={!viewUrl}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="open-in-new" size={18} color="#2563EB" />
                  <Text style={styles.openBtnText}>Abrir arquivo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.downloadBtn,
                    downloading && styles.downloadBtnLoading,
                  ]}
                  onPress={handleDownload}
                  disabled={downloading || !viewUrl}
                  activeOpacity={0.8}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : downloadDone ? (
                    <>
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.downloadBtnText}>Salvo!</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons
                        name="file-download"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.downloadBtnText}>Baixar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginHorizontal: 8,
    fontFamily: "Inter-SemiBold",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Image viewer ───────────────────────────────────────────────────────────
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },

  // ── PDF preview card ───────────────────────────────────────────────────────
  pdfCard: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 0,
  },
  pdfIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "rgba(239,68,68,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pdfFilename: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Inter-SemiBold",
    marginBottom: 6,
  },
  pdfSize: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter-Regular",
    marginBottom: 36,
  },
  pdfActions: {
    gap: 12,
    width: "100%",
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(37,99,235,0.14)",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.4)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  openBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#60A5FA",
    fontFamily: "Inter-SemiBold",
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  downloadBtnLoading: {
    backgroundColor: "#1D4ED8",
  },
  downloadBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter-SemiBold",
  },

  // ── Status / error states ──────────────────────────────────────────────────
  statusContainer: {
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  statusText: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Inter-Regular",
  },
});
