import { ShareProjectButton } from "@/components/projeto/share-project-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import type { ProjectApiRole } from "@/utils/project-role";
import { canManageMembers } from "@/utils/project-role";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ObraHeaderProps {
  title: string;
  projectId: string;
  projectRole: ProjectApiRole;
  onBack?: () => void;
  titleVisible?: boolean;
}

export function ObraHeader({
  title,
  projectId,
  projectRole,
  onBack,
  titleVisible = true,
}: ObraHeaderProps) {
  const inner = (
    <View style={styles.row}>
      <PressableScale
        style={styles.headerBtn}
        onPress={onBack ?? (() => router.back())}
        scaleTo={0.88}
      >
        <MaterialIcons name="chevron-left" size={28} color="#111827" />
      </PressableScale>

      <View style={styles.headerCenter}>
        {titleVisible ? (
          <>
            <Text style={styles.headerLabel}>PROJETO</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </>
        ) : null}
      </View>

      {canManageMembers(projectRole) ? (
        <ShareProjectButton
          projectId={projectId}
          projectName={title}
          projectRole={projectRole}
        />
      ) : (
        <View style={styles.headerBtn} />
      )}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
});
