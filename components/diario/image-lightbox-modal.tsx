import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppModal as Modal } from "@/components/ui/app-modal";
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { PhotoItem } from "@/hooks/use-diary-state";
import { dailyLogPhotosService } from "@/services/daily-log-photos.service";
import { useToast } from "@/components/obra/toast";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import {
  saveAllPhotosToGallery,
  savePhotoToGallery,
} from "@/utils/photo-download";

const PRIMARY = "#2563EB";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageLightboxModalProps {
  visible: boolean;
  photos: PhotoItem[];
  initialIndex?: number;
  onClose: () => void;
  canDelete?: boolean;
  onDelete?: (photoId: string) => void;
  projectId?: string;
  entryId?: string;
}

export function ImageLightboxModal({
  visible,
  photos,
  initialIndex = 0,
  onClose,
  canDelete = false,
  onDelete,
  projectId,
  entryId,
}: ImageLightboxModalProps) {
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [originalUrls, setOriginalUrls] = useState<Record<string, string>>({});
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const canDownloadAll = photos.length > 1;

  // Reset ao abrir
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setOriginalUrls({});

      const timeout = setTimeout(() => {
        scrollRef.current?.scrollTo({
          x: SCREEN_WIDTH * initialIndex,
          animated: false,
        });
      }, 80);
      return () => clearTimeout(timeout);
    }
  }, [visible, initialIndex]);

  // Busca URL original quando o índice muda
  const fetchOriginalUrl = useCallback(
    async (index: number) => {
      const photo = photos[index];
      if (!photo) return;
      if (originalUrls[photo.id]) return;

      setLoadingUrl(true);
      try {
        const { url } = await dailyLogPhotosService.getOriginalUrl(photo.id);
        setOriginalUrls((prev) => ({ ...prev, [photo.id]: url }));
      } catch {
        // fallback silencioso: exibe thumb
      } finally {
        setLoadingUrl(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos, originalUrls],
  );

  useEffect(() => {
    if (visible && photos.length > 0) {
      fetchOriginalUrl(currentIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, currentIndex, photos.length]);

  // ── Download foto atual ──────────────────────────────────────────────────────
  const handleDownload = async () => {
    const photo = photos[currentIndex];
    if (!photo || isDownloading || isDownloadingAll) return;

    setIsDownloading(true);
    try {
      let url = originalUrls[photo.id];
      if (!url) {
        const res = await dailyLogPhotosService.getOriginalUrl(photo.id);
        url = res.url;
        setOriginalUrls((prev) => ({ ...prev, [photo.id]: url }));
      }
      const ok = await savePhotoToGallery(url);
      if (ok) {
        showToast({ title: "Foto salva!", tone: "success" });
      } else {
        showToast({
          title: "Permissão negada",
          message: "Permita o acesso à galeria nas configurações.",
          tone: "error",
          durationMs: 4000,
        });
      }
    } catch {
      showToast({ title: "Erro ao salvar foto", tone: "error" });
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Download todas ─────────────────────────────────────────────────────────
  const handleDownloadAll = async () => {
    if (isDownloading || isDownloadingAll) return;

    setIsDownloadingAll(true);
    try {
      const urlResults = await Promise.allSettled(
        photos.map(async (photo) => {
          if (originalUrls[photo.id]) return originalUrls[photo.id];
          const { url } = await dailyLogPhotosService.getOriginalUrl(photo.id);
          return url;
        }),
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
        showToast({
          title: `${saved} foto(s) salva(s)!`,
          tone: "success",
        });
      }
    } catch {
      showToast({ title: "Erro ao salvar fotos", tone: "error" });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = () => setConfirmDeleteVisible(true);

  const handleConfirmDelete = () => {
    const photo = photos[currentIndex];
    if (!photo) return;
    onDelete?.(photo.id);
    if (photos.length <= 1) {
      onClose();
    } else {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  if (!visible || photos.length === 0) return null;

  const isBusy = isDownloading || isDownloadingAll;

  return (
    <>
      <Modal visible={visible} animationType="none" transparent={false}>
        <View style={styles.container}>
          <SafeAreaView style={styles.safe}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>
                  {photos.length > 1
                    ? `${currentIndex + 1} de ${photos.length}`
                    : "Foto"}
                </Text>
                {loadingUrl && (
                  <ActivityIndicator
                    size="small"
                    color={PRIMARY}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>

              {canDelete ? (
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={22}
                    color="#EF4444"
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.headerBtn} />
              )}
            </View>

            {/* Pager horizontal */}
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                );
                setCurrentIndex(idx);
              }}
              style={styles.pager}
            >
              {photos.map((photo) => {
                const src = originalUrls[photo.id] ?? photo.thumbUrl;
                return (
                  <ScrollView
                    key={photo.id}
                    style={styles.slideOuter}
                    contentContainerStyle={styles.slideContent}
                    maximumZoomScale={4}
                    minimumZoomScale={1}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    centerContent
                    bouncesZoom
                  >
                    {src ? (
                      <Image
                        source={{ uri: src }}
                        style={styles.image}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={styles.placeholder}>
                        <ActivityIndicator color={PRIMARY} size="large" />
                        <Text style={styles.placeholderText}>
                          Carregando...
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                );
              })}
            </ScrollView>

            {/* Dots indicator */}
            {photos.length > 1 && (
              <View style={styles.dotsRow}>
                {photos.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              {canDownloadAll ? (
                <View style={styles.footerRow}>
                  <TouchableOpacity
                    style={[styles.btnOutline, isBusy && styles.btnDisabled]}
                    onPress={handleDownload}
                    activeOpacity={0.8}
                    disabled={isBusy}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={PRIMARY} />
                    ) : (
                      <>
                        <MaterialIcons
                          name="file-download"
                          size={17}
                          color={PRIMARY}
                        />
                        <Text style={styles.btnOutlineText}>Esta foto</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnPrimary, isBusy && styles.btnDisabled]}
                    onPress={handleDownloadAll}
                    activeOpacity={0.85}
                    disabled={isBusy}
                  >
                    {isDownloadingAll ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialIcons
                          name="download-for-offline"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.btnPrimaryText}>
                          Todas ({photos.length})
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.footerRow}>
                  <TouchableOpacity
                    style={[styles.btnPrimary, isBusy && styles.btnDisabled]}
                    onPress={handleDownload}
                    activeOpacity={0.85}
                    disabled={isBusy}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialIcons
                          name="file-download"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.btnPrimaryText}>
                          Salvar na galeria
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Confirmação de delete (fora do Modal principal para aparecer acima) */}
      <ConfirmSheet
        visible={confirmDeleteVisible}
        icon="delete-outline"
        iconColor="#EF4444"
        title="Remover foto?"
        message="A foto será removida permanentemente e não poderá ser recuperada."
        confirmLabel="Remover foto"
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDeleteVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  pager: { flex: 1 },
  slideOuter: { width: SCREEN_WIDTH, backgroundColor: "#F9FAFB" },
  slideContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: SCREEN_HEIGHT * 0.55,
  },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6 },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 12 },
  placeholderText: { fontSize: 14, color: "#9CA3AF" },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  dotActive: { width: 20, borderRadius: 3, backgroundColor: PRIMARY },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerRow: { flexDirection: "row", gap: 10 },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 13,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  btnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    backgroundColor: "#EFF6FF",
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 0.1,
  },
  btnDisabled: { opacity: 0.55 },
});
