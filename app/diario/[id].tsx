import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { ClientTimelineSection } from "@/components/diario/client-timeline-section";
import { DiaryHeader } from "@/components/diario/diary-header";
import { DiaryLoadingScreen } from "@/components/diario/diary-loading-screen";
import {
  DiaryTabsSegmented,
  type DiaryTab,
} from "@/components/diario/diary-tabs-segmented";
import { EngineerTimelineSection } from "@/components/diario/engineer-timeline-section";
import { EntryFormModal } from "@/components/diario/entry-form-modal";
import { ImageLightboxModal } from "@/components/diario/image-lightbox-modal";
import { PhotosTab } from "@/components/diario/photos-tab";
import { useToast } from "@/components/obra/toast";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

import {
  getProjectItemLimitMessage,
  PROJECT_ITEM_LIMIT,
} from "@/constants/creation-limits";
import { useProjects } from "@/contexts/projects-context";
import { useAppSession } from "@/hooks/use-app-session";
import { useDiaryData, type EntryFormData } from "@/hooks/use-diary-data";
import type { DiaryEntry, PhotoItem } from "@/hooks/use-diary-state";
import { dailyLogPhotosService } from "@/services/daily-log-photos.service";
import { projectsService } from "@/services/projects.service";
import { saveAllPhotosToGallery } from "@/utils/photo-download";
import { toAppViewRole, type ProjectApiRole } from "@/utils/project-role";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { shadow } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

