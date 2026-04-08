import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ClienteCTAButtonProps {
  onInicio: () => void;
  onGaleria?: () => void;
  onDocumentos?: () => void;
  onGastos?: () => void;
  onTarefas?: () => void;
  activeKey?: string;
}

const ACTIONS = [
  {
    key: "visao_geral" as const,
    icon: "home" as const,
    label: "Início",
    color: "#2563EB",
  },
  {
    key: "galeria" as const,
    icon: "photo-library" as const,
    label: "Galeria",
    color: "#0891B2",
  },
  {
    key: "gastos" as const,
    icon: "receipt-long" as const,
    label: "Gastos",
    color: "#059669",
  },
  {
    key: "tarefas" as const,
    icon: "task-alt" as const,
    label: "Tarefas",
    color: "#7C3AED",
  },
];

export function ClienteCTAButton({
  onInicio,
  onGaleria,
  onDocumentos,
  onGastos,
  activeKey,
}: ClienteCTAButtonProps) {
  const insets = useSafeAreaInsets();

  const handlers: Record<string, (() => void) | undefined> = {
    visao_geral: onInicio,
    galeria: onGaleria,
    gastos: onGastos,
    documentos: onDocumentos,
    tarefas: onTarefas,
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {ACTIONS.map(({ key, icon, label, color }) => {
        const isActive = activeKey === key;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            activeOpacity={0.72}
            onPress={handlers[key]}
          >
            {isActive && (
              <View style={[styles.indicator, { backgroundColor: color }]} />
            )}
            <MaterialIcons
              name={icon}
              size={24}
              color={isActive ? color : "#9CA3AF"}
            />
            <Text
              style={[styles.label, isActive && { color, fontWeight: "700" }]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  indicator: {
    position: "absolute",
    top: -9,
    width: 32,
    height: 3,
    borderRadius: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9CA3AF",
  },
});
