import { ExpandableDescription } from "@/components/diario/expandable-description";
import { formatCentsBRL } from "@/constants/quote-status";
import type { QuoteResponse } from "@/services/quotes.service";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRPhone, toWhatsAppUrl } from "@/utils/phone";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2563EB";
const SUCCESS = "#16A34A";
const WHATSAPP = "#25D366";

interface QuoteCardProps {
  quote: QuoteResponse;
  /** Demanda já decidida (mostra estado final). */
  decided: boolean;
  canEdit: boolean;
  onChoose?: () => void;
  onMore?: () => void;
}

export function QuoteCard({
  quote,
  decided,
  canEdit,
  onChoose,
  onMore,
}: QuoteCardProps) {
  const waUrl = quote.supplierPhone
    ? toWhatsAppUrl(quote.supplierPhone)
    : null;

  const openWhatsApp = async () => {
    if (!waUrl) return;
    const ok = await Linking.canOpenURL(waUrl).catch(() => false);
    if (ok) Linking.openURL(waUrl);
    else Alert.alert("WhatsApp", "Não foi possível abrir o WhatsApp.");
  };

  const dimmed = decided && !quote.isChosen;
  const initial = quote.supplierName.trim().charAt(0).toUpperCase() || "?";

  return (
    <View
      style={[
        styles.card,
        quote.isChosen && styles.cardChosen,
        dimmed && styles.cardDimmed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.supplierWrap}>
          {/* Avatar: WhatsApp (se telefone) > check (se escolhida) > inicial */}
          <TouchableOpacity
            style={[
              styles.avatar,
              waUrl
                ? styles.avatarWa
                : quote.isChosen
                  ? styles.avatarChosen
                  : styles.avatarPlain,
            ]}
            onPress={waUrl ? openWhatsApp : undefined}
            disabled={!waUrl}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.85}
          >
            {waUrl ? (
              <MaterialCommunityIcons
                name="whatsapp"
                size={17}
                color="#FFFFFF"
              />
            ) : quote.isChosen ? (
              <MaterialIcons name="check" size={17} color="#FFFFFF" />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.supplierInfo}>
            <Text style={styles.supplier} numberOfLines={1}>
              {quote.supplierName}
            </Text>
            {waUrl ? (
              <TouchableOpacity
                onPress={openWhatsApp}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.7}
              >
                <Text style={styles.phoneLink} numberOfLines={1}>
                  {quote.supplierPhone
                    ? formatBRPhone(quote.supplierPhone)
                    : "WhatsApp"}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.phoneMuted}>Sem WhatsApp</Text>
            )}
          </View>
        </View>

        {canEdit && onMore && (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={onMore}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <MaterialIcons name="more-vert" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.amountRow}>
        <Text
          style={[styles.amount, quote.isChosen && { color: SUCCESS }]}
        >
          {formatCentsBRL(quote.amountCents)}
        </Text>
        <View style={styles.badges}>
          {quote.isChosen && (
            <View style={[styles.badge, { backgroundColor: "#ECFDF5" }]}>
              <MaterialIcons name="verified" size={12} color={SUCCESS} />
              <Text style={[styles.badgeText, { color: SUCCESS }]}>
                Escolhida
              </Text>
            </View>
          )}
          {quote.isLowest && !quote.isChosen && (
            <View style={[styles.badge, { backgroundColor: "#EFF6FF" }]}>
              <MaterialIcons name="trending-down" size={12} color={PRIMARY} />
              <Text style={[styles.badgeText, { color: PRIMARY }]}>
                Melhor valor
              </Text>
            </View>
          )}
        </View>
      </View>

      {!!quote.notes && (
        <ExpandableDescription description={quote.notes} />
      )}

      {canEdit && !decided && onChoose && (
        <PressableScale
          style={styles.chooseBtn}
          onPress={onChoose}
          scaleTo={0.98}
        >
          <MaterialIcons name="check-circle" size={16} color={PRIMARY} />
          <Text style={styles.chooseText}>Escolher este orçamento</Text>
        </PressableScale>
      )}
    </View>
  );
}

// ─── Skeleton (espelha o layout real) ─────────────────────────────────────────

export function QuoteSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.supplierWrap}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width="50%" height={15} borderRadius={5} />
        </View>
        <Skeleton width={20} height={20} borderRadius={6} />
      </View>
      <View style={styles.amountRow}>
        <Skeleton width={110} height={18} borderRadius={6} />
        <Skeleton width={84} height={20} borderRadius={99} />
      </View>
      <Skeleton width="90%" height={13} borderRadius={5} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    gap: 10,
  },
  cardChosen: {
    borderColor: SUCCESS,
    borderWidth: 1.5,
    backgroundColor: "#F6FEF9",
  },
  cardDimmed: { opacity: 0.55 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  supplierWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarWa: { backgroundColor: WHATSAPP, borderColor: "#1FB855" },
  avatarChosen: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  avatarPlain: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  avatarInitial: { fontSize: 14, fontWeight: "800", color: "#6B7280" },
  supplierInfo: { flex: 1, gap: 2 },
  supplier: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  phoneLink: { fontSize: 12, fontWeight: "600", color: SUCCESS },
  phoneMuted: { fontSize: 12, fontWeight: "500", color: "#9CA3AF" },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  amount: { fontSize: 19, fontWeight: "800", color: "#111827" },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  chooseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#F3F6FC",
    borderWidth: 1,
    borderColor: "#DCE6F8",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 2,
  },
  chooseText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
});
