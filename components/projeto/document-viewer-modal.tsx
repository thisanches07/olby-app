import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { AppModal as Modal } from "@/components/ui/app-modal";
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { DocumentAttachment } from "@/data/obras";
import { documentsService } from "@/services/documents.service";
import { useToast } from "@/components/obra/toast";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const { showToast } = useToast();

  useEffect(() => {
    if (!visible || !document) {
      setViewUrl(null);
      return;
    }
    if (document.status !== "READY") return;

    setLoading(true);
    documentsService
      .getById(projectId, document.id)
      .then((doc) => {
        const url = doc.viewUrl ?? null;
        if (!url) {
          showToast({ title: "Erro", message: "URL de visualização indisponível", tone: "error" });
          onClose();
          return;
        }
        const isPdf =
          document.contentType === "application/pdf" ||
          (!document.contentType.startsWith("image/") && url);

        if (isPdf) {
          // Open in system browser; close the modal immediately
          setLoading(false);
          onClose();
          WebBrowser.openBrowserAsync(url).catch(() => {
            showToast({ title: "Erro", message: "Não foi possível abrir o arquivo", tone: "error" });
          });
        } else {
          setViewUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
        showToast({ title: "Erro", message: "Erro ao carregar documento", tone: "error" });
        onClose();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, document?.id]);

  const isImage = document?.contentType?.startsWith("image/");

  return (
    <Modal
      visible={visible && isImage === true}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {document?.originalFileName ?? "Documento"}
          </Text>
          <View style={styles.closeBtn} />
        </View>

        {/* Content */}
        <View style={styles.imageContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : viewUrl ? (
            <Image
              source={{ uri: viewUrl }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          ) : document?.status !== "READY" ? (
            <View style={styles.statusContainer}>
              <MaterialIcons name="hourglass-empty" size={48} color="#9CA3AF" />
              <Text style={styles.statusText}>
                {document?.status === "FAILED"
                  ? "Falha no processamento do documento"
                  : "Documento ainda sendo processado..."}
              </Text>
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
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
  imageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
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
