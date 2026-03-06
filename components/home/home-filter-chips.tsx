import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

const PRIMARY = "#2563EB";

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
        <TouchableOpacity
          style={[styles.chip, activeFilter === item.value && styles.chipActive]}
          onPress={() => onFilterChange(item.value)}
        >
          <Text
            style={[
              styles.text,
              activeFilter === item.value && styles.textActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
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
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  text: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  textActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
