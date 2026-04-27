import { ImageLightboxModal } from "@/components/diario/image-lightbox-modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { PhotoItem } from "@/hooks/use-diary-state";
import { dailyLogEntriesService } from "@/services/daily-log-entries.service";
import {
  dailyLogPhotosService,
  type DailyLogPhotoDto,
  type DailyLogProjectPhotoDto,
} from "@/services/daily-log-photos.service";
import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GalleryPhoto {
  photoItem: PhotoItem;
  dateLabel: string;
  entryId: string;
}

function CompactGallerySkeleton() {
  return (
    <>
      <View style={styles.galeriaHeader}>
        <View style={styles.galeriaHeaderLeft}>
          <Skeleton width={116} height={10} borderRadius={5} />
          <Skeleton width={44} height={10} borderRadius={5} />
        </View>
        <View style={styles.verTudoBtn}>
          <Skeleton width={48} height={12} borderRadius={6} />
          <Skeleton width={10} height={10} borderRadius={5} />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galeriaScroll}
      >
        <View style={styles.galeriaItem}>
          <Skeleton width="100%" height={110} borderRadius={14} />
        </View>
        <View style={styles.galeriaItem}>
          <Skeleton width="100%" height={110} borderRadius={14} />
        </View>
        <View style={styles.galeriaItem}>
          <Skeleton width="100%" height={110} borderRadius={14} />
        </View>
      </ScrollView>
    </>
  );
}

