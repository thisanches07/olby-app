import type { ObraDetalhe } from "@/data/obras";
import type { DiarySection, PhotoItem } from "@/hooks/use-diary-state";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ClientSummaryCard } from "./client-summary-card";
import { DiaryEntryCard } from "./diary-entry-card";

interface ClientTimelineSectionProps {
  obra: ObraDetalhe;
  sections: DiarySection[];
  onPhotoPress: (photos: PhotoItem[], index: number) => void;
  onDownloadEntry?: (entryId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ClientTimelineSection({
  obra,
  sections,
  onPhotoPress,
  onDownloadEntry,
  onRefresh,
  isRefreshing = false,
}: ClientTimelineSectionProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
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
    >
      <ClientSummaryCard obra={obra} sections={sections as any} />

      {sections.map((section) => (
        <View key={section.title}>
          <Text style={styles.clientSectionLabel}>{section.title}</Text>

          {section.entries.map((entry, eIdx) => (
            <DiaryEntryCard
              key={entry.id}
              entry={entry}
              index={eIdx}
              totalInSection={section.entries.length}
              onPhotoPress={onPhotoPress}
              onDownloadAll={onDownloadEntry}
            />
          ))}
        </View>
      ))}

      {sections.length === 0 && (
        <View style={styles.clientEmpty}>
          <MaterialIcons name="article" size={52} color="#D1D5DB" />
          <Text style={styles.clientEmptyTitle}>Nenhum registro ainda</Text>
          <Text style={styles.clientEmptyText}>
            Os registros de visita aparecerão aqui
          </Text>
        </View>
      )}

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  clientSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 4,
  },
  clientEmpty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  clientEmptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  clientEmptyText: {
    fontSize: 13,
    color: "#D1D5DB",
    textAlign: "center",
  },
});
