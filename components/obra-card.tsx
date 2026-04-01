import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Swipeable } from "react-native-gesture-handler";
import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { PressableScale } from "@/components/ui/pressable-scale";
import { tapMedium } from "@/utils/haptics";
import { colors } from "@/theme/colors";

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
  /** Callback disparado ao pressionar "Diário" no swipe */
  onViewDiary?: () => void;
}

export function ObraCard({ obra, onPress, onViewDiary }: ObraCardProps) {
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

  const swipeRef = useRef<Swipeable>(null);

  // Anima a barra de progresso de 0 → valor real ao montar
  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withDelay(
      120,
      withSpring(progresso, { damping: 22, stiffness: 90 }),
    );
  }, [progresso]);

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as `${number}%`,
  }));

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      {onViewDiary && (
        <Pressable
          style={[styles.swipeBtn, styles.swipeBtnDiary]}
          onPress={() => {
            swipeRef.current?.close();
            onViewDiary();
          }}
        >
          <MaterialIcons name="menu-book" size={20} color="#fff" />
          <Text style={styles.swipeBtnText}>Diário</Text>
        </Pressable>
      )}
      <Pressable
        style={[styles.swipeBtn, styles.swipeBtnView]}
        onPress={() => {
          swipeRef.current?.close();
          onPress?.();
        }}
      >
        <MaterialIcons name="visibility" size={20} color="#fff" />
        <Text style={styles.swipeBtnText}>Ver</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => tapMedium()}
      friction={2}
      overshootRight={false}
      containerStyle={styles.swipeContainer}
    >
      <PressableScale style={styles.card} onPress={onPress} scaleTo={0.975}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <View
              style={[styles.statusDot, { backgroundColor: statusInfo.dot }]}
            />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.iconMuted} />
        </View>

        <Text style={styles.nomeProjeto} numberOfLines={1}>
          {nome}
        </Text>
        <Text style={styles.cliente} numberOfLines={1}>
          {cliente}
        </Text>

        <View style={styles.enderecoRow}>
          <MaterialIcons name="location-on" size={13} color={colors.subtext} />
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
            <Animated.View
              style={[
                styles.progressFill,
                progressAnimStyle,
                { backgroundColor: progressColor },
              ]}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dateItem}>
            <MaterialIcons name="calendar-today" size={12} color={colors.subtext} />
            <Text style={styles.dateLabel}>Início: </Text>
            <Text style={styles.dateValue}>{dataInicio}</Text>
          </View>
          <View style={styles.dateItem}>
            <MaterialIcons name="event" size={12} color={colors.subtext} />
            <Text style={styles.dateLabel}>Previsão: </Text>
            <Text style={styles.dateValue}>{dataPrevisao}</Text>
          </View>
        </View>
      </PressableScale>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  swipeActions: {
    flexDirection: "row",
    alignItems: "stretch",
    marginLeft: 8,
  },
  swipeBtn: {
    width: 72,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  swipeBtnView: {
    backgroundColor: "#2563EB",
  },
  swipeBtnDiary: {
    backgroundColor: "#6D28D9",
    marginRight: 6,
  },
  swipeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
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
    fontFamily: "Inter-SemiBold",
  },
  nomeProjeto: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
    fontFamily: "Inter-Bold",
  },
  cliente: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
    marginBottom: 6,
    fontFamily: "Inter-Regular",
  },
  enderecoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  enderecoText: {
    fontSize: 12,
    color: colors.subtext,
    flex: 1,
    fontFamily: "Inter-Regular",
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray100,
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
    color: colors.subtext,
    fontWeight: "500",
    fontFamily: "Inter-Regular",
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter-Bold",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.gray100,
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
    color: colors.subtext,
    fontFamily: "Inter-Regular",
  },
  dateValue: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
    fontVariant: ["tabular-nums"],
  },
});
