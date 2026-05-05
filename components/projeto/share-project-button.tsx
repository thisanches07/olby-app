import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import type { ProjectAccessMember } from "@/utils/project-members";
import type { ProjectApiRole } from "@/utils/project-role";
import { canManageMembers } from "@/utils/project-role";
import { ShareProjectModal } from "./share-project-modal";

export interface ShareProjectButtonControl {
  open: () => void;
  close: () => void;
}

interface ShareProjectButtonProps {
  projectId: string;
  projectName: string;
  projectRole?: ProjectApiRole;
  members?: ProjectAccessMember[];
  controlRef?: React.MutableRefObject<ShareProjectButtonControl | null>;
  onVisibilityChange?: (visible: boolean) => void;
}

export function ShareProjectButton({
  projectId,
  projectName,
  projectRole = null,
  members = [],
  controlRef,
  onVisibilityChange,
}: ShareProjectButtonProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      open: () => setShowModal(true),
      close: () => setShowModal(false),
    };
    return () => { controlRef.current = null; };
  }, [controlRef]);

  useEffect(() => {
    onVisibilityChange?.(showModal);
  }, [onVisibilityChange, showModal]);

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
        members={members}
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
