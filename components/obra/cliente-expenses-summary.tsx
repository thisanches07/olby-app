import type { DocumentAttachment, Gasto, Tarefa } from "@/data/obras";
import { documentsService } from "@/services/documents.service";
import { ExpenseItem } from "@/components/projeto/expense-item";
import { DocumentViewerModal } from "@/components/projeto/document-viewer-modal";
import { FadeSlideIn } from "@/components/ui/fade-slide-in";
import { PressableScale } from "@/components/ui/pressable-scale";
import { formatBRL } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#2563EB";

const CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: "material",
  LABOR: "mão de obra",
  TOOLS: "ferramentas",
  SERVICES: "serviços",
  TRANSPORT: "transporte",
  FEES: "taxas",
  CONTINGENCY: "imprevistos",
  OTHER: "outros",
};

function toSortableDate(data: string): string {
  if (!data) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(data)) return data.slice(0, 10);
  const m = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return data;
}

function toDisplayDate(data: string): string {
  if (!data) return "";
  const iso = data.slice(0, 10);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return data;
}

interface ClienteExpensesSummaryProps {
  gastos: Gasto[];
  tarefas: Tarefa[];
  projectId?: string;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; icon: keyof typeof MaterialIcons.glyphMap }
> = {
  MATERIAL:    { label: "Material",    color: "#F97316", icon: "construction"   },
  LABOR:       { label: "Mão de Obra", color: "#EF4444", icon: "engineering"    },
  TOOLS:       { label: "Ferramentas", color: "#F59E0B", icon: "build"          },
  SERVICES:    { label: "Serviços",    color: "#8B5CF6", icon: "business-center"},
  TRANSPORT:   { label: "Transporte",  color: "#0EA5E9", icon: "local-shipping" },
  FEES:        { label: "Taxas",       color: "#10B981", icon: "receipt"        },
  CONTINGENCY: { label: "Imprevistos", color: "#F43F5E", icon: "warning"        },
  OTHER:       { label: "Outros",      color: "#6B7280", icon: "category"       },
};

const CATEGORIES = [
  "MATERIAL", "LABOR", "TOOLS", "SERVICES",
  "TRANSPORT", "FEES", "CONTINGENCY", "OTHER",
] as const;

