import type { StatusType } from "@/components/obra-card";
import type { ObraDetalhe } from "@/data/obras";
import { PROGRESS_COLOR, STATUS_CONFIG } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ClienteTitleSectionProps {
  obra: ObraDetalhe;
}

export function ClienteTitleSection({ obra }: ClienteTitleSectionProps) {
  const statusInfo = STATUS_CONFIG[obra.status as StatusType];
  const progressColor = PROGRESS_COLOR[obra.status as StatusType];

  // Horas do profissional
  const horasContratadas = obra.horasContratadas ?? 0;
  const horasRealizadas = obra.horasRealizadas ?? 0;
  const horasPct =
    horasContratadas > 0
      ? Math.min(Math.round((horasRealizadas / horasContratadas) * 100), 100)
      : 0;
  const horasColor =
    horasPct >= 90 ? "#DC2626" : horasPct >= 75 ? "#D97706" : "#059669";
  const hasContrato = horasContratadas > 0;
  // Mostra coluna quando há contrato OU quando há horas registradas sem contrato
  const showHoras = hasContrato || horasRealizadas > 0;

  return (
    <View style={styles.hero}>
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: statusInfo.dot }]} />
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
      </View>

      {/* Local */}
      {!!obra.endereco && <Text style={styles.localProjeto}>{obra.endereco}</Text>}

      {/* Métricas rápidas */}
      <View style={styles.metricsRow}>
        {/* % concluído */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: progressColor }]}>
            {obra.progresso}%
          </Text>
          <Text style={styles.metricLabel}>concluído</Text>
        </View>

        <View style={styles.metricDivider} />

        {/* Entrega prevista */}
        <View style={styles.metricItem}>
          <Text style={styles.metricValue} numberOfLines={1}>
            {obra.dataPrevisaoEntrega ?? "—"}
          </Text>
          <Text style={styles.metricLabel}>previsão</Text>
        </View>

        {/* Horas do profissional */}
        {showHoras && (
          <>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              {hasContrato ? (
                <View style={styles.horasValueRow}>
                  <Text style={[styles.horasNum, { color: horasColor }]}>
                    {horasRealizadas}h
                  </Text>
                  <Text style={styles.horasSep}>/</Text>
                  <Text style={styles.horasTotal}>{horasContratadas}h</Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.horasNum,
                    { color: horasColor, marginBottom: 2 },
                  ]}
                >
                  {horasRealizadas}h
                </Text>
              )}
              <Text style={styles.metricLabel}>horas prof.</Text>
            </View>
          </>
        )}
      </View>

      {/* Barra de progresso */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${obra.progresso}%` as `${number}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>

      {/* Etapa atual — abaixo da barra, sem truncamento forçado */}
      {obra.etapaAtual ? (
        <View style={styles.etapaRow}>
          <MaterialIcons name="play-circle-outline" size={13} color="#6B7280" />
          <Text style={styles.etapaText} numberOfLines={1}>
            {obra.etapaAtual}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  localProjeto: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "400",
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
    overflow: "hidden",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
    textAlign: "center",
  },
  metricLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
    textAlign: "center",
  },
  metricDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 4,
  },

  // ── Horas inline ─────────────────────────────────────
  horasValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginBottom: 2,
  },
  horasNum: {
    fontSize: 14,
    fontWeight: "800",
  },
  horasSep: {
    fontSize: 11,
    color: "#D1D5DB",
    fontWeight: "400",
  },
  horasTotal: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  // ── Barra + etapa ─────────────────────────────────────
  progressTrack: {
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  etapaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  etapaText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
});
