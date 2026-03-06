import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import {
  ActionMenuSheet,
  type ActionMenuItem,
} from "./action-menu-sheet";

interface EntryActionsProps {
  entryId: string;
  onEdit: (entryId: string) => void;
  onDelete: (entryId: string) => void;
  hasPhotos?: boolean;
  onDownloadAll?: (entryId: string) => void;
}

export function EntryActions({
  entryId,
  onEdit,
  onDelete,
  hasPhotos = false,
  onDownloadAll,
}: EntryActionsProps) {
  const [menuVisible, setMenuVisible] = useState(false);

  const actions: ActionMenuItem[] = [
    {
      label: "Editar registro",
      icon: "edit",
      onPress: () => onEdit(entryId),
    },
    ...(hasPhotos && onDownloadAll
      ? [
          {
            label: "Baixar fotos",
            icon: "file-download" as const,
            onPress: () => onDownloadAll(entryId),
          },
        ]
      : []),
    {
      label: "Deletar registro",
      icon: "delete-outline",
      variant: "destructive" as const,
      onPress: () => onDelete(entryId),
    },
  ];

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuVisible(true)}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.btn}
      >
        <MaterialIcons name="more-vert" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <ActionMenuSheet
        visible={menuVisible}
        title="Opções do registro"
        actions={actions}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
