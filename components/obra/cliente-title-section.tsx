import type { StatusType } from "@/components/obra-card";
import { CircularProgress } from "@/components/obra/circular-progress";
import type { ObraDetalhe } from "@/data/obras";
import { PROGRESS_COLOR } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ClienteTitleSectionProps {
  obra: ObraDetalhe;
}

export function ClienteTitleSection({ obra }: ClienteTitleSectionProps) {
  const progressColor = PROGRESS_COLOR[obra.status as StatusType];

  const horasContratadas = obra.horasContratadas ?? 0;
  const horasRealizadas = obra.horasRealizadas ?? 0;
  const horasPct =
    horasContratadas > 0
      ? Math.min(Math.round((horasRealizadas / horasContratadas) * 100), 100)
      : 0;
  const horasColor =
    horasPct >= 90 ? "#DC2626" : horasPct >= 75 ? "#D97706" : "#059669";
  const hasContrato = horasContratadas > 0;
  const showHoras = hasContrato || horasRealizadas > 0;

  const trackColor =
    obra.status === "concluida"
      ? "#DCFCE7"
      : obra.status === "pausada"
        ? "#FEF3C7"
        : obra.status === "planejamento"
          ? "#EDE9FE"
          : "#E8ECFF";

  return (
    <LinearGradient
      colors={["#E4EDFF", "#EDF4FF", "#F5F9FF", "#FFFFFF"]}
      locations={[0, 0.3, 0.65, 1]}
      style={styles.hero}
    >
      {/* Endereço com ícone */}
      {!!obra.endereco && (
        <View style={styles.addressRow}>
          <MaterialIcons name="place" size={13} color="#9CA3AF" />
          <Text style={styles.addressText}>{obra.endereco}</Text>
        </View>
      )}

      {/* Hero row: ring + métricas */}
      <View style={styles.heroRow}>
        {/* Ring — sem label, o % dentro é auto-explicativo */}
        <CircularProgress
          value={obra.progresso}
          size={116}
          strokeWidth={10}
          color={progressColor}
          trackColor={trackColor}
          label=""
        />

        {/* Métricas à direita */}
        <View style={styles.metricsStack}>
          {/* Previsão de entrega */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>PREVISÃO</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {obra.dataPrevisaoEntrega ?? "—"}
            </Text>
          </View>

          <View style={styles.metricSep} />

          {/* Horas */}
          {showHoras ? (
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>
                {hasContrato ? "HORAS PROF." : "HORAS REALIZADAS"}
              </Text>
              {hasContrato ? (
                <View style={styles.horasValueRow}>
                  <Text style={[styles.metricValue, { color: horasColor }]}>
                    {horasRealizadas}h
                  </Text>
                  <Text style={styles.horasSep}>/</Text>
                  <Text style={styles.horasTotal}>{horasContratadas}h</Text>
                </View>
              ) : (
                <Text style={[styles.metricValue, { color: horasColor }]}>
                  {horasRealizadas}h
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>HORAS</Text>
              <Text style={styles.metricValue}>—</Text>
            </View>
          )}
        </View>
      </View>

      {/* Etapa atual — pill chip */}
      {!!obra.etapaAtual && (
        <View style={styles.etapaChip}>
          <MaterialIcons name="play-circle" size={13} color={progressColor} />
          <Text style={styles.etapaChipText} numberOfLines={1}>
            {obra.etapaAtual}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F8",
  },

  // ── Endereço ──────────────────────────────────────────
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 20,
  },
  addressText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
    flex: 1,
  },

  // ── Hero row ──────────────────────────────────────────
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    marginBottom: 16,
  },

  // ── Métricas ─────────────────────────────────────────
  metricsStack: {
    flex: 1,
  },
  metricCard: {
    paddingVertical: 11,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.6,
  },
  metricSep: {
    height: 1,
    backgroundColor: "#E8EDF5",
    marginHorizontal: -4,
  },

  // ── Horas inline ─────────────────────────────────────
  horasValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  horasSep: {
    fontSize: 14,
    color: "#D1D5DB",
    fontWeight: "300",
  },
  horasTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  // ── Etapa pill ────────────────────────────────────────
  etapaChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#E8EDF5",
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  etapaChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
    maxWidth: 220,
  },
});
