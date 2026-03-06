import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#2563EB";

type BottomTabId = "diary" | "overview" | "team" | "more";

interface DiaryBottomNavProps {
  activeBottomTab: BottomTabId;
  onTabChange: (tab: BottomTabId) => void;
  showFab: boolean;
  onFabPress: () => void;
}

export function DiaryBottomNav({
  activeBottomTab,
  onTabChange,
  showFab,
  onFabPress,
}: DiaryBottomNavProps) {
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.bottomItem}
        onPress={() => onTabChange("diary")}
      >
        <MaterialIcons
          name="history"
          size={24}
          color={activeBottomTab === "diary" ? PRIMARY : "#9CA3AF"}
        />
        <Text
          style={[
            styles.bottomLabel,
            activeBottomTab === "diary" && styles.bottomLabelActive,
          ]}
        >
          DIÁRIO
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.bottomItem}
        onPress={() => onTabChange("overview")}
      >
        <MaterialIcons
          name="grid-view"
          size={24}
          color={activeBottomTab === "overview" ? PRIMARY : "#9CA3AF"}
        />
        <Text
          style={[
            styles.bottomLabel,
            activeBottomTab === "overview" && styles.bottomLabelActive,
          ]}
        >
          VISÃO GERAL
        </Text>
      </TouchableOpacity>

      {/* FAB central */}
      {showFab ? (
        <TouchableOpacity
          style={styles.fabCenter}
          onPress={onFabPress}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.fabCenter} />
      )}

      <TouchableOpacity
        style={styles.bottomItem}
        onPress={() => onTabChange("team")}
      >
        <MaterialIcons
          name="group"
          size={24}
          color={activeBottomTab === "team" ? PRIMARY : "#9CA3AF"}
        />
        <Text
          style={[
            styles.bottomLabel,
            activeBottomTab === "team" && styles.bottomLabelActive,
          ]}
        >
          EQUIPE
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.bottomItem}
        onPress={() => onTabChange("more")}
      >
        <MaterialIcons
          name="more-horiz"
          size={24}
          color={activeBottomTab === "more" ? PRIMARY : "#9CA3AF"}
        />
        <Text
          style={[
            styles.bottomLabel,
            activeBottomTab === "more" && styles.bottomLabelActive,
          ]}
        >
          MAIS
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: "center",
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  bottomLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  bottomLabelActive: {
    color: PRIMARY,
  },
  fabCenter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    marginHorizontal: 4,
  },
});
