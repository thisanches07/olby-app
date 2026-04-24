import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useToast } from "@/components/obra/toast";
import { HomeEmptyState } from "@/components/home/home-empty-state";
import { DocumentViewerModal } from "@/components/projeto/document-viewer-modal";
import type { DocumentAttachment, DocumentKind } from "@/data/obras";
import { useProjectDocuments } from "@/hooks/use-project-documents";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import {
  PROJECT_DOCUMENT_LIMIT,
  PROJECT_DOCUMENT_STORAGE_LIMIT_BYTES,
  PROJECT_PLANT_LIMIT,
} from "@/utils/document-upload";
import {
  DOCUMENT_KIND_COLORS,
  DOCUMENT_KIND_LABELS,
  formatDocumentBytes,
} from "@/utils/documents";
import { canManageMembers, type ProjectApiRole } from "@/utils/project-role";
import { DocumentUploadBanner } from "./document-upload-banner";
import { ProjectDocumentRow } from "./project-document-row";
import { ProjectDocumentUploadSheet } from "./project-document-upload-sheet";

type HubFilter = "ALL" | DocumentKind;

const FILTERS: HubFilter[] = [
  "ALL",
  "PLANT",
  "CONTRACT",
  "REPORT",
  "INVOICE",
  "RECEIPT",
  "PHOTO",
  "OTHER",
];

interface ProjectDocumentsHubProps {
  projectId: string;
  projectRole: ProjectApiRole;
  onDocumentsChanged?: (documents: DocumentAttachment[]) => void;
  onDocumentRemoved?: (document: DocumentAttachment) => void;
  supplementalDocuments?: DocumentAttachment[];
  openComposerSignal?: number;
  isActive?: boolean;
  refreshSignal?: number;
  showInlineAddButton?: boolean;
  showEmptyStateAction?: boolean;
  bottomContentPadding?: number;
}

