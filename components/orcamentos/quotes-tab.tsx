import {
  DemandCard,
  DemandSkeletonCard,
} from "@/components/orcamentos/demand-card";
import {
  DemandFormModal,
  type DemandFormData,
} from "@/components/orcamentos/demand-form-modal";
import {
  ActionMenuSheet,
  type ActionMenuItem,
} from "@/components/diario/action-menu-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { FadeSlideIn } from "@/components/ui/fade-slide-in";
import { useToast } from "@/components/obra/toast";
import { useProjectQuotes } from "@/hooks/use-quotes-data";
import { getErrorMessage } from "@/services/api";
import type {
  QuoteGroupResponse,
  QuoteGroupStatus,
} from "@/services/quotes.service";
import { quotesService } from "@/services/quotes.service";
import { stagesService } from "@/services/stages.service";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2563EB";

type StatusFilter = "ALL" | QuoteGroupStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "Todas" },
  { key: "OPEN", label: "Em cotação" },
  { key: "DECIDED", label: "Decididas" },
];

export function QuotesTab({
  projectId,
  readOnly = false,
  trackFinancial = true,
  openCreateSignal = 0,
  onProjectDataChanged,
}: {
  projectId: string;
  readOnly?: boolean;
  trackFinancial?: boolean;
  openCreateSignal?: number;
  /** Dispara reload da obra (despesas/etapas) quando uma ação na demanda
   *  propaga para o gasto vinculado (renomear/mover etapa, decidir, reabrir). */
  onProjectDataChanged?: () => void;
}) {
  const { showToast } = useToast();
  const {
    groups,
    isLoading,
    error,
    refresh,
    createGroup,
    updateGroup,
    deleteGroup,
  } = useProjectQuotes(projectId);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuoteGroupResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [menuDemand, setMenuDemand] = useState<QuoteGroupResponse | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<QuoteGroupResponse | null>(null);
  const [regenGroup, setRegenGroup] = useState<QuoteGroupResponse | null>(null);
  const [stageNames, setStageNames] = useState<Map<string, string>>(new Map());

  // Mapa id→nome das etapas, para o selo de etapa nos cards de demanda.
  useEffect(() => {
    let active = true;
    stagesService
      .listByProject(projectId)
      .then((items) => {
        if (!active) return;
        setStageNames(new Map(items.map((s) => [s.id, s.name])));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [projectId, groups]);

  // ── Refresh ao voltar do detalhe (pula o 1º foco — mount já busca) ──────────
  const firstFocusDone = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusDone.current) void refresh();
      firstFocusDone.current = true;
    }, [refresh]),
  );

  // ── CTA inferior (EngCTARow) abre o form via signal ────────────────────────
  // Só abre quando o signal MUDA (novo toque no CTA) — não ao (re)montar a aba.
  const lastCreateSignal = useRef(openCreateSignal);
  useEffect(() => {
    if (openCreateSignal !== lastCreateSignal.current) {
      lastCreateSignal.current = openCreateSignal;
      setEditing(null);
      setShowForm(true);
    }
  }, [openCreateSignal]);

  const openDemand = (id: string) =>
    router.push({
      pathname: "/orcamentos/[id]",
      params: { id, tf: trackFinancial ? "1" : "0" },
    });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (statusFilter !== "ALL" && g.status !== statusFilter) return false;
      if (q && !g.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [groups, query, statusFilter]);

  const handleSave = async (data: DemandFormData) => {
    setIsSaving(true);
    try {
      if (editing) {
        const prevStageId = editing.stageId ?? null;
        const stageChanged = (data.stageId ?? null) !== prevStageId;
        const detachedDecided =
          editing.status === "DECIDED" &&
          !editing.generatedExpenseId &&
          !!editing.chosenQuoteId;
        await updateGroup(editing.id, {
          title: data.title,
          description: data.description || null,
          stageId: data.stageId,
        });
        setShowForm(false);
        const justEdited = editing;
        setEditing(null);
        if (detachedDecided && stageChanged) {
          setRegenGroup(justEdited);
        }
      } else {
        const created = await createGroup({
          projectId,
          title: data.title,
          description: data.description || null,
          stageId: data.stageId,
        });
        setShowForm(false);
        openDemand(created.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const menuActions: ActionMenuItem[] = menuDemand
    ? [
        {
          label: "Editar demanda",
          icon: "edit",
          onPress: () => {
            setEditing(menuDemand);
            setShowForm(true);
          },
        },
        {
          label: "Excluir demanda",
          icon: "delete-outline",
          variant: "destructive",
          onPress: () => {
            if (menuDemand.generatedExpenseId) {
              showToast({
                title: "Não é possível excluir",
                message:
                  "Reabra a decisão antes de apagar — esta demanda gerou uma despesa.",
                tone: "error",
              });
              return;
            }
            setPendingDelete(menuDemand);
          },
        },
      ]
    : [];

  return (
    <View style={styles.wrap}>
      {/* Busca + filtro de status */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar demanda..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <DemandSkeletonCard key={i} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="request-quote" size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {groups.length === 0
              ? "Nenhuma demanda ainda"
              : "Nenhuma demanda encontrada"}
          </Text>
          <Text style={styles.emptyText}>
            {groups.length === 0
              ? readOnly
                ? "Nenhuma decisão de compra publicada."
                : "Toque em Adicionar demanda (ex.: Terraplanagem) e adicione orçamentos de fornecedores."
              : "Ajuste a busca ou o filtro de status."}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((g, index) => (
            <FadeSlideIn key={g.id} index={index}>
              <DemandCard
                demand={g}
                stageName={g.stageId ? (stageNames.get(g.stageId) ?? null) : null}
                onPress={() => openDemand(g.id)}
                onMore={readOnly ? undefined : () => setMenuDemand(g)}
              />
            </FadeSlideIn>
          ))}
        </View>
      )}

      <DemandFormModal
        visible={showForm}
        projectId={projectId}
        initial={
          editing
            ? {
                title: editing.title,
                description: editing.description,
                stageId: editing.stageId,
              }
            : null
        }
        isSaving={isSaving}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      <ActionMenuSheet
        visible={menuDemand !== null}
        title={menuDemand?.title}
        actions={menuActions}
        onClose={() => setMenuDemand(null)}
      />

      <ConfirmSheet
        visible={pendingDelete !== null}
        icon="delete-outline"
        title="Excluir demanda?"
        message="A demanda e todas as cotações vinculadas serão removidas permanentemente."
        confirmLabel="Excluir"
        onConfirm={() => {
          const d = pendingDelete;
          setPendingDelete(null);
          if (d)
            deleteGroup(d.id).catch((e) =>
              showToast({
                title: "Erro",
                message: getErrorMessage(
                  e,
                  "Não foi possível excluir a demanda.",
                ),
                tone: "error",
              }),
            );
        }}
        onClose={() => setPendingDelete(null)}
      />

      <ConfirmSheet
        visible={regenGroup !== null}
        icon="add"
        iconColor={PRIMARY}
        confirmVariant="primary"
        title="Gerar um novo gasto?"
        message="O gasto deste orçamento foi desvinculado (editado à parte). Deseja gerar um novo gasto com a etapa atualizada?"
        confirmLabel="Gerar novo gasto"
        onConfirm={() => {
          const g = regenGroup;
          setRegenGroup(null);
          if (!g?.chosenQuoteId) return;
          quotesService
            .choose(g.id, g.chosenQuoteId)
            .then(() => {
              void refresh();
              showToast({
                title: "Gasto gerado",
                message: "Um novo gasto foi lançado com a etapa atualizada.",
                tone: "success",
              });
            })
            .catch((e) =>
              showToast({
                title: "Erro",
                message: getErrorMessage(e, "Não foi possível gerar o gasto."),
                tone: "error",
              }),
            );
        }}
        onClose={() => setRegenGroup(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", padding: 0 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  filterChipTextActive: { color: "#FFFFFF" },
  list: { marginTop: 2 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 24,
  },
});
