import type { ObraDetalhe } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Threshold: obras com mais de N etapas usam vista colapsada
const COLLAPSE_THRESHOLD = 5;
// Quantas etapas mostrar antes e depois da ativa no modo colapsado
const WINDOW_BEFORE = 1;
const WINDOW_AFTER = 2;
// A partir de quantas etapas usar barra de progresso em vez de dots
const DOTS_MAX = 10;

interface ClienteStatusCardProps {
  obra: ObraDetalhe;
}

const isLongDesc = (desc: string) => desc.length > 70 || desc.includes("\n");

export function ClienteStatusCard({ obra }: ClienteStatusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(new Set());

  const toggleDesc = useCallback((id: string) => {
    setExpandedDescs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const totalTarefas = obra.tarefas.length;
  const concluidas = obra.tarefas.filter((t) => t.concluida).length;
  // Índice global da tarefa ativa (primeira não concluída)
  const activeIdx = obra.tarefas.findIndex((t) => !t.concluida);
  // Para o cálculo da janela quando tudo está concluído, usa o último item
  const effectiveActiveIdx = activeIdx === -1 ? totalTarefas - 1 : activeIdx;

  const shouldUseWindow = totalTarefas > COLLAPSE_THRESHOLD;

  // Janela de exibição no modo colapsado
  const windowStart =
    shouldUseWindow && !expanded
      ? Math.max(0, effectiveActiveIdx - WINDOW_BEFORE)
      : 0;
  const windowEnd =
    shouldUseWindow && !expanded
      ? Math.min(totalTarefas - 1, effectiveActiveIdx + WINDOW_AFTER)
      : totalTarefas - 1;

  const skippedBefore = windowStart;
  const skippedAfter = totalTarefas - 1 - windowEnd;

  const tarefasParaMostrar = obra.tarefas.slice(windowStart, windowEnd + 1);

  const pct = Math.round((concluidas / Math.max(totalTarefas, 1)) * 100);

  function handleToggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionLabelRow}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionLabel}>ANDAMENTO DAS ETAPAS</Text>
      </View>
      <View style={styles.card}>

        {/* ── Cabeçalho ────────────────────────────────────── */}
        <View style={styles.completionHeader}>
          <Text style={styles.completionNum}>
            {concluidas}{" "}
            <Text style={styles.completionNumLight}>de {totalTarefas}</Text>
            {"  "}
            <Text style={styles.completionLabel}>etapas concluídas</Text>
          </Text>
          {/* Barra fina de progresso no cabeçalho */}
          <View style={styles.headerProgressTrack}>
            <View style={[styles.headerProgressFill, { width: `${pct}%` as `${number}%` }]} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Badge de etapas colapsadas (acima da janela) ─── */}
        {skippedBefore > 0 && (
          <TouchableOpacity
            style={styles.skippedRow}
            onPress={handleToggle}
            activeOpacity={0.7}
          >
            <View style={styles.timelineCol}>
              {/* linha pontilhada representando as etapas escondidas */}
              <View style={styles.skippedDots}>
                {[0, 1, 2].map((k) => (
                  <View key={k} style={styles.skippedDot} />
                ))}
              </View>
            </View>
            <View style={styles.skippedBadge}>
              <MaterialIcons name="check-circle" size={13} color="#22C55E" />
              <Text style={styles.skippedText}>
                {skippedBefore}{" "}
                {skippedBefore === 1 ? "etapa concluída" : "etapas concluídas"}
              </Text>
              <MaterialIcons name="expand-less" size={14} color="#16A34A" />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Lista de milestones ──────────────────────────── */}
        {tarefasParaMostrar.map((tarefa, idx) => {
          const globalIdx = windowStart + idx;
          const isDone = tarefa.concluida;
          const isActive = globalIdx === activeIdx;
          const isLastVisible = idx === tarefasParaMostrar.length - 1;
          // Mostra conector depois do último item visível se há mais abaixo
          const showConnectorAfter = !isLastVisible || (skippedAfter > 0 && shouldUseWindow && !expanded);

          return (
            <View key={tarefa.id} style={styles.milestoneRow}>
              {/* Coluna da timeline */}
              <View style={styles.timelineCol}>
                <View
                  style={[
                    styles.circle,
                    isDone && styles.circleDone,
                    isActive && styles.circleActive,
                    !isDone && !isActive && styles.circlePending,
                  ]}
                >
                  {isDone ? (
                    <MaterialIcons name="check" size={11} color="#FFFFFF" />
                  ) : isActive ? (
                    <View style={styles.activeDot} />
                  ) : null}
                </View>
                {showConnectorAfter && (
                  <View
                    style={[
                      styles.connector,
                      isDone ? styles.connectorDone : styles.connectorPending,
                    ]}
                  />
                )}
              </View>

              {/* Conteúdo */}
              <View
                style={[
                  styles.milestoneContent,
                  showConnectorAfter && { paddingBottom: 16 },
                  isActive && styles.milestoneContentActive,
                ]}
              >
                <Text
                  style={[
                    styles.mTitle,
                    isDone && styles.mTitleDone,
                    isActive && styles.mTitleActive,
                  ]}
                  numberOfLines={1}
                >
                  {tarefa.titulo}
                </Text>

                {isActive && (
                  <View style={styles.activeBadge}>
                    <View style={styles.activePulse} />
                    <Text style={styles.activeBadgeText}>Em execução</Text>
                  </View>
                )}
                {isDone && (
                  <Text style={styles.mStatusDone}>Concluída</Text>
                )}

                {tarefa.descricao ? (() => {
                  const isDescExpanded = expandedDescs.has(tarefa.id);
                  const hasLong = isLongDesc(tarefa.descricao);
                  return (
                    <>
                      <Text
                        style={styles.mDesc}
                        numberOfLines={isDescExpanded ? undefined : 2}
                      >
                        {tarefa.descricao}
                      </Text>
                      {hasLong && (
                        <TouchableOpacity
                          onPress={() => toggleDesc(tarefa.id)}
                          hitSlop={{ top: 4, bottom: 8, left: 0, right: 16 }}
                          activeOpacity={0.6}
                          style={styles.descExpandRow}
                        >
                          <Text style={styles.descExpandText}>
                            {isDescExpanded ? "Ver menos" : "Ver mais"}
                          </Text>
                          <MaterialIcons
                            name={isDescExpanded ? "expand-less" : "expand-more"}
                            size={14}
                            color={PRIMARY}
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  );
                })() : null}
              </View>
            </View>
          );
        })}

        {/* ── Botão expandir / recolher ────────────────────── */}
        {shouldUseWindow && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={handleToggle}
            activeOpacity={0.7}
          >
            <Text style={styles.expandButtonText}>
              {expanded
                ? "Recolher"
                : `Ver todas ${totalTarefas} etapas`}
            </Text>
            <MaterialIcons
              name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={16}
              color={PRIMARY}
            />
          </TouchableOpacity>
        )}

        {/* ── Próxima etapa ───────────────────────────────── */}
        {obra.proximaEtapa && obra.proximaEtapa !== "—" && (
          <>
            <View style={styles.divider} />
            <View style={styles.proximaRow}>
              <MaterialIcons name="arrow-forward" size={14} color="#9CA3AF" />
              <Text style={styles.proximaLabel}>
                Próxima etapa:{" "}
                <Text style={styles.proximaValor}>{obra.proximaEtapa}</Text>
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 4 },

  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
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
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Header ─────────────────────────────────────────────
  completionHeader: {
    marginBottom: 12,
  },
  completionRow: {},
  completionNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  completionNumLight: {
    fontSize: 16,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  completionLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  headerProgressTrack: {
    height: 4,
    backgroundColor: "#EEF0F6",
    borderRadius: 2,
    overflow: "hidden",
  },
  headerProgressFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 2,
  },



  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },

  // ── Skipped indicator ──────────────────────────────────
  skippedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  skippedDots: {
    width: 28,
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  skippedDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#22C55E",
    opacity: 0.5,
  },
  skippedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 6,
  },
  skippedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
  },

  // ── Timeline ───────────────────────────────────────────
  milestoneRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineCol: {
    width: 32,
    alignItems: "center",
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: { backgroundColor: "#22C55E" },
  circleActive: { backgroundColor: PRIMARY },
  circlePending: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  connector: {
    width: 3,
    flex: 1,
    minHeight: 14,
    marginTop: 2,
    borderRadius: 1.5,
  },
  connectorDone: { backgroundColor: "#22C55E" },
  connectorPending: { backgroundColor: "#E5E7EB" },

  milestoneContent: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 2,
  },
  milestoneContentActive: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 2,
  },
  mTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 3,
  },
  mTitleDone: { color: "#9CA3AF", textDecorationLine: "line-through" },
  mTitleActive: { color: "#111827", fontWeight: "700" },

  activeBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  activePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 0.2,
  },
  mStatusDone: {
    fontSize: 11,
    fontWeight: "600",
    color: "#22C55E",
  },
  mDesc: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    lineHeight: 17,
    marginTop: 5,
  },
  descExpandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 3,
  },
  descExpandText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
  },

  // ── Expand button ──────────────────────────────────────
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },

  // ── Próxima etapa ──────────────────────────────────────
  proximaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  proximaLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  proximaValor: {
    color: "#374151",
    fontWeight: "600",
  },
});
