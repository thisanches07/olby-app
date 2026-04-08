import { FadeSlideIn } from "@/components/ui/fade-slide-in";
import type { Tarefa } from "@/data/obras";
import { getPriorityConfig } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const PRIMARY = "#2563EB";

const PRIORITY_BG: Record<string, string> = {
  ALTA: "#FEE2E2",
  MEDIA: "#FFF7ED",
  BAIXA: "#F0FDF4",
};

// ─── Animated progress bar ────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(pct, { duration: 700 });
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
}

// ─── Progress header card ─────────────────────────────────────────────────────
function ProgressHeader({
  total,
  concluidas,
}: {
  total: number;
  concluidas: number;
}) {
  const pendentes = total - concluidas;
  const pct = total > 0 ? concluidas / total : 0;

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressStatRow}>
        <Text style={styles.progressStatText}>
          {concluidas} de {total} tarefas concluídas
        </Text>
        <Text style={styles.progressPct}>{Math.round(pct * 100)}%</Text>
      </View>

      <ProgressBar pct={pct} />

      <View style={styles.chipsRow}>
        <View style={[styles.chip, styles.chipPendente]}>
          <MaterialIcons
            name="radio-button-unchecked"
            size={12}
            color="#EA580C"
          />
          <Text style={[styles.chipText, { color: "#EA580C" }]}>
            {pendentes} pendente{pendentes !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={[styles.chip, styles.chipConcluida]}>
          <MaterialIcons name="check-circle" size={12} color="#16A34A" />
          <Text style={[styles.chipText, { color: "#16A34A" }]}>
            {concluidas} concluída{concluidas !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Individual task card (read-only) ─────────────────────────────────────────
function ClienteTaskCard({ tarefa, index }: { tarefa: Tarefa; index: number }) {
  const prio = getPriorityConfig(tarefa.prioridade);

  return (
    <FadeSlideIn index={index}>
      <View
        style={[styles.taskCard, tarefa.concluida && styles.taskCardConcluida]}
      >
        {/* Left accent strip */}
        <View
          style={[
            styles.leftAccent,
            { backgroundColor: tarefa.concluida ? "#D1D5DB" : prio.color },
          ]}
        />

        {/* Checkbox (visual-only, not interactive) */}
        <View
          style={[styles.checkbox, tarefa.concluida && styles.checkboxChecked]}
        >
          {tarefa.concluida && (
            <MaterialIcons name="check" size={14} color="#FFFFFF" />
          )}
        </View>

        {/* Content */}
        <View style={styles.taskInfo}>
          <Text
            style={[
              styles.taskTitulo,
              tarefa.concluida && styles.taskTituloConcluido,
            ]}
            numberOfLines={2}
          >
            {tarefa.titulo}
          </Text>
          {!!tarefa.descricao && (
            <Text style={styles.taskDesc} numberOfLines={2}>
              {tarefa.descricao}
            </Text>
          )}
        </View>

        {/* Priority badge */}
        <View
          style={[
            styles.badge,
            { backgroundColor: PRIORITY_BG[tarefa.prioridade] ?? "#F3F4F6" },
          ]}
        >
          <Text style={[styles.badgeText, { color: prio.color }]}>
            {prio.label}
          </Text>
        </View>
      </View>
    </FadeSlideIn>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyTasksState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="playlist-add-check" size={36} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>Sem tarefas cadastradas</Text>
      <Text style={styles.emptyText}>
        As tarefas do projeto aparecerão aqui conforme forem criadas pela
        equipe.
      </Text>
    </View>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export function ClienteTasksView({ tarefas }: { tarefas: Tarefa[] }) {
  if (!tarefas || tarefas.length === 0) {
    return <EmptyTasksState />;
  }

  const pendentes = tarefas.filter((t) => !t.concluida);
  const concluidas = tarefas.filter((t) => t.concluida);

  let cardIndex = 0;

  return (
    <View style={styles.container}>
      <ProgressHeader total={tarefas.length} concluidas={concluidas.length} />

      {pendentes.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>PENDENTES</Text>
          <View style={styles.listWrap}>
            {pendentes.map((t) => (
              <ClienteTaskCard key={t.id} tarefa={t} index={cardIndex++} />
            ))}
          </View>
        </>
      )}

      {concluidas.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>CONCLUÍDAS</Text>
          <View style={styles.listWrap}>
            {concluidas.map((t) => (
              <ClienteTaskCard key={t.id} tarefa={t} index={cardIndex++} />
            ))}
          </View>
        </>
      )}

      <View style={styles.footer}>
        <MaterialIcons name="info-outline" size={13} color="#9CA3AF" />
        <Text style={styles.footerText}>Acompanhe o progresso das tarefas</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },

  // ── Progress card ──────────────────────────────────────────────────────────
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  progressStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressStatText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  progressPct: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: -0.3,
  },
  progressTrack: {
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: 5,
    backgroundColor: PRIMARY,
    borderRadius: 3,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chipPendente: {
    backgroundColor: "#FFF7ED",
  },
  chipConcluida: {
    backgroundColor: "#F0FDF4",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Section labels ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  listWrap: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  // ── Task card ──────────────────────────────────────────────────────────────
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    padding: 16,
    paddingLeft: 20,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  taskCardConcluida: {
    opacity: 0.55,
  },
  leftAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitulo: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  taskTituloConcluido: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  taskDesc: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    lineHeight: 17,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 4,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 19,
  },
});
