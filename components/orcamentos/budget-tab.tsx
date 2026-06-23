import { formatCentsBRL } from "@/constants/quote-status";
import { useSubscriptionGate } from "@/contexts/subscription-gate";
import { useStageBudget, useProjectBudgetSummary } from "@/hooks/use-budget-data";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AddBudgetPickerModal } from "./add-budget-picker-modal";
import { BudgetEditorModal } from "./budget-editor-modal";
import { BudgetImportModal } from "./budget-import-modal";

const PRIMARY = "#2563EB";
const DANGER = "#EF4444";
const SUCCESS = "#16A34A";

interface EtapaLike {
  id: string;
  nome: string;
}

interface Props {
  projectId: string;
  etapas: EtapaLike[];
  readOnly?: boolean;
}

/** Aba "Orçamentos": resumo orçado×gasto + lista de etapas (add/editar/remover)
 *  + importar planilha por IA. Espelha a lógica do web; controle por etapa. */
export function BudgetTab({ projectId, etapas, readOnly }: Props) {
  const canEdit = !readOnly;
  const { requireSubscription } = useSubscriptionGate();
  const { summary, isLoading, refresh } = useProjectBudgetSummary(projectId);

  const [editing, setEditing] = useState<{ id: string; nome: string } | null>(
    null,
  );
  const [showImport, setShowImport] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Hook único para a etapa em edição (controla o modal).
  const editingBudget = useStageBudget(projectId, editing?.id);

  // Mescla todas as etapas com orçado/gasto do summary (etapas sem orçamento
  // continuam aparecendo, para "Adicionar").
  const rows = useMemo(() => {
    const byStage = new Map(
      (summary?.byStage ?? []).map((s) => [s.stageId, s]),
    );
    // União: etapas conhecidas + etapas que só existem no summary (ex.: criadas
    // agora pelo picker/import, antes do refetch do pai).
    const order: { id: string; nome: string }[] = etapas.map((e) => ({
      id: e.id,
      nome: e.nome,
    }));
    const known = new Set(order.map((o) => o.id));
    for (const s of summary?.byStage ?? []) {
      if (!known.has(s.stageId)) {
        order.push({ id: s.stageId, nome: s.stageName });
        known.add(s.stageId);
      }
    }
    return order.map((o, idx) => {
      const s = byStage.get(o.id);
      return {
        id: o.id,
        nome: o.nome,
        position: idx,
        orcadoCents: s?.totalBudgetCents ?? null,
        gastoCents: s?.totalExpensedCents ?? 0,
        over: s?.variance ? s.variance.ratio > 1 : false,
      };
    });
  }, [etapas, summary]);

  const totalOrcado = summary?.totalBudgetCents ?? 0;
  const totalGasto = summary?.totalExpensedCents ?? 0;
  const pct = totalOrcado > 0 ? Math.min(totalGasto / totalOrcado, 1) : 0;
  const overBudget = totalOrcado > 0 && totalGasto > totalOrcado;

  const afterChange = () => void refresh();

  return (
    <View style={styles.container}>
      {/* Resumo do projeto */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Orçado</Text>
            <Text style={styles.summaryValue}>{formatCentsBRL(totalOrcado)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.summaryLabel}>Gasto</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: overBudget ? DANGER : "#111827" },
              ]}
            >
              {formatCentsBRL(totalGasto)}
            </Text>
          </View>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.round(pct * 100)}%`,
                backgroundColor: overBudget ? DANGER : PRIMARY,
              },
            ]}
          />
        </View>
        <Text style={styles.summaryHint}>
          {totalOrcado > 0
            ? `${Math.round((totalGasto / totalOrcado) * 100)}% do orçado consumido`
            : "Defina o orçamento das etapas ou importe uma planilha."}
        </Text>
      </View>

      {/* Ações: adicionar manualmente + importar por IA */}
      {canEdit && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              if (requireSubscription("criar orçamentos")) setShowPicker(true);
            }}
            activeOpacity={0.88}
          >
            <MaterialIcons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Adicionar orçamento</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.importBtn}
            onPress={() => setShowImport(true)}
            activeOpacity={0.88}
          >
            <MaterialIcons name="upload-file" size={18} color={PRIMARY} />
            <Text style={styles.importText}>Importar planilha (IA)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista por etapa */}
      <Text style={styles.sectionTitle}>Por etapa</Text>

      {isLoading && !summary ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} />
        </View>
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>
          Nenhuma etapa ainda. Crie etapas (ou importe uma planilha) para
          orçar a obra.
        </Text>
      ) : (
        <View style={styles.list}>
          {rows.map((r) => {
            const hasBudget = r.orcadoCents != null && r.orcadoCents > 0;
            return (
              <TouchableOpacity
                key={r.id}
                style={styles.row}
                onPress={() =>
                  canEdit && setEditing({ id: r.id, nome: r.nome })
                }
                activeOpacity={canEdit ? 0.7 : 1}
                disabled={!canEdit}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {r.nome}
                  </Text>
                  {hasBudget ? (
                    <Text style={styles.rowSub}>
                      Gasto {formatCentsBRL(r.gastoCents)}
                      {r.over ? " · acima do orçado" : ""}
                    </Text>
                  ) : (
                    <Text style={styles.rowSubMuted}>Sem orçamento</Text>
                  )}
                </View>
                {hasBudget ? (
                  <Text style={[styles.rowValue, r.over && { color: DANGER }]}>
                    {formatCentsBRL(r.orcadoCents!)}
                  </Text>
                ) : canEdit ? (
                  <View style={styles.addPill}>
                    <MaterialIcons name="add" size={15} color={PRIMARY} />
                    <Text style={styles.addText}>Orçar</Text>
                  </View>
                ) : null}
                {canEdit && (
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color="#C2C8D2"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <BudgetEditorModal
        visible={editing !== null}
        stageName={editing?.nome ?? ""}
        item={editingBudget.item}
        isSaving={editingBudget.isSaving}
        onClose={() => setEditing(null)}
        onSave={editingBudget.save}
        onDelete={editingBudget.remove}
        onSaved={afterChange}
      />

      <BudgetImportModal
        visible={showImport}
        projectId={projectId}
        onClose={() => setShowImport(false)}
        onApplied={afterChange}
      />

      <AddBudgetPickerModal
        visible={showPicker}
        projectId={projectId}
        stages={rows.map((r) => ({
          id: r.id,
          nome: r.nome,
          orcadoCents: r.orcadoCents,
          position: r.position,
        }))}
        onClose={() => setShowPicker(false)}
        onPick={(stage) => {
          setShowPicker(false);
          setEditing(stage);
        }}
        onStageCreated={afterChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 8 },
  center: { paddingVertical: 40, alignItems: "center" },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1F5",
    borderRadius: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 7,
    borderRadius: 99,
    backgroundColor: "#EEF1F5",
    overflow: "hidden",
    marginTop: 14,
  },
  fill: { height: "100%", borderRadius: 99 },
  summaryHint: { fontSize: 12, color: "#9CA3AF", marginTop: 8 },
  actions: { marginTop: 12, gap: 10 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBE3F0",
    borderStyle: "dashed",
    backgroundColor: "#F8FAFF",
  },
  importText: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    marginTop: 22,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  empty: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1F5",
    borderRadius: 12,
    padding: 16,
  },
  list: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  rowSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  rowSubMuted: { fontSize: 12, color: "#B6BCC6", marginTop: 2 },
  rowValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    fontVariant: ["tabular-nums"],
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF4FF",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addText: { fontSize: 12.5, fontWeight: "700", color: PRIMARY },
});
