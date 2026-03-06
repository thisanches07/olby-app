import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import type { ProjectApiRole } from "@/utils/project-role";
import { canManageMembers } from "@/utils/project-role";
import { ShareProjectModal } from "./share-project-modal";

interface ShareProjectButtonProps {
  projectId: string;
  projectName: string;
  projectRole?: ProjectApiRole;
}

export function ShareProjectButton({
  projectId,
  projectName,
  projectRole = null,
}: ShareProjectButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.7}
      >
        <MaterialIcons name="share" size={24} color="#2563EB" />
      </TouchableOpacity>

      <ShareProjectModal
        visible={showModal}
        projectId={projectId}
        projectName={projectName}
        projectRole={projectRole}
        canShare={canManageMembers(projectRole)}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
