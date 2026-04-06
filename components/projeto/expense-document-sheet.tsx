import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import { AppModal as Modal } from "@/components/ui/app-modal";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DocumentAttachment, DocumentKind, Gasto } from "@/data/obras";
import type { ObraDetalhe } from "@/data/obras";
import { useExpenseDocuments } from "@/hooks/use-expense-documents";
import type { LocalDocumentAsset } from "@/utils/document-upload";
import { CaptureOptionsSheet } from "./capture-options-sheet";
import { DocumentViewerModal } from "./document-viewer-modal";

const KIND_LABELS: Record<DocumentKind, string> = {
  RECEIPT: "Comprovante",
  INVOICE: "Nota Fiscal",
  CONTRACT: "Contrato",
  REPORT: "Relatório",
  PHOTO: "Foto",
  OTHER: "Outro",
};

const KIND_COLORS: Record<DocumentKind, string> = {
  RECEIPT: "#10B981",
  INVOICE: "#2563EB",
  CONTRACT: "#7C3AED",
  REPORT: "#D97706",
  PHOTO: "#0891B2",
  OTHER: "#6B7280",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ExpenseDocumentSheetProps {
  visible: boolean;
  projectId: string;
  expense: Gasto | null;
  projectRole: ObraDetalhe["myRole"];
  onClose: () => void;
  onDocumentCountChange: (expenseId: string, count: number) => void;
}

export function ExpenseDocumentSheet({
  visible,
  projectId,
  expense,
  projectRole,
  onClose,
  onDocumentCountChange,
}: ExpenseDocumentSheetProps) {
  const canManage = projectRole === "OWNER" || projectRole === "PRO";

  const {
    documents,
    loading,
    uploading,
    fetchDocuments,
    addDocument,
    removeDocument,
  } = useExpenseDocuments({
    projectId,
    expenseId: expense?.id ?? "",
    onDocumentCountChange,
  });

  const [showCapture, setShowCapture] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentAttachment | null>(null);

  useEffect(() => {
    if (visible && expense?.id) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, expense?.id]);

  const handleAssetSelected = async (
    asset: LocalDocumentAsset,
    source: "CAMERA" | "SCAN" | "GALLERY" | "FILE_PICKER",
  ) => {
    await addDocument(asset, "RECEIPT", source);
  };

  const handleDeletePress = (doc: DocumentAttachment) => {
    Alert.alert(
      "Remover documento?",
      `"${doc.originalFileName}" será removido permanentemente.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => removeDocument(doc.id),
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
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
            <MaterialIcons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Documentos
            </Text>
            {expense && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {expense.descricao}
              </Text>
            )}
          </View>
          {canManage ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowCapture(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="add" size={24} color="#2563EB" />
            </TouchableOpacity>
          ) : (
            <View style={styles.addBtn} />
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="attach-file" size={40} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Nenhum documento</Text>
            <Text style={styles.emptySubtitle}>
              {canManage
                ? "Adicione comprovantes, notas fiscais ou fotos."
                : "Nenhum documento foi anexado a este gasto."}
            </Text>
            {canManage && (
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowCapture(true)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>Adicionar documento</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={documents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <DocumentRow
                doc={item}
                canManage={canManage}
                onView={() => setViewingDoc(item)}
                onDelete={() => handleDeletePress(item)}
              />
            )}
          />
        )}

        {/* Upload overlay */}
        {uploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.uploadText}>Enviando documento...</Text>
          </View>
        )}

        {/* Sub-modals — dentro do Modal para aparecerem por cima no iOS */}
        <CaptureOptionsSheet
          visible={showCapture}
          onAssetSelected={handleAssetSelected}
          onClose={() => setShowCapture(false)}
        />

        <DocumentViewerModal
          visible={!!viewingDoc}
          document={viewingDoc}
          projectId={projectId}
          onClose={() => setViewingDoc(null)}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── DocumentRow ───────────────────────────────────────────────────────────────

interface DocumentRowProps {
  doc: DocumentAttachment;
  canManage: boolean;
  onView: () => void;
  onDelete: () => void;
}

function DocumentRow({ doc, canManage, onView, onDelete }: DocumentRowProps) {
  const isImage = doc.contentType.startsWith("image/");
  const fileIcon: React.ComponentProps<typeof MaterialIcons>["name"] = isImage
    ? "image"
    : "picture-as-pdf";
  const fileIconColor = isImage ? "#0891B2" : "#DC2626";
  const kindColor = KIND_COLORS[doc.kind] ?? "#6B7280";
  const kindLabel = KIND_LABELS[doc.kind] ?? doc.kind;

  return (
    <TouchableOpacity style={styles.row} onPress={onView} activeOpacity={0.8}>
      {/* File icon */}
      <View style={[styles.rowIcon, { backgroundColor: `${fileIconColor}18` }]}>
        <MaterialIcons name={fileIcon} size={24} color={fileIconColor} />
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowFileName} numberOfLines={1}>
          {doc.originalFileName}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowSize}>{formatBytes(doc.sizeBytes)}</Text>
          <View style={[styles.kindBadge, { backgroundColor: `${kindColor}18` }]}>
            <Text style={[styles.kindText, { color: kindColor }]}>{kindLabel}</Text>
          </View>
          <StatusPill status={doc.status} />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.rowActions}>
        {canManage && (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
        <MaterialIcons name="chevron-right" size={18} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );
}

function StatusPill({ status }: { status: DocumentAttachment["status"] }) {
  if (status === "READY") return null;

  const isError = status === "FAILED";
  return (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: isError ? "#FEE2E2" : "#FEF3C7" },
      ]}
    >
      <Text
        style={[
          styles.statusPillText,
          { color: isError ? "#DC2626" : "#D97706" },
        ]}
      >
        {isError ? "Falhou" : "Processando"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 12 : 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Inter-Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter-Regular",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
    fontFamily: "Inter-Bold",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Inter-Regular",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter-Bold",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  // DocumentRow
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  rowFileName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    fontFamily: "Inter-SemiBold",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  rowSize: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: "Inter-Regular",
  },
  kindBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  kindText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter-Bold",
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter-Bold",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  // Upload overlay
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter-SemiBold",
  },
});