function FullGallerySkeleton({
  showDiaryButton,
}: {
  showDiaryButton: boolean;
}) {
  return (
    <View style={styles.fullContainer}>
      <View style={styles.fullHeader}>
        <Skeleton width={124} height={20} borderRadius={8} />
        <Skeleton width={58} height={12} borderRadius={6} />
      </View>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Skeleton width="100%" height="100%" borderRadius={14} />
        </View>
        <View style={styles.gridItem}>
          <Skeleton width="100%" height="100%" borderRadius={14} />
        </View>
        <View style={styles.gridItem}>
          <Skeleton width="100%" height="100%" borderRadius={14} />
        </View>
        <View style={styles.gridItem}>
          <Skeleton width="100%" height="100%" borderRadius={14} />
        </View>
      </View>

      {showDiaryButton && (
        <View style={styles.diaryButton}>
          <Skeleton width={18} height={18} borderRadius={5} />
          <Skeleton
            width="62%"
            height={14}
            borderRadius={7}
            style={styles.flex1}
          />
          <Skeleton width={18} height={18} borderRadius={9} />
        </View>
      )}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatDateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.substring(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const todayISO = toISODate(new Date());
  if (isoDate === todayISO) return "Hoje";
  const diffDays = Math.floor(
    (new Date(todayISO).getTime() - date.getTime()) / 86_400_000,
  );
  if (diffDays === 1) return "Ontem";
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClienteGalleryProps {
  projectId: string;
  onViewAll?: () => void;
  onViewDiary?: () => void;
  fullView?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClienteGallery({
  projectId,
  onViewAll,
  onViewDiary,
  fullView = false,
}: ClienteGalleryProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  const mapProjectPhotoToGallery = useCallback(
    (photo: DailyLogProjectPhotoDto): GalleryPhoto => ({
      photoItem: {
        id: photo.id,
        thumbUrl: photo.thumbUrl,
        status: "READY",
      },
      dateLabel: formatDateLabel(photo.date),
      entryId: photo.entryId,
    }),
    [],
  );

  const mapEntryPhotoToGallery = useCallback(
    (entryDate: string, photo: DailyLogPhotoDto): GalleryPhoto => ({
      photoItem: {
        id: photo.id,
        thumbUrl: photo.thumbUrl!,
        status: "READY",
      },
      dateLabel: formatDateLabel(entryDate),
      entryId: photo.entryId,
    }),
    [],
  );

  const loadCompactPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const recentPhotos = await dailyLogPhotosService.listByProject(
        projectId,
        5,
      );
      setPhotos(recentPhotos.map(mapProjectPhotoToGallery));
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [mapProjectPhotoToGallery, projectId]);

  const loadFullPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const entries = await dailyLogEntriesService.listByProject(projectId);

      const results = await Promise.allSettled(
        entries.map(async (entry) => {
          const entryPhotos = await dailyLogPhotosService.listByEntry(
            projectId,
            entry.id,
          );
          return entryPhotos
            .filter((p) => p.status === "READY" && p.thumbUrl)
            .map((p) => mapEntryPhotoToGallery(entry.date, p));
        }),
      );

      const flat = results.flatMap((r) =>
        r.status === "fulfilled" ? r.value : [],
      );
      setPhotos(flat);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [mapEntryPhotoToGallery, projectId]);

  useEffect(() => {
    if (fullView) {
      void loadFullPhotos();
      return;
    }
    void loadCompactPhotos();
  }, [fullView, loadCompactPhotos, loadFullPhotos]);

  const openPhoto = (idx: number) => {
    setSelectedIndex(idx);
    setShowLightbox(true);
  };

  const photoItems = photos.map((p) => p.photoItem);

  // ── Full view ───────────────────────────────────────────────────────────────

  if (fullView) {
    if (loading) {
      return <FullGallerySkeleton showDiaryButton={!!onViewDiary} />;
    }

    return (
      <>
        <View style={styles.fullContainer}>
          <View style={styles.fullHeader}>
            <Text style={styles.fullTitle}>Galeria da Obra</Text>
            <Text style={styles.photoCount}>{photos.length} fotos</Text>
          </View>

          {photos.length === 0 ? (
            <View style={styles.emptyFull}>
              <MaterialIcons name="photo-library" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Nenhuma foto ainda</Text>
              <Text style={styles.emptyText}>
                As fotos adicionadas ao diário de obra aparecerão aqui.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {photos.map((item, idx) => (
                <TouchableOpacity
                  key={item.photoItem.id}
                  style={styles.gridItem}
                  activeOpacity={0.85}
                  onPress={() => openPhoto(idx)}
                >
                  <Image
                    source={{ uri: item.photoItem.thumbUrl }}
                    style={styles.gridImage}
                    contentFit="cover"
                  />
                  <View style={styles.gridDateBadge}>
                    <Text style={styles.gridDateText}>{item.dateLabel}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {onViewDiary && (
            <TouchableOpacity
              style={styles.diaryButton}
              onPress={onViewDiary}
              activeOpacity={0.85}
            >
              <MaterialIcons name="assignment" size={18} color={PRIMARY} />
              <Text style={styles.diaryButtonText}>
                Ver Diário Completo de Obra
              </Text>
              <MaterialIcons name="chevron-right" size={18} color={PRIMARY} />
            </TouchableOpacity>
          )}
        </View>

        <ImageLightboxModal
          visible={showLightbox}
          photos={photoItems}
          initialIndex={selectedIndex}
          onClose={() => setShowLightbox(false)}
          projectId={projectId}
        />
      </>
    );
  }

  // ── Compact view (visao_geral tab) ─────────────────────────────────────────

  if (loading) {
    return <CompactGallerySkeleton />;
  }

  if (photos.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.galeriaHeader}>
        <View style={styles.galeriaHeaderLeft}>
          <Text style={styles.sectionTitle}>GALERIA RECENTE</Text>
        </View>
        <TouchableOpacity onPress={onViewAll} style={styles.verTudoBtn}>
          <Text style={styles.verTudo}>Ver tudo</Text>
          <MaterialIcons name="arrow-forward-ios" size={10} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galeriaScroll}
      >
        {photos.map((item, idx) => (
          <TouchableOpacity
            key={item.photoItem.id}
            style={styles.galeriaItem}
            activeOpacity={0.85}
            onPress={() => openPhoto(idx)}
          >
            <Image
              source={{ uri: item.photoItem.thumbUrl }}
              style={styles.galeriaImage}
              contentFit="cover"
            />
            <View style={styles.galeriaBadge}>
              <Text style={styles.galeriaBadgeText}>{item.dateLabel}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ImageLightboxModal
        visible={showLightbox}
        photos={photoItems}
        initialIndex={selectedIndex}
        onClose={() => setShowLightbox(false)}
        projectId={projectId}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // ── Loading ──────────────────────────────────────────────────────────────
  // ── Empty (full view) ─────────────────────────────────────────────────────
  emptyFull: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },

  // ── Compact header ────────────────────────────────────────────────────────
  galeriaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  galeriaHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
  },
  photoCountSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D1D5DB",
  },
  verTudoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  verTudo: { fontSize: 13, fontWeight: "600", color: PRIMARY },

  // ── Compact scroll ────────────────────────────────────────────────────────
  galeriaScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  galeriaItem: {
    width: 140,
    height: 110,
    borderRadius: 14,
    overflow: "hidden",
  },
  galeriaImage: {
    width: 140,
    height: 110,
  },
  galeriaBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  galeriaBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // ── Full view ─────────────────────────────────────────────────────────────
  fullContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  fullHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  fullTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  photoCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "48%",
    aspectRatio: 1.2,
    borderRadius: 14,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridDateBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  gridDateText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  diaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#EFF6FF",
    paddingVertical: 14,
    borderRadius: 12,
  },
  diaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
    flex: 1,
    textAlign: "center",
  },
  flex1: {
    flex: 1,
  },
});
