import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type StatusType =
  | "em_andamento"
  | "concluida"
  | "pausada"
  | "planejamento";

export interface Obra {
  id: string;
  nome: string;
  cliente: string;
  endereco: string;
  status: StatusType;
  progresso: number;
  dataInicio: string;
  dataPrevisao: string;
}

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; color: string; bg: string; dot: string }
> = {
  em_andamento: {
    label: "Em Andamento",
    color: "#1D4ED8",
    bg: "#DBEAFE",
    dot: "#3B82F6",
  },
  concluida: {
    label: "Concluída",
    color: "#15803D",
    bg: "#DCFCE7",
    dot: "#22C55E",
  },
  pausada: {
    label: "Pausada",
    color: "#B45309",
    bg: "#FEF3C7",
    dot: "#F59E0B",
  },
  planejamento: {
    label: "Planejamento",
    color: "#6D28D9",
    bg: "#EDE9FE",
    dot: "#8B5CF6",
  },
};

const PROGRESS_COLORS: Record<StatusType, string> = {
  em_andamento: "#3B82F6",
  concluida: "#22C55E",
  pausada: "#F59E0B",
  planejamento: "#8B5CF6",
};

interface ObraCardProps {
  obra: Obra;
  onPress?: () => void;
}

export function ObraCard({ obra, onPress }: ObraCardProps) {
  const {
    nome,
    cliente,
    endereco,
    status,
    progresso,
    dataInicio,
    dataPrevisao,
  } = obra;
  const statusInfo = STATUS_CONFIG[status];
  const progressColor = PROGRESS_COLORS[status];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <View
            style={[styles.statusDot, { backgroundColor: statusInfo.dot }]}
          />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color="#D1D5DB" />
      </View>

      <Text style={styles.nomeProjeto} numberOfLines={1}>
        {nome}
      </Text>
      <Text style={styles.cliente} numberOfLines={1}>
        {cliente}
      </Text>

      <View style={styles.enderecoRow}>
        <MaterialIcons name="location-on" size={13} color="#9CA3AF" />
        <Text style={styles.enderecoText} numberOfLines={1}>
          {endereco}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progresso</Text>
          <Text style={[styles.progressValue, { color: progressColor }]}>
            {progresso}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progresso}%` as `${number}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dateItem}>
          <MaterialIcons name="calendar-today" size={12} color="#9CA3AF" />
          <Text style={styles.dateLabel}>Início: </Text>
          <Text style={styles.dateValue}>{dataInicio}</Text>
        </View>
        <View style={styles.dateItem}>
          <MaterialIcons name="event" size={12} color="#9CA3AF" />
          <Text style={styles.dateLabel}>Previsão: </Text>
          <Text style={styles.dateValue}>{dataPrevisao}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  nomeProjeto: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  cliente: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 6,
  },
  enderecoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  enderecoText: {
    fontSize: 12,
    color: "#9CA3AF",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dateLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  dateValue: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
});
