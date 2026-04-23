import type { ObraDetalhe } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

/** Formata horas decimais como "1h30min", "30min", "2h", etc. */
function formatHoras(h: number): string {
  const total = Math.round(h * 60);
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  if (hrs === 0) return `${mins}min`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h${mins}min`;
}

interface ClienteHorasCardProps {
  obra: ObraDetalhe;
}

export function ClienteHorasCard({ obra }: ClienteHorasCardProps) {
  const { horasContratadas, horasRealizadas } = obra;
  const horasRestantes = Math.max(horasContratadas - horasRealizadas, 0);
  const pct = Math.min(
    Math.round((horasRealizadas / Math.max(horasContratadas, 1)) * 100),
    100,
  );

  // Cores progressivas: ok → atenção → crítico
  const barColor =
    pct >= 90 ? "#DC2626" : pct >= 75 ? "#D97706" : PRIMARY;
  const badgeBg =
    pct >= 90 ? "#FEF2F2" : pct >= 75 ? "#FFFBEB" : PRIMARY + "12";
  const badgeColor =
    pct >= 90 ? "#DC2626" : pct >= 75 ? "#D97706" : PRIMARY;

  const isOverrun = horasRealizadas > horasContratadas;
  const isCritical = pct >= 90 && !isOverrun;

  return (
    <>
      <View style={styles.sectionLabelRow}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionLabel}>HORAS DO PROFISSIONAL</Text>
      </View>
      <View style={styles.card}>
        {/* ── Linha principal ────────────────────────────── */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={styles.horasNum}>
              {formatHoras(horasRealizadas)}
            </Text>
            <Text style={styles.horasLabel}>
              {isOverrun ? "horas excedidas" : "horas realizadas"}
            </Text>
          </View>
          <Text style={styles.pctLabel}>{pct}%</Text>
        </View>

        {/* ── Barra de progresso ───────────────────────── */}
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={
              pct >= 90
                ? ["#EF4444", "#DC2626"]
                : pct >= 75
                  ? ["#F97316", "#D97706"]
                  : ["#3B82F6", "#2563EB"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${pct}%` as `${number}%` }]}
          />
        </View>

        {/* ── Linha de detalhe ─────────────────────────── */}
        <Text style={styles.detalheLine}>
          {`de ${formatHoras(horasContratadas)} contratadas  ·  `}
          <Text
            style={{
              color: isOverrun ? "#DC2626" : "#22C55E",
              fontWeight: "600",
            }}
          >
            {isOverrun
              ? `${formatHoras(horasRealizadas - horasContratadas)} excedentes`
              : `${formatHoras(horasRestantes)} disponíveis`}
          </Text>
        </Text>

        {/* ── Alerta quando crítico / excedido ─────────── */}
        {(isCritical || isOverrun) && (
          <View
            style={[
              styles.alertRow,
              { backgroundColor: isOverrun ? "#FEF2F2" : "#FFFBEB" },
            ]}
          >
            <MaterialIcons
              name={isOverrun ? "error-outline" : "warning-amber"}
              size={15}
              color={isOverrun ? "#DC2626" : "#D97706"}
            />
            <Text
              style={[
                styles.alertText,
                { color: isOverrun ? "#DC2626" : "#92400E" },
              ]}
            >
              {isOverrun
                ? "As horas contratadas foram excedidas"
                : "Atenção: poucas horas disponíveis"}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Top row ─────────────────────────────────────────
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topLeft: { flex: 1 },
  horasNum: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  horasLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    marginTop: 2,
  },
  pctLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: "#111827",
  },

  // ── Progress ─────────────────────────────────────────
  progressTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 4 },

  // ── Detalhe ──────────────────────────────────────────
  detalheLine: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    marginBottom: 2,
  },

  // ── Alerta ───────────────────────────────────────────
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
  },
  alertText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
});
