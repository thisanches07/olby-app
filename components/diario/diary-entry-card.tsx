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
  const hasPhotos = entry.photoCount > 0;
  const isLast = index === totalInSection - 1;

  return (
    <View style={styles.clientItem}>
      {/* Timeline indicator */}
      <View style={styles.clientIndicator}>
        <View style={[styles.clientDot, entry.isToday && styles.clientDotActive]} />
        {!isLast && <View style={styles.clientLine} />}
      </View>

      {/* Card */}
      <View style={styles.clientCard}>
        {/* Metadata row */}
        <View style={styles.clientCardTop}>
          <View style={styles.clientCardTopLeft}>
            {/* Day chip */}
            <View style={[styles.clientDayChip, entry.isToday && styles.clientDayChipToday]}>
              <Text style={[styles.clientDayText, entry.isToday && styles.clientDayTextToday]}>
                {entry.date}
              </Text>
            </View>

            {/* Separator dot */}
            <View style={styles.metaSep} />

            {/* Time */}
            <Text style={styles.clientTimeText}>{entry.time}</Text>

            {/* Duration */}
            {!!durationLabel && (
              <>
                <View style={styles.metaSep} />
                <View style={styles.clientDurationPill}>
                  <MaterialIcons
                    name="schedule"
                    size={11}
                    color={entry.isToday ? PRIMARY : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      styles.clientDurationText,
                      entry.isToday && styles.clientDurationTextToday,
                    ]}
                  >
                    {durationLabel}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* More button */}
          {hasPhotos && onDownloadAll && (
            <>
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.moreBtn}
              >
                <MaterialIcons name="more-horiz" size={16} color="#9CA3AF" />
              </TouchableOpacity>
              <ActionMenuSheet
                visible={menuVisible}
                actions={[
                  {
                    label: `Baixar fotos (${entry.photoCount})`,
                    icon: "file-download",
                    onPress: () => onDownloadAll(entry.id),
                  },
                ]}
                onClose={() => setMenuVisible(false)}
              />
            </>
          )}
        </View>

        {/* Title */}
        <Text style={styles.clientCardTitle} numberOfLines={2}>
          {entry.title}
        </Text>

        {/* Photos */}
        {entry.photos.length === 1 ? (
          <TouchableOpacity
            style={styles.clientSinglePhotoWrap}
            onPress={() => onPhotoPress(entry.photos, 0)}
            activeOpacity={0.9}
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
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: photo.thumbUrl }}
                  style={styles.clientPhotoThumb}
                  contentFit="cover"
                />
                {pIdx === 1 && entry.photoCount > 2 && (
                  <View style={styles.clientPhotoMoreOverlay}>
                    <Text style={styles.clientPhotoMoreText}>
                      +{entry.photoCount - 2}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Description */}
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
    marginBottom: 14,
  },

  // ── Timeline ───────────────────────────────────────────
  clientIndicator: {
    width: 22,
    alignItems: "center",
    paddingTop: 16,
  },
  clientDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: "#DBEAFE",
    backgroundColor: "#FFFFFF",
  },
  clientDotActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  clientLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: "#EEF0F6",
    marginTop: 4,
  },

  // ── Card ───────────────────────────────────────────────
  clientCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#F0F4FB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  // ── Top metadata row ───────────────────────────────────
  clientCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  clientCardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
  },

  // Day chip
  clientDayChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: "#F1F4F9",
  },
  clientDayChipToday: {
    backgroundColor: PRIMARY,
  },
  clientDayText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.4,
  },
  clientDayTextToday: {
    color: "#FFFFFF",
  },

  // Time
  clientTimeText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // Duration pill
  clientDurationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F8FAFF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#E8EDF5",
  },
  clientDurationText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  clientDurationTextToday: {
    color: PRIMARY,
    fontWeight: "700",
  },

  // More button
  moreBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
  },

  // ── Title ─────────────────────────────────────────────
  clientCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 21,
    letterSpacing: -0.3,
    marginBottom: 10,
  },

  // ── Photos ────────────────────────────────────────────
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
    gap: 8,
    marginBottom: 10,
  },
  clientPhotoWrap: {
    flex: 1,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
  },
  clientPhotoThumb: {
    width: "100%",
    height: 140,
  },
  clientPhotoMoreOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  clientPhotoMoreText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
});
