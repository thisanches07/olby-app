import type { ObraDetalhe } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface EngTitleSectionProps {
  obra: ObraDetalhe;
}

export function EngTitleSection({ obra }: EngTitleSectionProps) {
  return (
    <View style={styles.engTitleSection}>
      <Text style={styles.engNomeProjeto}>{obra.nome}</Text>

      {/* Metadados: endereço + previsão (discreto, premium) */}
      <View style={styles.metaWrap}>
        {obra.endereco ? (
          <View style={styles.metaItem}>
            <MaterialIcons name="place" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{obra.endereco}</Text>
          </View>
        ) : null}

        {obra.dataPrevisao ? (
          <View style={styles.metaItem}>
            <MaterialIcons name="event" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>
              Entrega prevista: {obra.dataPrevisao}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.etapaBadge}>
        <View style={styles.etapaDot} />
        <Text style={styles.etapaTexto}>{obra.etapaAtual.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  engTitleSection: {
    alignItems: "center",
    marginBottom: 24,
  },

  engNomeProjeto: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },

  metaWrap: {
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },

  metaText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
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

  etapaTexto: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.8,
  },
});
