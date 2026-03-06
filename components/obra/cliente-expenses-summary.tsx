import type { Gasto, Tarefa } from "@/data/obras";
import { formatBRL } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

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
}: ClienteExpensesSummaryProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const toggleTask = useCallback((gastoId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(gastoId) ? next.delete(gastoId) : next.add(gastoId);
      return next;
    });
  }, []);

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

  // Só categorias com algum valor
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
      ) : null}

      {filteredGastos.map((gasto) => {
        const conf = CATEGORY_CONFIG[gasto.categoria];
        const tarefaVinculada = tarefas.find((t) => t.id === gasto.tarefaId);

        const isExpanded = expandedTaskIds.has(gasto.id);

        return (
          <View key={gasto.id} style={styles.expenseCard}>
            {/* Ícone da categoria */}
            <View
              style={[
                styles.expenseIcon,
                { backgroundColor: conf.color + "18" },
              ]}
            >
              <MaterialIcons name={conf.icon} size={22} color={conf.color} />
            </View>

            {/* Conteúdo */}
            <View style={styles.expenseContent}>
              <View style={styles.expenseTopRow}>
                <Text style={styles.expenseDesc} numberOfLines={2}>
                  {gasto.descricao}
                </Text>
                <Text style={styles.expenseValue}>
                  {formatBRL(gasto.valor, false)}
                </Text>
              </View>
              <View style={styles.expenseMeta}>
                <Text style={styles.expenseDate}>{toDisplayDate(gasto.data)}</Text>
                <Text style={styles.metaDot}>·</Text>
                <View
                  style={[
                    styles.catPill,
                    { backgroundColor: conf.color + "14" },
                  ]}
                >
                  <Text style={[styles.catPillText, { color: conf.color }]}>
                    {conf.label}
                  </Text>
                </View>
              </View>

              {/* Etapa vinculada — bloco expansível */}
              {tarefaVinculada && (
                <TouchableOpacity
                  style={styles.taskBlock}
                  onPress={() => toggleTask(gasto.id)}
                  activeOpacity={tarefaVinculada.descricao ? 0.75 : 1}
                  disabled={!tarefaVinculada.descricao}
                >
                  <View style={styles.taskBlockHeader}>
                    <View style={styles.taskBlockHeaderLeft}>
                      <MaterialIcons name="link" size={11} color={PRIMARY} />
                      <Text style={styles.taskBlockLabel}>ETAPA VINCULADA</Text>
                    </View>
                    {tarefaVinculada.descricao ? (
                      <MaterialIcons
                        name={isExpanded ? "expand-less" : "expand-more"}
                        size={15}
                        color="#93C5FD"
                      />
                    ) : null}
                  </View>
                  <Text
                    style={styles.taskBlockTitle}
                    numberOfLines={isExpanded ? undefined : 1}
                  >
                    {tarefaVinculada.titulo}
                  </Text>
                  {isExpanded && tarefaVinculada.descricao ? (
                    <Text style={styles.taskBlockDesc}>
                      {tarefaVinculada.descricao}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {/* Rodapé informativo */}
      <View style={styles.footer}>
        <MaterialIcons name="info-outline" size={13} color="#9CA3AF" />
        <Text style={styles.footerText}>
          Os gastos são registrados pela equipe de obra
        </Text>
      </View>
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

  // ── Expense card ────────────────────────────────────────
  expenseCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseContent: {
    flex: 1,
    gap: 5,
  },
  expenseTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  expenseDesc: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 19,
  },
  expenseValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
    paddingTop: 1,
  },
  expenseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  expenseDate: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  metaDot: {
    fontSize: 12,
    color: "#D1D5DB",
  },
  catPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Bloco de etapa vinculada ─────────────────────────────
  taskBlock: {
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  taskBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  taskBlockHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskBlockLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#93C5FD",
    letterSpacing: 0.5,
  },
  taskBlockTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
    lineHeight: 18,
  },
  taskBlockDesc: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "400",
    lineHeight: 17,
    marginTop: 6,
    opacity: 0.9,
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
