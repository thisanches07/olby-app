import type { Obra } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ProjectTitleSectionProps {
  obra: Obra;
  etapaAtual: string;
}

export function ProjectTitleSection({
  obra,
  etapaAtual,
}: ProjectTitleSectionProps) {
  return (
    <View style={styles.titleSection}>
      <Text style={styles.nomeProjeto}>{obra.nome}</Text>
      <View style={styles.etapaBadge}>
        <View style={styles.etapaDot} />
        <Text style={styles.etapaText}>{etapaAtual.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  nomeProjeto: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: "center",
  },
  etapaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF0F8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 7,
  },
  etapaDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  etapaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.8,
  },
});