export function ProjectDocumentsHub({
  projectId,
  projectRole,
  onDocumentsChanged,
  onDocumentRemoved,
  supplementalDocuments = [],
  openComposerSignal = 0,
  isActive = true,
  refreshSignal = 0,
  showInlineAddButton = true,
  showEmptyStateAction = true,
  bottomContentPadding = spacing[24],
}: ProjectDocumentsHubProps) {
  const canManage = canManageMembers(projectRole);
  const { showToast } = useToast();
  const {
    documents,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    uploading,
    uploadingFileName,
    cancelUpload,
    fetchDocuments,
    loadMoreDocuments,
    uploadDocument,
    removeDocument,
  } = useProjectDocuments({ projectId });

  const uploadingRef = useRef(uploading);
  uploadingRef.current = uploading;
  const hasLoadedOnceRef = useRef(false);
  const lastRequestKeyRef = useRef<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<HubFilter>("ALL");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [viewingDocument, setViewingDocument] =
    useState<DocumentAttachment | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const mergedDocuments = useMemo(
    () => mergeDocuments(documents, supplementalDocuments),
    [documents, supplementalDocuments],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (!isActive) return;
    if (hasLoadedOnceRef.current) return;
    hasLoadedOnceRef.current = true;
    lastRequestKeyRef.current = `${projectId}:${debouncedQuery}`;
    void fetchDocuments("initial", {
      name:
        debouncedQuery.length >= 3
          ? debouncedQuery
          : undefined,
    });
  }, [debouncedQuery, fetchDocuments, isActive, projectId]);

  useEffect(() => {
    if (!isActive || refreshSignal === 0) return;
    void fetchDocuments("refresh", { name: debouncedQuery });
  }, [debouncedQuery, fetchDocuments, isActive, refreshSignal]);

  useEffect(() => {
    if (!isActive || !hasLoadedOnceRef.current) return;
    if (debouncedQuery.length > 0 && debouncedQuery.length < 3) return;
    const requestKey = `${projectId}:${debouncedQuery}`;
    if (lastRequestKeyRef.current === requestKey) return;
    lastRequestKeyRef.current = requestKey;
    void fetchDocuments("search", {
      name:
        debouncedQuery.length >= 3
          ? debouncedQuery
          : undefined,
    });
  }, [debouncedQuery, fetchDocuments, isActive, projectId]);

  useEffect(() => {
    if (!isActive) return;
    onDocumentsChanged?.(mergedDocuments);
  }, [mergedDocuments, isActive, onDocumentsChanged]);

  useEffect(() => {
    if (!canManage || openComposerSignal === 0) return;
    if (uploadingRef.current) {
      showToast({
        title: "Upload em andamento",
        message: "Aguarde o envio finalizar antes de adicionar outro documento.",
        tone: "info",
      });
      return;
    }
    setShowUploadSheet(true);
  }, [canManage, openComposerSignal, showToast]);

  const filteredDocuments = useMemo(
    () =>
      mergedDocuments.filter((document) => {
        return activeFilter === "ALL" || document.kind === activeFilter;
      }),
    [activeFilter, mergedDocuments],
  );

  const totalBytes = useMemo(
    () => mergedDocuments.reduce((sum, document) => sum + document.sizeBytes, 0),
    [mergedDocuments],
  );
  const plantCount = useMemo(
    () => mergedDocuments.filter((item) => item.kind === "PLANT").length,
    [mergedDocuments],
  );
  const documentUsageRatio = useMemo(
    () => Math.min(mergedDocuments.length / PROJECT_DOCUMENT_LIMIT, 1),
    [mergedDocuments.length],
  );
  const plantUsageRatio = useMemo(
    () => Math.min(plantCount / PROJECT_PLANT_LIMIT, 1),
    [plantCount],
  );
  const storageUsageRatio = useMemo(
    () => Math.min(totalBytes / PROJECT_DOCUMENT_STORAGE_LIMIT_BYTES, 1),
    [totalBytes],
  );

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded((prev) => !prev);
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  };

  const handleDeletePress = (document: DocumentAttachment) => {
    Alert.alert(
      "Remover documento?",
      `"${document.title?.trim() || document.originalFileName}" será removido permanentemente.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const removed = await removeDocument(document);
            if (removed) {
              onDocumentRemoved?.(document);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomContentPadding },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchDocuments("refresh")}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          if (!hasMore || loadingMore) return;
          const distanceFromBottom =
            nativeEvent.contentSize.height -
            nativeEvent.layoutMeasurement.height -
            nativeEvent.contentOffset.y;
          if (distanceFromBottom < 280) {
            void loadMoreDocuments({
              name:
                debouncedQuery.length >= 3
                  ? debouncedQuery
                  : undefined,
            });
          }
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>Arquivo da obra</Text>
              <Text style={styles.heroTitle}>Documentos</Text>
              <Text style={styles.heroText}>
                Plantas, contratos, relatórios e comprovantes em um único lugar.
              </Text>
            </View>

            {canManage && showInlineAddButton ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  if (uploading) {
                    showToast({ title: "Upload em andamento", message: "Aguarde o envio finalizar antes de adicionar outro documento.", tone: "info" });
                    return;
                  }
                  setShowUploadSheet(true);
                }}
                activeOpacity={0.86}
              >
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Adicionar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.statsCompact}
            onPress={toggleExpand}
            activeOpacity={0.75}
          >
            <View style={styles.statsInner}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{mergedDocuments.length}</Text>
                <Text style={styles.statLabel}>
                  {mergedDocuments.length === 1 ? "arquivo" : "arquivos"}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {formatDocumentBytes(totalBytes)}
                </Text>
                <Text style={styles.statLabel}>armazenamento</Text>
              </View>
            </View>
            <Animated.View
              style={[
                styles.chevronWrap,
                {
                  transform: [
                    {
                      rotate: expandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "180deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              <MaterialIcons
                name="keyboard-arrow-down"
                size={16}
                color={colors.textMuted}
              />
            </Animated.View>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.quotaAnimWrap,
              {
                maxHeight: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 320],
                }),
                opacity: expandAnim,
              },
            ]}
          >
            <View style={styles.quotaTopSeparator} />
            <View style={styles.quotaWrap}>
              <QuotaCard
                label="Arquivos do projeto"
                value={`${mergedDocuments.length}/${PROJECT_DOCUMENT_LIMIT}`}
                progress={documentUsageRatio}
                tone={colors.primary}
                hint={`${Math.max(PROJECT_DOCUMENT_LIMIT - mergedDocuments.length, 0)} restantes`}
              />
              <View style={styles.quotaSeparator} />
              <QuotaCard
                label="Plantas"
                value={`${plantCount}/${PROJECT_PLANT_LIMIT}`}
                progress={plantUsageRatio}
                tone={DOCUMENT_KIND_COLORS.PLANT}
                hint={`${Math.max(PROJECT_PLANT_LIMIT - plantCount, 0)} restantes`}
              />
              <View style={styles.quotaSeparator} />
              <QuotaCard
                label="Armazenamento"
                value={`${formatDocumentBytes(totalBytes)} / ${formatDocumentBytes(PROJECT_DOCUMENT_STORAGE_LIMIT_BYTES)}`}
                progress={storageUsageRatio}
                tone="#0F766E"
                hint="Limite total por projeto"
              />
            </View>
          </Animated.View>
        </View>

        <View style={styles.searchCard}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nome ou categoria"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            maxLength={30}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map((filter) => {
            const isActive = filter === activeFilter;
            const label =
              filter === "ALL" ? "Todos" : DOCUMENT_KIND_LABELS[filter];
            const tone =
              filter === "ALL" ? colors.primary : DOCUMENT_KIND_COLORS[filter];

            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  isActive && {
                    backgroundColor: `${tone}14`,
                    borderColor: `${tone}3D`,
                  },
                ]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.82}
              >
                <Text
                  style={[styles.filterChipText, isActive && { color: tone }]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <DocumentUploadBanner
          visible={uploading}
          fileName={uploadingFileName}
          onCancel={cancelUpload}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {query.trim() || activeFilter !== "ALL" ? "Resultados" : "Recentes"}
          </Text>
          <Text style={styles.sectionCount}>
            {filteredDocuments.length} arquivo
            {filteredDocuments.length === 1 ? "" : "s"}
          </Text>
        </View>

        {loading && mergedDocuments.length === 0 ? (
          <DocumentsLoadingState />
        ) : filteredDocuments.length === 0 ? (
          <HomeEmptyState
            title={
                mergedDocuments.length === 0
                ? "Nenhum documento ainda"
                : "Nada encontrado"
            }
            subtitle={
              mergedDocuments.length === 0
                ? canManage
                  ? "Comece adicionando a primeira planta, contrato ou relatório da obra."
                  : "Nenhum documento foi disponibilizado para esta obra."
                : "Tente ajustar os filtros ou buscar por outro termo."
            }
            variant={
              query.trim() || activeFilter !== "ALL"
                ? "search-empty"
                : "no-projects"
            }
            action={
              canManage && showEmptyStateAction && mergedDocuments.length === 0
                ? {
                    label: "Adicionar documento",
                    onPress: () => {
                      if (uploading) {
                        showToast({ title: "Upload em andamento", message: "Aguarde o envio finalizar antes de adicionar outro documento.", tone: "info" });
                        return;
                      }
                      setShowUploadSheet(true);
                    },
                  }
                : undefined
            }
          />
        ) : (
          <View style={styles.list}>
            {filteredDocuments.map((document) => (
              <ProjectDocumentRow
                key={document.id}
                document={document}
                onPress={() => setViewingDocument(document)}
                onDelete={
                  canManage ? () => handleDeletePress(document) : undefined
                }
              />
            ))}
          </View>
        )}

        {loadingMore ? (
          <View style={styles.loadMoreWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadMoreText}>Carregando mais documentos...</Text>
          </View>
        ) : null}
      </ScrollView>

      <ProjectDocumentUploadSheet
        visible={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
        onUpload={uploadDocument}
      />

      <DocumentViewerModal
        visible={!!viewingDocument}
        document={viewingDocument}
        projectId={projectId}
        onClose={() => setViewingDocument(null)}
      />
    </View>
  );
}

function DocumentsLoadingState() {
  return (
    <View style={styles.loadingList}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.loadingRow}>
          <View style={styles.loadingIcon} />
          <View style={styles.loadingContent}>
            <View style={[styles.loadingLine, styles.loadingTitleLine]} />
            <View style={[styles.loadingLine, styles.loadingMetaLine]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function QuotaCard({
  label,
  value,
  progress,
  tone,
  hint,
}: {
  label: string;
  value: string;
  progress: number;
  tone: string;
  hint: string;
}) {
  return (
    <View style={styles.quotaCard}>
      <View style={styles.quotaHeader}>
        <Text style={styles.quotaLabel}>{label}</Text>
        <Text style={styles.quotaValue}>{value}</Text>
      </View>
      <View style={styles.quotaTrack}>
        <View
          style={[
            styles.quotaFill,
            {
              backgroundColor: tone,
              width: `${progress > 0 ? progress * 100 : 0}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.quotaHint}>{hint}</Text>
    </View>
  );
}

