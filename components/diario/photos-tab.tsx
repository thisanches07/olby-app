import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { DiarySection, PhotoItem } from "@/hooks/use-diary-state";
import { ImageLightboxModal } from "./image-lightbox-modal";

interface PhotoWithMetadata {
  photo: PhotoItem;
  entryTitle: string;
  date: string;
  time: string;
  entryId: string;
}

interface PhotosTabProps {
  sections: DiarySection[];
  canDelete?: boolean;
  onDeletePhoto?: (photoId: string, entryId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PhotosTab({
  sections,
  canDelete = false,
  onDeletePhoto,
  onRefresh,
  isRefreshing = false,
}: PhotosTabProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  // Flatten todas as fotos com metadata
  const photosWithMeta: PhotoWithMetadata[] = sections.flatMap((section) =>
    section.entries.flatMap((entry) =>
      entry.photos.map((photo) => ({
        photo,
        entryTitle: entry.title,
        date: entry.date,
        time: entry.time,
        entryId: entry.id,
      })),
    ),
  );

  const allPhotos: PhotoItem[] = photosWithMeta.map((p) => p.photo);

  const handleDeleteInLightbox = (photoId: string) => {
    const meta = photosWithMeta.find((p) => p.photo.id === photoId);
    if (meta) {
      onDeletePhoto?.(photoId, meta.entryId);
    }
    setShowImageLightbox(false);
  };

  return (
    <>
      <FlatList
        data={photosWithMeta}
        keyExtractor={(item) => item.photo.id}
        numColumns={2}
        columnWrapperStyle={photosWithMeta.length > 0 ? styles.columnWrapper : undefined}
        contentContainerStyle={photosWithMeta.length === 0 ? styles.emptyContainer : styles.listContent}
        scrollEnabled
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
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <MaterialIcons name="photo-camera" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhuma foto ainda</Text>
            <Text style={styles.emptySubtext}>
              As fotos adicionadas aos registros aparecerão aqui
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => {
              setSelectedPhotoIndex(index);
              setShowImageLightbox(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.photoCard}>
              <Image
                source={{ uri: item.photo.thumbUrl }}
                style={styles.photoImage}
                contentFit="cover"
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.entryTitle}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.date} • {item.time}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <ImageLightboxModal
        visible={showImageLightbox}
        photos={allPhotos}
        initialIndex={selectedPhotoIndex}
        onClose={() => setShowImageLightbox(false)}
        canDelete={canDelete}
        onDelete={handleDeleteInLightbox}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flexGrow: 1,
  },
  emptyInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  columnWrapper: {
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  photoCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F3F4F6",
  },
  cardInfo: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
});
