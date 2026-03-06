import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#2563EB";

export type DiaryTab = "timeline" | "photos" | "documents";

interface DiaryTabsSegmentedProps {
  activeTab: DiaryTab;
  onTabChange: (tab: DiaryTab) => void;
}

const DIARY_TABS = [
  { id: "timeline" as DiaryTab, label: "Linha do Tempo" },
  { id: "photos" as DiaryTab, label: "Fotos" },
  // { id: "documents" as DiaryTab, label: "Documentos" },
];

export function DiaryTabsSegmented({
  activeTab,
  onTabChange,
}: DiaryTabsSegmentedProps) {
  return (
    <View style={styles.segmentedWrap}>
      <View style={styles.segmented}>
        {DIARY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive && styles.segmentTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Divisor sutil pra dar “sticky header feel” */}
      <View style={styles.bottomDivider} />
    </View>
  );
}

const styles = StyleSheet.create({
  segmentedWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  segmentTextActive: {
    color: PRIMARY,
    fontWeight: "800",
  },
  bottomDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginTop: 10,
  },
});