function mergeDocuments(
  baseDocuments: DocumentAttachment[],
  supplementalDocuments: DocumentAttachment[],
): DocumentAttachment[] {
  const byId = new Map<string, DocumentAttachment>();

  for (const document of [...baseDocuments, ...supplementalDocuments]) {
    if (!byId.has(document.id)) {
      byId.set(document.id, document);
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing[16],
    paddingBottom: spacing[24],
  },
  heroCard: {
    borderRadius: radius["2xl"],
    backgroundColor: "#FFFFFF",
    padding: spacing[20],
    marginBottom: spacing[14],
    ...shadow(2),
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing[16],
    marginBottom: spacing[16],
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: spacing[6],
    fontFamily: "Inter-SemiBold",
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing[6],
    fontFamily: "Inter-Bold",
  },
  heroText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  addButton: {
    height: spacing[40],
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[14],
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing[6],
    ...shadow(2, colors.primary),
  },
  addButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter-SemiBold",
  },
  statsCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  statsInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
  },
  statItem: {
    gap: spacing[2],
  },
  statNumber: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.text,
    fontFamily: "Inter-Bold",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "#D1D5DB",
  },
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  quotaAnimWrap: {
    overflow: "hidden",
  },
  quotaTopSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E8EAED",
    marginTop: spacing[14],
    marginBottom: spacing[2],
  },
  quotaWrap: {
    paddingTop: spacing[12],
  },
  quotaCard: {
    paddingVertical: spacing[6],
  },
  quotaHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing[12],
    marginBottom: spacing[8],
  },
  quotaLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.text,
    fontFamily: "Inter-Regular",
  },
  quotaValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.textMuted,
    fontFamily: "Inter-SemiBold",
  },
  quotaTrack: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginBottom: spacing[6],
  },
  quotaFill: {
    height: "100%",
    borderRadius: radius.pill,
  },
  quotaHint: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  quotaSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E8EAED",
    marginVertical: spacing[12],
  },
  searchCard: {
    minHeight: spacing[48],
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    paddingHorizontal: spacing[14],
    marginBottom: spacing[14],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontFamily: "Inter-Regular",
  },
  filtersRow: {
    gap: spacing[8],
    paddingRight: spacing[12],
    marginBottom: spacing[14],
  },
  filterChip: {
    height: spacing[36],
    borderRadius: radius.pill,
    paddingHorizontal: spacing[14],
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.textMuted,
    fontFamily: "Inter-SemiBold",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing[10],
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    color: colors.text,
    fontFamily: "Inter-SemiBold",
  },
  sectionCount: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  list: {
    gap: spacing[10],
  },
  loadingList: {
    gap: spacing[10],
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xl,
    padding: spacing[14],
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
    ...shadow(1),
  },
  loadingIcon: {
    width: spacing[48],
    height: spacing[48],
    borderRadius: radius.lg,
    backgroundColor: "#E2E8F0",
  },
  loadingContent: {
    flex: 1,
    gap: spacing[8],
  },
  loadingLine: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: "#E2E8F0",
  },
  loadingTitleLine: {
    width: "70%",
    height: 14,
  },
  loadingMetaLine: {
    width: "44%",
  },
  loadMoreWrap: {
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
    alignItems: "center",
    gap: spacing[8],
  },
  loadMoreText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
});
