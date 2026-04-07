import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { ExpenseItem } from "@/components/projeto/expense-item";
import type { Gasto, Tarefa } from "@/data/obras";
import { PRIMARY } from "@/utils/obra-utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Categorias PT-BR para match na busca
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

// Converte "YYYY-MM-DD" ou "DD/MM/YYYY" → string ISO para comparação
function toSortableDate(data: string): string {
  if (!data) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(data)) return data.slice(0, 10);
  const m = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return data;
}

// Converte para DD/MM/YYYY para match na busca por data digitada pelo user
function toDisplayDate(data: string): string {
  if (!data) return "";
  const iso = data.slice(0, 10);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return data;
}

interface EngExpensesListProps {
  gastos: Gasto[];
  tarefas: Tarefa[];
  onEdit: (expense: Gasto) => void;
  onDelete: (id: string) => void;
  onDocumentsPress?: (expense: Gasto) => void;
  readOnly?: boolean;
  readOnlyReason?: "concluida" | "pausada";
  trackFinancial?: boolean;
  onEnableFinancial?: () => void;
  onDeleteAll?: () => void;
  onDisableTracking?: () => void;
}

export function EngExpensesList({
  gastos,
  tarefas,
  onEdit,
  onDelete,
  onDocumentsPress,
  readOnly = false,
  readOnlyReason,
  trackFinancial = true,
  onEnableFinancial,
  onDeleteAll,
  onDisableTracking,
}: EngExpensesListProps) {
  const [query, setQuery] = useState("");
  const [actionExpense, setActionExpense] = useState<Gasto | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Gasto | null>(null);

  // Sempre ordenado por data decrescente (mais recente primeiro)
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

  const readOnlyLabel =
    readOnlyReason === "concluida" ? "Projeto concluído" : "Projeto arquivado";
  const readOnlyIcon =
    readOnlyReason === "concluida" ? "check-circle" : "archive";

  const hasHeaderMenuItems =
    !readOnly && ((gastos.length > 0 && !!onDeleteAll) || !!onDisableTracking);

  // ── Acompanhamento desativado ──────────────────────────────────────────────
  if (!trackFinancial) {
    return (
      <View style={styles.disabledContainer}>
        <View style={styles.disabledIconWrap}>
          <MaterialIcons name="trending-up" size={40} color="#D1D5DB" />
        </View>
        <Text style={styles.disabledTitle}>
          Acompanhamento financeiro desativado
        </Text>
        <Text style={styles.disabledSub}>
          Ative para registrar e acompanhar os gastos desta obra
        </Text>
        {!readOnly && onEnableFinancial && (
          <TouchableOpacity
            style={styles.activateBtn}
            onPress={onEnableFinancial}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.activateBtnText}>Ativar Acompanhamento</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Estado normal ──────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.engSectionHeader}>
        <Text style={styles.engSectionTitle}>Gastos Registrados</Text>
        <View style={styles.headerRight}>
          <View style={styles.ativasBadge}>
            <Text style={styles.ativasText}>
              {query
                ? `${filteredGastos.length} de ${gastos.length}`
                : `${gastos.length} item${gastos.length !== 1 ? "s" : ""}`}
            </Text>
          </View>
          {hasHeaderMenuItems && (
            <TouchableOpacity
              style={styles.headerMoreBtn}
              onPress={() => setShowHeaderMenu(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <MaterialIcons name="more-vert" size={22} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Barra de busca ──────────────────────────────────────────────────── */}
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

      {readOnly && (
        <View style={styles.readOnlyBanner}>
          <MaterialIcons name={readOnlyIcon} size={15} color="#6B7280" />
          <Text style={styles.readOnlyBannerText}>
            {readOnlyLabel} — gastos somente leitura
          </Text>
        </View>
      )}

      {filteredGastos.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="receipt" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>
            {query
              ? `Nenhum gasto encontrado para "${query}"`
              : "Nenhum gasto registrado"}
          </Text>
        </View>
      ) : (
        filteredGastos.map((expense) => (
          <ExpenseItem
            key={expense.id}
            expense={expense}
            tarefas={tarefas}
            onEdit={readOnly ? undefined : onEdit}
            onMorePress={() => setActionExpense(expense)}
            onDocumentsPress={onDocumentsPress}
            readOnly={readOnly}
          />
        ))
      )}

      {/* ── Action sheet — gasto individual ──────────────────────────────────── */}
      <Modal
        visible={!!actionExpense}
        transparent
        animationType="fade"
        onRequestClose={() => setActionExpense(null)}
      >
        <TouchableOpacity
          style={styles.actionSheetBackdrop}
          activeOpacity={1}
          onPress={() => setActionExpense(null)}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle} numberOfLines={1}>
              {actionExpense?.descricao}
            </Text>

            {!readOnly && (
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={() => {
                  if (actionExpense) {
                    onEdit(actionExpense);
                    setActionExpense(null);
                  }
                }}
              >
                <MaterialIcons name="edit" size={20} color="#374151" />
                <Text style={styles.actionSheetItemText}>Editar gasto</Text>
              </TouchableOpacity>
            )}

            {onDocumentsPress && (
              <>
                {!readOnly && <View style={styles.actionSheetDivider} />}
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={() => {
                    if (actionExpense) {
                      onDocumentsPress(actionExpense);
                      setActionExpense(null);
                    }
                  }}
                >
                  <MaterialIcons name="attach-file" size={20} color="#2563EB" />
                  <Text style={styles.actionSheetItemText}>Ver comprovantes</Text>
                </TouchableOpacity>
              </>
            )}

            {!readOnly && (
              <>
                <View style={styles.actionSheetDivider} />
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={() => {
                    if (actionExpense) {
                      setDeleteConfirmExpense(actionExpense);
                      setActionExpense(null);
                    }
                  }}
                >
                  <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                  <Text style={[styles.actionSheetItemText, styles.actionSheetItemDanger]}>
                    Excluir gasto
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Confirmação de exclusão de gasto ─────────────────────────────────── */}
      <ConfirmSheet
        visible={!!deleteConfirmExpense}
        icon="delete-outline"
        iconColor="#EF4444"
        title="Excluir gasto?"
        message="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        confirmVariant="destructive"
        onConfirm={() => {
          if (deleteConfirmExpense) {
            onDelete(deleteConfirmExpense.id);
            setDeleteConfirmExpense(null);
          }
        }}
        onClose={() => setDeleteConfirmExpense(null)}
      />

      {/* ── Action sheet — menu do header (ações destrutivas) ────────────────── */}
      <Modal
        visible={showHeaderMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderMenu(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowHeaderMenu(false)}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle}>Opções de acompanhamento</Text>

            {gastos.length > 0 && onDeleteAll && (
              <>
                <TouchableOpacity
                  style={styles.actionSheetItem}
                  onPress={() => {
                    setShowHeaderMenu(false);
                    onDeleteAll();
                  }}
                >
                  <MaterialIcons name="delete-sweep" size={20} color="#EF4444" />
                  <Text style={[styles.actionSheetItemText, styles.actionSheetItemDanger]}>
                    Excluir todos os gastos
                  </Text>
                </TouchableOpacity>
                {onDisableTracking && <View style={styles.actionSheetDivider} />}
              </>
            )}

            {onDisableTracking && (
              <TouchableOpacity
                style={styles.actionSheetItem}
                onPress={() => {
                  setShowHeaderMenu(false);
                  onDisableTracking();
                }}
              >
                <MaterialIcons name="toggle-off" size={20} color="#DC2626" />
                <Text style={[styles.actionSheetItemText, { color: "#DC2626", fontWeight: "700" }]}>
                  Desativar acompanhamento financeiro
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Disabled state ──────────────────────────────────────────────────────────
  disabledContainer: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  disabledIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  disabledTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  disabledSub: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 19,
  },
  activateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  activateBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Normal state ────────────────────────────────────────────────────────────
  engSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  engSectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ativasBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ativasText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  headerMoreBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 14, color: "#9CA3AF", fontWeight: "500" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  readOnlyBannerText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },

  // ── Action sheet ────────────────────────────────────────────────────────────
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  actionSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  actionSheetTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  actionSheetDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
  },
  actionSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionSheetItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  actionSheetItemDanger: {
    color: "#EF4444",
  },
});