export function ClienteExpensesSummary({
  gastos,
  tarefas,
  projectId,
}: ClienteExpensesSummaryProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [viewingReceipt, setViewingReceipt] = useState<DocumentAttachment | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Gasto | null>(null);

  const handleReceiptPress = useCallback(
    projectId
      ? async (expense: Gasto) => {
          if (!expense.receiptDocumentId) return;
          try {
            const doc = await documentsService.getById(projectId, expense.receiptDocumentId);
            setViewingReceipt(doc);
          } catch {
            // silently ignore
          }
        }
      : async (_: Gasto) => {},
    [projectId],
  );

  const handleViewSelectedReceipt = useCallback(async () => {
    if (!selectedExpense) return;
    const expense = selectedExpense;
    setSelectedExpense(null);
    await handleReceiptPress(expense);
  }, [selectedExpense, handleReceiptPress]);

  const sortedGastos = useMemo(
    () =>
      [...gastos].sort((a, b) =>
        toSortableDate(b.data).localeCompare(toSortableDate(a.data)),
      ),
    [gastos],
  );

  const filteredGastos = useMemo(() => {
    if (!query.trim()) return sortedGastos;
    const q = query.toLowerCase();
    return sortedGastos.filter(
      (g) =>
        g.descricao.toLowerCase().includes(q) ||
        CATEGORY_LABELS[g.categoria]?.includes(q) ||
        toDisplayDate(g.data).includes(q),
    );
  }, [sortedGastos, query]);

  const totalGasto = gastos.reduce((sum, g) => sum + g.valor, 0);

  const categoryTotals = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = gastos
        .filter((g) => g.categoria === cat)
        .reduce((sum, g) => sum + g.valor, 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  const activeCats = CATEGORIES.filter((cat) => categoryTotals[cat] > 0);

  if (gastos.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <MaterialIcons name="receipt-long" size={40} color="#D1D5DB" />
        </View>
        <Text style={styles.emptyTitle}>Sem gastos registrados</Text>
        <Text style={styles.emptyText}>
          Os gastos da obra aparecerão aqui conforme forem registrados pela
          equipe.
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* ── Distribuição por categoria ──────────────────────── */}
      <Text style={styles.sectionLabel}>DISTRIBUIÇÃO DE GASTOS</Text>
      <View style={styles.card}>
        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total aplicado</Text>
          <Text style={styles.totalValue}>{formatBRL(totalGasto)}</Text>
        </View>

        {/* Barra segmentada proporcional */}
        <View style={styles.segBar}>
          {activeCats.map((cat, idx) => (
            <View
              key={cat}
              style={[
                styles.seg,
                {
                  flex: categoryTotals[cat],
                  backgroundColor: CATEGORY_CONFIG[cat].color,
                  borderTopLeftRadius: idx === 0 ? 5 : 0,
                  borderBottomLeftRadius: idx === 0 ? 5 : 0,
                  borderTopRightRadius: idx === activeCats.length - 1 ? 5 : 0,
                  borderBottomRightRadius:
                    idx === activeCats.length - 1 ? 5 : 0,
                },
              ]}
            />
          ))}
        </View>

        {/* Legenda */}
        <View style={styles.legend}>
          {activeCats.map((cat) => {
            const pct = Math.round(
              (categoryTotals[cat] / totalGasto) * 100,
            );
            const conf = CATEGORY_CONFIG[cat];
            return (
              <View key={cat} style={styles.legendRow}>
                <View
                  style={[styles.legendDot, { backgroundColor: conf.color }]}
                />
                <Text style={styles.legendName}>{conf.label}</Text>
                <Text style={styles.legendAmt}>
                  {formatBRL(categoryTotals[cat], false)}
                </Text>
                <Text style={[styles.legendPct, { color: conf.color }]}>
                  {pct}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Extrato de gastos ───────────────────────────────── */}
      <View style={styles.extratoHeader}>
        <Text style={styles.sectionLabel}>EXTRATO DE GASTOS</Text>
        <View style={styles.ativasBadge}>
          <Text style={styles.ativasText}>
            {query
              ? `${filteredGastos.length} de ${gastos.length}`
              : `${gastos.length} item${gastos.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por descrição, categoria ou data..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
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

      {filteredGastos.length === 0 ? (
        <View style={styles.emptySearch}>
          <MaterialIcons name="receipt" size={40} color="#D1D5DB" />
          <Text style={styles.emptySearchText}>
            {query
              ? `Nenhum gasto encontrado para "${query}"`
              : "Nenhum gasto registrado"}
          </Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {filteredGastos.map((expense, index) => (
            <FadeSlideIn key={expense.id} index={index}>
              <ExpenseItem
                expense={expense}
                tarefas={tarefas}
                readOnly
                onReceiptPress={
                  expense.receiptDocumentId ? handleReceiptPress : undefined
                }
                onPress={
                  expense.receiptDocumentId
                    ? (e) => setSelectedExpense(e)
                    : undefined
                }
              />
            </FadeSlideIn>
          ))}
        </View>
      )}

      {/* Rodapé informativo */}
      <View style={styles.footer}>
        <MaterialIcons name="info-outline" size={13} color="#9CA3AF" />
        <Text style={styles.footerText}>
          Os gastos são registrados pela equipe de obra
        </Text>
      </View>

      {/* Sheet: opções do gasto */}
      <Modal
        visible={!!selectedExpense}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedExpense(null)}
        statusBarTranslucent
      >
        <Pressable style={sheetStyles.backdrop} onPress={() => setSelectedExpense(null)} />
        <View style={[sheetStyles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={sheetStyles.handleContainer}>
            <View style={sheetStyles.handle} />
          </View>
          <PressableScale
            style={sheetStyles.actionRow}
            onPress={handleViewSelectedReceipt}
            scaleTo={0.97}
          >
            <View style={sheetStyles.actionIcon}>
              <MaterialIcons name="receipt-long" size={20} color="#2563EB" />
            </View>
            <Text style={sheetStyles.actionLabel}>Ver comprovante</Text>
            <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
          </PressableScale>
          <PressableScale
            style={sheetStyles.cancelRow}
            onPress={() => setSelectedExpense(null)}
            scaleTo={0.98}
          >
            <Text style={sheetStyles.cancelLabel}>Fechar</Text>
          </PressableScale>
        </View>
      </Modal>

      {/* Visualizador de comprovante */}
      {projectId && (
        <DocumentViewerModal
          visible={!!viewingReceipt}
          document={viewingReceipt}
          projectId={projectId}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // ── Empty ───────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 10,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Section label ───────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  extratoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 16,
  },
  ativasBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
    marginTop: 4,
  },
  ativasText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  emptySearch: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
    marginHorizontal: 16,
  },
  emptySearchText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
    textAlign: "center",
  },
  listWrap: {
    paddingHorizontal: 16,
  },

  // ── Distribuição card ───────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  segBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 16,
    gap: 2,
  },
  seg: {
    height: 10,
  },
  legend: {
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  legendAmt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  legendPct: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },

  // ── Rodapé ──────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
});

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  cancelRow: {
    alignItems: "center",
    paddingVertical: 16,
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
});
