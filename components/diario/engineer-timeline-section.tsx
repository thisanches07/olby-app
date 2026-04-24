import type { DiarySection, PhotoItem } from "@/hooks/use-diary-state";
import { useToast } from "@/components/obra/toast";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { dailyLogPhotosService } from "@/services/daily-log-photos.service";
import { saveAllPhotosToGallery } from "@/utils/photo-download";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EntryActions } from "./entry-actions";

const PRIMARY = "#2563EB";

function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}`;
}

interface EngineerTimelineSectionProps {
  sections: DiarySection[];
  projectId: string;
  onEditEntry: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onPhotoPress: (photos: PhotoItem[], index: number) => void;
  onDeletePhoto: (photoId: string, entryId: string) => void;
  canEdit?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function EngineerTimelineSection({
  sections,
  projectId,
  onEditEntry,
  onDeleteEntry,
  onPhotoPress,
  onDeletePhoto,
  canEdit = true,
  onRefresh,
  isRefreshing = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: EngineerTimelineSectionProps) {
  const { showToast } = useToast();
  const [pendingDeletePhoto, setPendingDeletePhoto] = useState<{
    photoId: string;
    entryId: string;
  } | null>(null);

  const handleDownloadAllPhotos = async (entryId: string) => {
    const entry = sections
      .flatMap((s) => s.entries)
      .find((e) => e.id === entryId);

    if (!entry || entry.photos.length === 0) {
      showToast({ title: "Sem fotos neste registro", tone: "info" });
      return;
    }

    try {
      const urlResults = await Promise.allSettled(
        entry.photos.map((p) =>
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

  return (
    <>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={sections.length === 0 ? styles.scrollEmpty : styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        ) : undefined
      }
      onScroll={({ nativeEvent }) => {
        if (!hasMore || isLoadingMore || !onLoadMore) return;
        const distanceFromBottom =
          nativeEvent.contentSize.height -
          nativeEvent.layoutMeasurement.height -
          nativeEvent.contentOffset.y;
        if (distanceFromBottom < 280) {
          onLoadMore();
        }
      }}
      scrollEventThrottle={16}
    >
      {sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <MaterialIcons name="article" size={40} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Nenhum registro ainda</Text>
          <Text style={styles.emptySubtext}>
            {canEdit
              ? "Toque em Novo registro para criar seu primeiro registro de visita."
              : "Este projeto esta em modo somente leitura."}
          </Text>
        </View>
      ) : null}
      {sections.map((section, sIdx) => (
        <View key={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>

          {section.entries.map((entry, eIdx) => {
            const durationLabel = formatDuration(entry.durationMinutes);

            return (
              <View key={entry.id}>
                <TouchableOpacity
                  activeOpacity={0.97}
                  onPress={canEdit ? () => onEditEntry(entry.id) : undefined}
                >
                {/* Data / hora / duração + ações */}
                <View style={styles.entryHeader}>
                  <View style={styles.entryMeta}>
                    {entry.isToday && <View style={styles.todayDot} />}
                    <View style={styles.metaRow}>
                      <Text
                        style={[
                          styles.entryDate,
                          entry.isToday && styles.entryDateToday,
                        ]}
                      >
                        {entry.date} • {entry.time}
                      </Text>
                      {!!durationLabel && (
                        <View style={styles.durationPill}>
                          <MaterialIcons
                            name="schedule"
                            size={12}
                            color={entry.isToday ? PRIMARY : "#6B7280"}
                          />
                          <Text
                            style={[
                              styles.durationText,
                              entry.isToday && styles.durationTextToday,
                            ]}
                          >
                            {durationLabel}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {canEdit ? (
                    <EntryActions
                      entryId={entry.id}
                      onEdit={onEditEntry}
                      onDelete={onDeleteEntry}
                      hasPhotos={entry.photoCount > 0}
                      onDownloadAll={handleDownloadAllPhotos}
                    />
                  ) : null}
                </View>

                {/* Título */}
                <Text style={styles.entryTitle}>{entry.title}</Text>

                {/* Galeria de fotos */}
                {entry.photos.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosScroll}
                    contentContainerStyle={styles.photosContent}
                  >
                    {entry.photos.map((photo, photoIdx) => (
                      <TouchableOpacity
                        key={photo.id}
                        onPress={() => onPhotoPress(entry.photos, photoIdx)}
                        activeOpacity={0.8}
                        style={styles.photoItem}
                      >
                        <Image
                          source={{ uri: photo.thumbUrl }}
                          style={styles.photoImage}
                          contentFit="cover"
                        />
                        {/* Badge "+N" na primeira foto */}
                        {photoIdx === 0 && entry.photoCount > 1 && (
                          <View style={styles.photoBadge}>
                            <MaterialIcons
                              name="photo-library"
                              size={11}
                              color="#FFFFFF"
                            />
                            <Text style={styles.photoBadgeText}>
                              +{entry.photoCount - 1}
                            </Text>
                          </View>
                        )}
                        {/* Botão deletar foto */}
                        {canEdit && (
                          <TouchableOpacity
                            style={styles.photoDeleteBtn}
                            onPress={() =>
                              setPendingDeletePhoto({
                                photoId: photo.id,
                                entryId: entry.id,
                              })
                            }
                            activeOpacity={0.8}
                          >
                            <MaterialIcons
                              name="close"
                              size={12}
                              color="#FFFFFF"
                            />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noPhotosChip}>
                    <MaterialIcons
                      name="photo-camera"
                      size={13}
                      color="#D1D5DB"
                    />
                    <Text style={styles.noPhotosText}>
                      Sem registros fotográficos
                    </Text>
                  </View>
                )}

                {/* Descrição */}
                {!!entry.description && (
                  <Text style={styles.entryDesc}>{entry.description}</Text>
                )}
                </TouchableOpacity>

                {eIdx < section.entries.length - 1 && (
                  <View style={styles.entryDivider} />
                )}
              </View>
            );
          })}

          {sIdx < sections.length - 1 && (
            <View style={styles.sectionDivider} />
          )}
        </View>
      ))}

      <View style={{ height: 16 }} />
      {isLoadingMore ? (
        <View style={styles.loadMoreWrap}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadMoreText}>Carregando mais registros...</Text>
        </View>
      ) : null}
    </ScrollView>

    <ConfirmSheet
      visible={canEdit && pendingDeletePhoto !== null}
      icon="delete-outline"
      iconColor="#EF4444"
      title="Remover foto?"
      message="A foto será removida permanentemente e não poderá ser recuperada."
      confirmLabel="Remover foto"
      onConfirm={() => {
        if (pendingDeletePhoto) {
          onDeletePhoto(pendingDeletePhoto.photoId, pendingDeletePhoto.entryId);
        }
        setPendingDeletePhoto(null);
      }}
      onClose={() => setPendingDeletePhoto(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  scrollEmpty: {
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 20,
  },
  loadMoreWrap: {
    paddingTop: 4,
    paddingBottom: 20,
    alignItems: "center",
    gap: 8,
  },
  loadMoreText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  entryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  entryDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.4,
  },
  entryDateToday: {
    color: PRIMARY,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  durationText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.2,
  },
  durationTextToday: {
    color: PRIMARY,
  },
  entryTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 26,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  photosScroll: {
    marginBottom: 14,
  },
  photosContent: {
    gap: 10,
  },
  photoItem: {
    position: "relative",
  },
  photoImage: {
    width: 170,
    height: 210,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  noPhotosChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 14,
  },
  noPhotosText: {
    fontSize: 12,
    color: "#D1D5DB",
    fontWeight: "500",
  },
  photoBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  photoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  photoDeleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  entryDesc: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 10,
  },
  entryDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 20,
  },
});
