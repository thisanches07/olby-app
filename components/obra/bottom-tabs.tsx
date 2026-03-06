import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type TabId = string;

export interface TabDefinition {
  id: TabId;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}

interface BottomTabsProps {
  tabs: TabDefinition[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export function BottomTabs({ tabs, activeTab, onTabChange }: BottomTabsProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomTabs, { paddingBottom: insets.bottom + 8 }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onTabChange(tab.id)}
          >
            <MaterialIcons
              name={tab.icon}
              size={24}
              color={isActive ? PRIMARY : "#9CA3AF"}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 10, fontWeight: "500", color: "#9CA3AF" },
  tabLabelActive: { color: PRIMARY, fontWeight: "700" },
});
