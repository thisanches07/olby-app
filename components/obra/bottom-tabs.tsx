import { PRIMARY } from "@/utils/obra-utils";
import { tapLight } from "@/utils/haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BlurView } from "expo-blur";
import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/ui/pressable-scale";

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

const FALLBACK_TAB_WIDTH = 80;

export function BottomTabs({ tabs, activeTab, onTabChange }: BottomTabsProps) {
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);

  const tabCount = tabs.length;
  const tabItemWidth = containerWidth > 0 ? containerWidth / tabCount : FALLBACK_TAB_WIDTH;

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);
  const indicatorX = useSharedValue(activeIndex * tabItemWidth);

  useEffect(() => {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    indicatorX.value = withSpring(idx * tabItemWidth, {
      damping: 20,
      stiffness: 280,
    });
  }, [activeTab, tabs, tabItemWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  };

  const content = (
    <View style={[styles.inner, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.tabsContainer} onLayout={handleLayout}>
        {/* Pill indicator deslizante */}
        <View style={[styles.indicatorTrack, { width: containerWidth }]}>
          <Animated.View style={[styles.indicator, { width: tabItemWidth }, indicatorStyle]} />
        </View>

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <PressableScale
              key={tab.id}
              style={[styles.tabItem, { width: tabItemWidth }]}
              onPress={() => {
                tapLight();
                onTabChange(tab.id);
              }}
              scaleTo={0.88}
              haptic="none"
            >
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={isActive ? PRIMARY : "#9CA3AF"}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <BlurView
        intensity={85}
        tint="systemChromeMaterial"
        style={styles.blurWrapper}
      >
        <View style={styles.borderTop} />
        {content}
      </BlurView>
    );
  }

  return (
    <View style={styles.androidWrapper}>
      <View style={styles.borderTop} />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  blurWrapper: {
    // sem position absolute — fica em fluxo normal dentro do bottomArea
  },
  androidWrapper: {
    backgroundColor: "rgba(255,255,255,0.97)",
  },
  borderTop: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  inner: {
    paddingTop: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    position: "relative",
    width: "100%",
  },
  indicatorTrack: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 3,
    overflow: "hidden",
  },
  indicator: {
    height: 3,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
  tabItem: { alignItems: "center", gap: 4, paddingVertical: 4 },
  tabLabel: { fontSize: 10, fontWeight: "500", color: "#9CA3AF" },
  tabLabelActive: { color: PRIMARY, fontWeight: "700" },
});
