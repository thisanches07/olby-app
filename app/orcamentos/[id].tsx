import { DemandFormModal } from "@/components/orcamentos/demand-form-modal";
import {
  QuoteCard,
  QuoteSkeletonCard,
} from "@/components/orcamentos/quote-card";
import {
  QuoteFormModal,
  type QuoteFormData,
} from "@/components/orcamentos/quote-form-modal";
import {
  ActionMenuSheet,
  type ActionMenuItem,
} from "@/components/diario/action-menu-sheet";
import { useToast } from "@/components/obra/toast";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { QUOTE_STATUS_UI, formatCentsBRL } from "@/constants/quote-status";
import { useQuoteGroup } from "@/hooks/use-quotes-data";
import { getErrorMessage } from "@/services/api";
import type { QuoteResponse } from "@/services/quotes.service";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY = "#2563EB";
const SUCCESS = "#16A34A";

export default function DemandDetailScreen() {
  const { id, ro } = useLocalSearchParams<{ id: string; ro?: string }>();
  const canEdit = ro !== "1";
  const { showToast } = useToast();
  const {
    group,
    isLoading,
    isSaving,
    error,
    addQuote,
    updateQuote,
    deleteQuote,
    updateGroup,
    choose,
    reopen,
    deleteGroup,
    fetchSupplierSuggestions,
  } = useQuoteGroup(id);

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuoteResponse | null>(null);
  const [showDemandForm, setShowDemandForm] = useState(false);
  const [pendingChoose, setPendingChoose] = useState<QuoteResponse | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<QuoteResponse | null>(
    null,
  );
  const [menuQuote, setMenuQuote] = useState<QuoteResponse | null>(null);
  const [showDemandMenu, setShowDemandMenu] = useState(false);
  const [confirmDeleteDemand, setConfirmDeleteDemand] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);

  const fail = (e: unknown, fallback: string) =>
    showToast({
      title: "Erro",
      message: getErrorMessage(e, fallback),
      tone: "error",
    });

  const handleSaveQuote = async (data: QuoteFormData) => {
    if (editingQuote) {
      await updateQuote(editingQuote.id, data);
    } else {
      await addQuote({ quoteGroupId: id!, ...data });
    }
    setShowQuoteForm(false);
    setEditingQuote(null);
  };

  const isDecided = group?.status === "DECIDED";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {group?.title ?? "Demanda"}
        </Text>
        {canEdit && group ? (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowDemandMenu(true)}
            hitSlop={8}
          >
            <MaterialIcons name="more-vert" size={22} color="#374151" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.content}>
          {[0, 1, 2].map((i) => (
            <QuoteSkeletonCard key={i} />
          ))}
        </View>
      ) : error || !group ? (
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={36} color="#D1D5DB" />
          <Text style={styles.muted}>
            {error ?? "Demanda não encontrada."}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: QUOTE_STATUS_UI[group.status].tint },
              ]}
            >
              <MaterialIcons
                name={QUOTE_STATUS_UI[group.status].icon}
                size={13}
                color={QUOTE_STATUS_UI[group.status].color}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: QUOTE_STATUS_UI[group.status].color },
                ]}
              >
                {QUOTE_STATUS_UI[group.status].label}
              </Text>
            </View>
            <Text style={styles.countText}>
              {group.quotesCount} cotaç
              {group.quotesCount === 1 ? "ão" : "ões"}
            </Text>
          </View>

          {!!group.description && (
            <Text style={styles.description}>{group.description}</Text>
          )}

          {isDecided && group.chosenQuote && (
            <View style={styles.decisionBanner}>
              <MaterialIcons name="verified" size={20} color={SUCCESS} />
              <View style={{ flex: 1 }}>
                <Text style={styles.decisionLabel}>Decisão de compra</Text>
                <Text style={styles.decisionValue}>
                  {group.chosenQuote.supplierName} ·{" "}
                  {formatCentsBRL(group.chosenQuote.amountCents)}
                </Text>
                {!!group.generatedExpenseId && (
                  <Text style={styles.decisionHint}>
                    Lançado como gasto da obra
                  </Text>
                )}
              </View>
              {canEdit && (
                <TouchableOpacity
                  style={styles.reopenBtn}
                  onPress={() => setConfirmReopen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.reopenText}>Reabrir</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {group.quotes.length === 0 ? (
            <View style={styles.center}>
              <MaterialIcons
                name="request-quote"
                size={36}
                color="#D1D5DB"
              />
              <Text style={styles.muted}>
                Nenhuma cotação ainda. Adicione orçamentos de fornecedores
                para comparar.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 4 }}>
              {group.quotes.map((q) => (
                <QuoteCard
                  key={q.id}
                  quote={q}
                  decided={isDecided}
                  canEdit={canEdit}
                  onChoose={() => setPendingChoose(q)}
                  onMore={() => setMenuQuote(q)}
                />
              ))}
            </View>
          )}

          {canEdit && !isDecided && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setEditingQuote(null);
                setShowQuoteForm(true);
              }}
              activeOpacity={0.88}
            >
              <MaterialIcons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Adicionar orçamento</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <QuoteFormModal
        visible={showQuoteForm}
        editing={editingQuote}
        isSaving={isSaving}
        onClose={() => {
          setShowQuoteForm(false);
          setEditingQuote(null);
        }}
        onSave={handleSaveQuote}
        fetchSuggestions={fetchSupplierSuggestions}
      />

      <DemandFormModal
        visible={showDemandForm}
        initial={
          group
            ? { title: group.title, description: group.description }
            : null
        }
        isSaving={isSaving}
        onClose={() => setShowDemandForm(false)}
        onSave={async (data) => {
          await updateGroup({
            title: data.title,
            description: data.description || null,
          });
          setShowDemandForm(false);
        }}
      />

      <ActionMenuSheet
        visible={showDemandMenu}
        title={group?.title}
        actions={
          [
            {
              label: "Editar demanda",
              icon: "edit",
              onPress: () => setShowDemandForm(true),
            },
            {
              label: "Excluir demanda",
              icon: "delete-outline",
              variant: "destructive",
              onPress: () => setConfirmDeleteDemand(true),
            },
          ] as ActionMenuItem[]
        }
        onClose={() => setShowDemandMenu(false)}
      />

      <ConfirmSheet
        visible={confirmDeleteDemand}
        icon="delete-outline"
        title="Excluir demanda?"
        message="A demanda e todos os orçamentos vinculados serão removidos permanentemente."
        confirmLabel="Excluir"
        onConfirm={() => {
          setConfirmDeleteDemand(false);
          deleteGroup()
            .then(() => router.back())
            .catch((e) =>
              fail(e, "Não foi possível excluir a demanda."),
            );
        }}
        onClose={() => setConfirmDeleteDemand(false)}
      />

      <ActionMenuSheet
        visible={menuQuote !== null}
        title={menuQuote?.supplierName}
        actions={
          menuQuote
            ? ([
                {
                  label: "Editar orçamento",
                  icon: "edit",
                  onPress: () => {
                    setEditingQuote(menuQuote);
                    setShowQuoteForm(true);
                  },
                },
                {
                  label: "Excluir orçamento",
                  icon: "delete-outline",
                  variant: "destructive",
                  onPress: () => setPendingDelete(menuQuote),
                },
              ] as ActionMenuItem[])
            : []
        }
        onClose={() => setMenuQuote(null)}
      />

      <ConfirmSheet
        visible={pendingChoose !== null}
        icon="check-circle"
        iconColor={SUCCESS}
        confirmVariant="primary"
        title="Escolher este orçamento?"
        message={
          pendingChoose
            ? `${pendingChoose.supplierName} · ${formatCentsBRL(
                pendingChoose.amountCents,
              )}. Se o financeiro estiver ativo, será lançado como gasto da obra.`
            : undefined
        }
        confirmLabel="Confirmar escolha"
        onConfirm={() => {
          const q = pendingChoose;
          setPendingChoose(null);
          if (!q) return;
          choose(q.id)
            .then(() => {
              showToast({
                title: "Orçamento escolhido",
                message: `${q.supplierName} foi definido como fornecedor escolhido.`,
                tone: "success",
              });
              router.back();
            })
            .catch((e) =>
              fail(e, "Não foi possível registrar a decisão."),
            );
        }}
        onClose={() => setPendingChoose(null)}
      />

      <ConfirmSheet
        visible={pendingDelete !== null}
        icon="delete-outline"
        title="Remover cotação?"
        message="Esta cotação será removida permanentemente."
        confirmLabel="Remover"
        onConfirm={() => {
          const q = pendingDelete;
          setPendingDelete(null);
          if (q)
            deleteQuote(q.id).catch((e) =>
              fail(e, "Não foi possível remover a cotação."),
            );
        }}
        onClose={() => setPendingDelete(null)}
      />

      <ConfirmSheet
        visible={confirmReopen}
        icon="lock-open"
        iconColor={PRIMARY}
        confirmVariant="primary"
        title="Reabrir decisão?"
        message="A demanda volta a ficar em cotação. O gasto lançado a partir desta decisão será removido."
        confirmLabel="Reabrir"
        onConfirm={() => {
          setConfirmReopen(false);
          reopen()
            .then(() => {
              showToast({
                title: "Demanda reaberta",
                message: "O gasto gerado por esta decisão foi removido.",
                tone: "success",
              });
              router.back();
            })
            .catch((e) =>
              fail(e, "Não foi possível reabrir a demanda."),
            );
        }}
        onClose={() => setConfirmReopen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F6",
  },
  headerBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  content: { padding: 16, paddingBottom: 32 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    gap: 10,
  },
  muted: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  countText: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 21,
    marginBottom: 14,
  },
  decisionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  decisionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  decisionValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#14532D",
    marginTop: 2,
  },
  decisionHint: { fontSize: 12, color: "#16A34A", marginTop: 2 },
  reopenBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  reopenText: { fontSize: 13, fontWeight: "700", color: "#15803D" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 16,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
