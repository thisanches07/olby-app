import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface HomeSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

export function HomeSearchBar({
  value,
  onChangeText,
  onClear,
}: HomeSearchBarProps) {
  return (
    <View style={styles.searchContainer}>
      <MaterialIcons
        name="search"
        size={18}
        color="#9CA3AF"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar obra ou cliente"
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear}>
          <MaterialIcons name="close" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
});
