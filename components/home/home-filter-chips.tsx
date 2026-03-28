import * as Haptics from "expo-haptics";
import React from "react";
import { FlatList, Platform, StyleSheet, Text } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { colors } from "@/theme/colors";

interface FilterChip {
  label: string;
  value: string;
}

interface HomeFilterChipsProps {
  filters: FilterChip[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
}

export function HomeFilterChips({
  filters,
  activeFilter,
  onFilterChange,
}: HomeFilterChipsProps) {
  return (
    <FlatList
      horizontal
      data={filters}
      keyExtractor={(item) => item.value}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <PressableScale
          style={[styles.chip, activeFilter === item.value && styles.chipActive]}
          scaleTo={0.94}
          onPress={() => {
            if (Platform.OS === "ios") {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onFilterChange(item.value);
          }}
        >
          <Text
            style={[
              styles.text,
              activeFilter === item.value && styles.textActive,
            ]}
          >
            {item.label}
          </Text>
        </PressableScale>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
    fontFamily: "Inter-Regular",
  },
  textActive: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
  },
});
