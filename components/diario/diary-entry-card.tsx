import { ExpandableDescription } from "@/components/diario/expandable-description";
import type { DiaryEntry, PhotoItem } from "@/hooks/use-diary-state";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ActionMenuSheet } from "./action-menu-sheet";

const PRIMARY = "#2563EB";

function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}`;
}

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  index: number;
  totalInSection: number;
  onPhotoPress: (photos: PhotoItem[], index: number) => void;
  onDownloadAll?: (entryId: string) => void;
}

export function DiaryEntryCard({
  entry,
  index,
  totalInSection,
  onPhotoPress,
  onDownloadAll,
}: DiaryEntryCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const durationLabel = formatDuration(entry.durationMinutes);

  const hasPhotos = entry.photos.length > 0;

  return (
    <View style={styles.clientItem}>
      {/* Indicador esquerdo */}
      <View style={styles.clientIndicator}>
        <View
          style={[styles.clientDot, entry.isToday && styles.clientDotActive]}
        />
        {index < totalInSection - 1 && <View style={styles.clientLine} />}
      </View>

      {/* Card */}
      <View style={styles.clientCard}>
        {/* Data + hora + duração + menu */}
        <View style={styles.clientCardTop}>
          <View style={styles.clientCardTopLeft}>
            <View
              style={[
                styles.clientDateBadge,
                entry.isToday && styles.clientDateBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.clientDateText,
                  entry.isToday && styles.clientDateTextActive,
                ]}
              >
                {entry.date}
              </Text>
            </View>

            <Text style={styles.clientTimeText}>{entry.time}</Text>

            {!!durationLabel && (
              <View style={styles.clientHorasBadge}>
                <MaterialIcons
                  name="schedule"
                  size={11}
                  color={entry.isToday ? PRIMARY : "#6B7280"}
                />
                <Text
                  style={[
                    styles.clientHorasText,
                    entry.isToday && styles.clientHorasTextToday,
                  ]}
                >
                  {durationLabel}
                </Text>
              </View>
            )}
          </View>

          {/* Botão ... (visível quando há fotos e callback fornecido) */}
          {hasPhotos && onDownloadAll && (
            <>
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.moreBtn}
              >
                <MaterialIcons name="more-horiz" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              <ActionMenuSheet
                visible={menuVisible}
                actions={[
                  {
                    label: `Baixar fotos (${entry.photos.length})`,
                    icon: "file-download",
                    onPress: () => onDownloadAll(entry.id),
                  },
                ]}
                onClose={() => setMenuVisible(false)}
              />
            </>
          )}
        </View>

        {/* Título */}
        <Text style={styles.clientCardTitle} numberOfLines={2}>
          {entry.title}
        </Text>

        {/* Fotos */}
        {entry.photos.length === 1 ? (
          <TouchableOpacity
            style={styles.clientSinglePhotoWrap}
            onPress={() => onPhotoPress(entry.photos, 0)}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: entry.photos[0].thumbUrl }}
              style={styles.clientSinglePhoto}
              contentFit="cover"
            />
          </TouchableOpacity>
        ) : entry.photos.length > 1 ? (
          <View style={styles.clientPhotoRow}>
            {entry.photos.slice(0, 2).map((photo, pIdx) => (
              <TouchableOpacity
                key={photo.id}
                style={styles.clientPhotoWrap}
                onPress={() => onPhotoPress(entry.photos, pIdx)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: photo.thumbUrl }}
                  style={styles.clientPhotoThumb}
                  contentFit="cover"
                />
                {pIdx === 1 && entry.photos.length > 2 && (
                  <View style={styles.clientPhotoMoreOverlay}>
                    <Text style={styles.clientPhotoMoreText}>
                      +{entry.photos.length - 2}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Descrição */}
        {entry.description ? (
          <ExpandableDescription description={entry.description} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clientItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  clientIndicator: {
    width: 24,
    alignItems: "center",
    paddingTop: 14,
  },
  clientDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: "#FFFFFF",
  },
  clientDotActive: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  clientLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 4,
  },
  clientCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  clientCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  clientCardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  clientDateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  clientDateBadgeActive: {
    backgroundColor: PRIMARY,
  },
  clientDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.3,
  },
  clientDateTextActive: {
    color: "#FFFFFF",
  },
  clientTimeText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  clientHorasBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clientHorasText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  clientHorasTextToday: {
    color: PRIMARY,
    fontWeight: "800",
  },
  clientCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  clientSinglePhotoWrap: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  clientSinglePhoto: {
    width: "100%",
    height: 180,
  },
  clientPhotoRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  clientPhotoWrap: {
    flex: 1,
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
  },
  clientPhotoThumb: {
    width: "100%",
    height: 120,
  },
  clientPhotoMoreOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  clientPhotoMoreText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
