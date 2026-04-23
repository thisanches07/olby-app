import { ClienteTeamModal } from "@/components/obra/cliente-team-modal";
import { ShareProjectButton } from "@/components/projeto/share-project-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { colors } from "@/theme/colors";
import type { ProjectAccessMember } from "@/utils/project-members";
import type { ProjectApiRole } from "@/utils/project-role";
import { canManageMembers } from "@/utils/project-role";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface ObraHeaderProps {
  title: string;
  projectId: string;
  projectRole: ProjectApiRole;
  members?: ProjectAccessMember[];
  onBack?: () => void;
}

export function ObraHeader({
  title,
  projectId,
  projectRole,
  members = [],
  onBack,
}: ObraHeaderProps) {
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const isClient = !canManageMembers(projectRole);

  return (
    <>
      <View style={styles.wrapper}>
        <View style={styles.row}>
          <PressableScale
            style={styles.headerBtn}
            onPress={onBack ?? (() => router.back())}
            scaleTo={0.88}
          >
            <MaterialIcons name="arrow-back-ios" size={22} color="#111827" />
          </PressableScale>

          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>PROJETO</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {canManageMembers(projectRole) ? (
            <ShareProjectButton
              projectId={projectId}
              projectName={title}
              projectRole={projectRole}
              members={members}
            />
          ) : (
            <PressableScale
              style={styles.teamBtn}
              onPress={() => setTeamModalOpen(true)}
              scaleTo={0.88}
            >
              {/* Stacked mini avatars (up to 2) + people icon */}
              <View style={styles.teamBtnInner}>
                <MaterialIcons name="group" size={20} color={colors.primary} />
                {members.length > 0 && (
                  <View style={styles.teamCountBadge}>
                    <Text style={styles.teamCountText}>
                      {Math.min(members.length, 9)}
                    </Text>
                  </View>
                )}
              </View>
            </PressableScale>
          )}
        </View>
      </View>

      {isClient && (
        <ClienteTeamModal
          visible={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          members={members}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.12)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 13,
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

  teamBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.tintBlue,
  },
  teamBtnInner: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  teamCountBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  teamCountText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 12,
  },
});