export default function DiarioScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role: sessionRole } = useAppSession();
  const { obras } = useProjects();
  const [activeTab, setActiveTab] = useState<DiaryTab>("timeline");

  const { showToast } = useToast();
  const fallbackMode: "cliente" | "engenheiro" =
    sessionRole === "engenheiro" ? "engenheiro" : "cliente";

  // Projeto corrente (para passar nome ao header e ClientSummaryCard)
  const obra = useMemo(() => obras.find((o) => o.id === id), [obras, id]);
  const [projectRole, setProjectRole] = useState<ProjectApiRole>(
    obra?.myRole ?? null,
  );
  const [projectStatus, setProjectStatus] = useState<string | null>(
    obra?.status ?? null,
  );

  useEffect(() => {
    if (obra?.status) {
      setProjectStatus(obra.status);
    }
  }, [obra?.status]);

  useEffect(() => {
    if (obra?.myRole) {
      setProjectRole(obra.myRole);
    }

    if (!id) return;

    let cancelled = false;
    void projectsService
      .getById(id)
      .then((project) => {
        if (!cancelled) {
          setProjectRole(project.myRole ?? null);
          setProjectStatus(
            project.status === "COMPLETED"
              ? "concluida"
              : project.status === "ARCHIVED"
                ? "pausada"
                : project.status === "PLANNING"
                  ? "planejamento"
                  : "em_andamento",
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [obra?.myRole, id]);

  const mode: "cliente" | "engenheiro" =
    projectRole == null ? fallbackMode : toAppViewRole(projectRole);
  const isEng = mode === "engenheiro";
  const isReadOnly =
    projectStatus === "concluida" || projectStatus === "pausada";
  const readOnlyLabel =
    projectStatus === "concluida" ? "Projeto concluido" : "Projeto arquivado";
  const projectName = obra?.nome ?? "Diário de Obra";

  // ── Hook de dados do diário ────────────────────────────────────────────────
  const {
    sections,
    isLoading,
    isLoadingMore,
    hasMore,
    isSaving,
    error,
    refresh,
    loadMore,
    createEntry,
    updateEntry,
    deleteEntry,
    deletePhoto,
  } = useDiaryData(id ?? "", { loadFullData: activeTab === "photos" });

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [lightboxPhotos, setLightboxPhotos] = useState<PhotoItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxEntryId, setLightboxEntryId] = useState<string | undefined>();
  const [showLightbox, setShowLightbox] = useState(false);
  const [pendingDeleteEntryId, setPendingDeleteEntryId] = useState<
    string | null
  >(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const diaryEntryCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.entries.length, 0),
    [sections],
  );
  const diaryLimitReached = diaryEntryCount >= PROJECT_ITEM_LIMIT;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const resolveEntryPhotos = useCallback(
    async (entryId: string): Promise<PhotoItem[]> => {
      const entry = sections
        .flatMap((section) => section.entries)
        .find((item) => item.id === entryId);

      if (!entry) return [];
      if (entry.photoCount <= entry.photos.length) return entry.photos;

      const fullPhotos = await dailyLogPhotosService.listByEntry(id ?? "", entryId);
      return fullPhotos
        .filter((photo) => photo.status === "READY" && photo.thumbUrl)
        .map((photo) => ({
          id: photo.id,
          thumbUrl: photo.thumbUrl!,
          status: "READY" as const,
        }));
    },
    [id, sections],
  );

  useEffect(() => {
    if (!isEng || isReadOnly) {
      setShowFormModal(false);
      setEditingEntry(null);
    }
    setShowLightbox(false);
  }, [isEng, isReadOnly]);

  // ── Handlers de entry ──────────────────────────────────────────────────────
  const handleOpenNewEntry = () => {
    if (!isEng || isReadOnly) return;
    if (diaryLimitReached) {
      showToast({
        title: "Limite atingido",
        message: getProjectItemLimitMessage("registros"),
        tone: "info",
        durationMs: 4000,
      });
      return;
    }
    setEditingEntry(null);
    setShowFormModal(true);
  };

  const handleEditEntry = (entryId: string) => {
    if (!isEng || isReadOnly) return;
    const entry = sections
      .flatMap((s) => s.entries)
      .find((e) => e.id === entryId);
    if (entry) {
      setEditingEntry(entry);
      setShowFormModal(true);
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!isEng || isReadOnly) return;
    setPendingDeleteEntryId(entryId);
  };

  const handleConfirmDeleteEntry = async () => {
    if (!pendingDeleteEntryId || isReadOnly) return;
    try {
      await deleteEntry(id ?? "", pendingDeleteEntryId);
    } catch {
      showToast({
        title: "Erro ao deletar",
        message: "Não foi possível deletar.",
        tone: "error",
      });
    } finally {
      setPendingDeleteEntryId(null);
    }
  };

  const handleSaveEntry = async (data: EntryFormData) => {
    if (isReadOnly) {
      showToast({
        title: readOnlyLabel,
        message: "O diario de obra esta somente leitura para este projeto.",
        tone: "info",
      });
      return;
    }
    if (editingEntry) {
      await updateEntry(id ?? "", editingEntry.id, data);
    } else {
      if (diaryLimitReached) {
        showToast({
          title: "Limite atingido",
          message: getProjectItemLimitMessage("registros"),
          tone: "info",
          durationMs: 4000,
        });
        return;
      }
      await createEntry(id ?? "", data);
    }
    setShowFormModal(false);
    setEditingEntry(null);
  };

  // ── Handler de foto ────────────────────────────────────────────────────────
  const handlePhotoPress = async (photos: PhotoItem[], index: number) => {
    const entry = sections
      .flatMap((s) => s.entries)
      .find(
        (e) => photos.length > 0 && e.photos.some((p) => p.id === photos[0].id),
      );

    const resolvedPhotos = entry ? await resolveEntryPhotos(entry.id) : photos;
    const selectedPhotoId = photos[index]?.id;
    const resolvedIndex = selectedPhotoId
      ? Math.max(
          resolvedPhotos.findIndex((photo) => photo.id === selectedPhotoId),
          0,
        )
      : index;

    setLightboxPhotos(resolvedPhotos);
    setLightboxIndex(resolvedIndex);
    setLightboxEntryId(entry?.id);
    setShowLightbox(true);
  };

  const handleDownloadEntryPhotos = async (entryId: string) => {
    const entry = sections
      .flatMap((s) => s.entries)
      .find((e) => e.id === entryId);

    const photos = entry ? await resolveEntryPhotos(entryId) : [];

    if (!entry || photos.length === 0) {
      showToast({ title: "Sem fotos neste registro", tone: "info" });
      return;
    }

    try {
      const urlResults = await Promise.allSettled(
        photos.map((p) =>
          dailyLogPhotosService.getOriginalUrl(p.id).then((r) => r.url),
        ),
      );

      const urls = urlResults
        .filter(
          (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled",
        )
        .map((r) => r.value);

      if (urls.length === 0) {
        showToast({ title: "Erro ao obter fotos", tone: "error" });
        return;
      }

      const { saved, failed } = await saveAllPhotosToGallery(urls);
      if (failed === urls.length) {
        showToast({
          title: "Permissão negada",
          message: "Permita o acesso à galeria nas configurações.",
          tone: "error",
          durationMs: 4000,
        });
      } else if (failed > 0) {
        showToast({
          title: "Parcialmente salvo",
          message: `${saved} foto(s) salva(s). ${failed} não puderam ser baixadas.`,
          tone: "info",
        });
      } else {
        showToast({ title: `${saved} foto(s) salva(s)!`, tone: "success" });
      }
    } catch {
      showToast({ title: "Erro ao baixar fotos", tone: "error" });
    }
  };

  const handleDeletePhoto = async (photoId: string, entryId: string) => {
    if (isReadOnly) return;
    try {
      await deletePhoto(id ?? "", photoId, entryId);
    } catch {
      showToast({
        title: "Erro ao remover foto",
        message: "Não foi possível deletar a foto.",
        tone: "error",
      });
    }
  };

  const showEngineerActions = isEng && activeTab === "timeline";

  // ── Estados de loading / error ─────────────────────────────────────────────
  if (isLoading && sections.length === 0) {
    return <DiaryLoadingScreen variant={mode} />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <DiaryHeader title={projectName} mode={mode} onModeChange={() => {}} />
        <View style={styles.centerState}>
          <MaterialIcons name="error-outline" size={48} color={colors.danger} />
          <Text style={styles.centerTitle}>Erro ao carregar</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.stickyHeader}>
        <DiaryHeader title={projectName} mode={mode} onModeChange={() => {}} />

        <DiaryTabsSegmented activeTab={activeTab} onTabChange={setActiveTab} />

        {showEngineerActions && (
          <View style={styles.actionsWrap}>
            {isReadOnly && (
              <Text style={styles.readOnlyHelper}>
                {readOnlyLabel}. Os registros do diário estão em modo somente
                leitura.
              </Text>
            )}
            <View style={styles.actionsRow}>
              {!isReadOnly && (
                <TouchableOpacity
                  style={[
                    styles.primaryAction,
                    diaryLimitReached && styles.primaryActionDisabled,
                  ]}
                  onPress={handleOpenNewEntry}
                  activeOpacity={diaryLimitReached ? 1 : 0.88}
                  disabled={diaryLimitReached}
                >
                  <MaterialIcons name="add" size={18} color={colors.white} />
                  <Text style={styles.primaryActionText}>
                    {diaryLimitReached ? "Limite atingido" : "Novo registro"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {!isReadOnly && diaryLimitReached && (
              <Text style={styles.limitHelper}>
                Limite de {PROJECT_ITEM_LIMIT} registros atingido. Exclua um
                registro para liberar novas insercoes.
              </Text>
            )}
            <View style={styles.actionsDivider} />
          </View>
        )}
      </View>

      {activeTab === "timeline" ? (
        mode === "cliente" ? (
          <ClientTimelineSection
            obra={(obra as any) ?? { id: id ?? "", nome: projectName }}
            sections={sections}
            onPhotoPress={handlePhotoPress}
            onDownloadEntry={handleDownloadEntryPhotos}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          />
        ) : (
          <EngineerTimelineSection
            sections={sections}
            projectId={id ?? ""}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
            onPhotoPress={handlePhotoPress}
            onDeletePhoto={handleDeletePhoto}
            canEdit={!isReadOnly}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          />
        )
      ) : activeTab === "photos" ? (
        <View style={styles.tabContent}>
          <PhotosTab
            sections={sections}
            canDelete={isEng && !isReadOnly}
            onDeletePhoto={(photoId, entryId) =>
              handleDeletePhoto(photoId, entryId)
            }
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
          <View style={{ height: spacing[12] + insets.bottom }} />
        </View>
      ) : (
        <View style={styles.tabContent}>
          <View style={styles.emptyPlaceholder}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons
                name="description"
                size={36}
                color={colors.iconMuted}
              />
            </View>
            <Text style={styles.emptyText}>Nenhum documento</Text>
            <Text style={styles.emptySubtext}>
              Os documentos do projeto aparecerão aqui assim que forem
              disponibilizados.
            </Text>
          </View>
          <View style={{ height: spacing[12] + insets.bottom }} />
        </View>
      )}

      {/* Modal de form (engenheiro) */}
      {isEng && (
        <EntryFormModal
          visible={showFormModal}
          editingEntry={editingEntry}
          onClose={() => {
            setShowFormModal(false);
            setEditingEntry(null);
          }}
          onSave={handleSaveEntry}
          onDeleteExistingPhoto={async (photoId) => {
            if (!editingEntry) return;
            await deletePhoto(id ?? "", photoId, editingEntry.id);
          }}
          isSaving={isSaving}
        />
      )}

      {/* Confirmação de deletar registro */}
      <ConfirmSheet
        visible={pendingDeleteEntryId !== null}
        icon="delete-outline"
        iconColor="#EF4444"
        title="Deletar registro?"
        message="O registro e todas as fotos associadas serão removidos permanentemente."
        confirmLabel="Deletar registro"
        onConfirm={handleConfirmDeleteEntry}
        onClose={() => setPendingDeleteEntryId(null)}
      />

      {/* Lightbox de fotos */}
      <ImageLightboxModal
        visible={showLightbox}
        photos={lightboxPhotos}
        initialIndex={lightboxIndex}
        onClose={() => setShowLightbox(false)}
        canDelete={isEng && !isReadOnly}
        projectId={id}
        entryId={lightboxEntryId}
        onDelete={(photoId) => {
          const entryId =
            sections
              .flatMap((s) => s.entries)
              .find((e) => e.photos.some((p) => p.id === photoId))?.id ?? "";
          if (entryId) handleDeletePhoto(photoId, entryId);
          setShowLightbox(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },

  stickyHeader: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerSoft,
    ...shadow(2, colors.black),
    zIndex: 10,
  },

  actionsWrap: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[10],
    backgroundColor: colors.white,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  primaryAction: {
    flex: 1,
    height: spacing[44],
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    ...shadow(2, colors.primary),
  },
  primaryActionDisabled: {
    backgroundColor: "#94A3B8",
    shadowColor: "transparent",
    elevation: 0,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  limitHelper: {
    marginTop: spacing[10],
    fontSize: 12,
    lineHeight: 18,
    color: colors.subtext,
    fontWeight: "600",
  },
  readOnlyHelper: {
    marginBottom: spacing[10],
    fontSize: 12,
    lineHeight: 18,
    color: colors.subtext,
    fontWeight: "600",
  },
  actionsDivider: {
    height: 1,
    backgroundColor: colors.dividerSoft,
    marginTop: spacing[12],
  },

  tabContent: {
    flex: 1,
    backgroundColor: colors.white,
  },
  emptyPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[40],
    gap: spacing[10],
  },
  emptyIconWrap: {
    width: spacing[80],
    height: spacing[80],
    borderRadius: radius["2xl"],
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.title,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Loading / Error states ──
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[40],
  },
  centerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.title,
    textAlign: "center",
  },
  centerText: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: spacing[8],
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
});
