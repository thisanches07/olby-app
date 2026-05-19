import { PressableScale } from "@/components/ui/pressable-scale";
import { Skeleton } from "@/components/ui/skeleton";
import { QUOTE_STATUS_UI, formatCentsBRL } from "@/constants/quote-status";
import type { QuoteGroupResponse } from "@/services/quotes.service";
import { toWhatsAppUrl } from "@/utils/phone";
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

export function DemandCard({
  demand,
  onPress,
  onMore,
}: {
  demand: QuoteGroupResponse;
  onPress: () => void;
  onMore?: () => void;
}) {
  const status = QUOTE_STATUS_UI[demand.status];
  const isDecided = demand.status === "DECIDED";
  const chosen = demand.chosenQuote;
  const waUrl =
    isDecided && chosen?.supplierPhone
      ? toWhatsAppUrl(chosen.supplierPhone)
      : null;

  const openWhatsApp = async () => {
    if (!waUrl) return;
    const ok = await Linking.canOpenURL(waUrl).catch(() => false);
    if (ok) Linking.openURL(waUrl);
    else Alert.alert("WhatsApp", "Não foi possível abrir o WhatsApp.");
  };

  return (
    <PressableScale
      style={[styles.card, isDecided && styles.cardDecided]}
      onPress={onPress}
      scaleTo={0.98}
    >
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {demand.title}
        </Text>
        {onMore && (
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

      {!!demand.description && (
        <Text style={styles.desc} numberOfLines={2}>
          {demand.description}
        </Text>
      )}

      {isDecided && chosen ? (
        <View style={styles.decisionRow}>
          <View style={styles.decisionMain}>
            <View style={styles.supplierRow}>
              <MaterialIcons name="check-circle" size={18} color={SUCCESS} />
              <Text style={styles.supplierName} numberOfLines={1}>
                {chosen.supplierName}
              </Text>
            </View>
            <Text style={styles.decisionValue}>
              {formatCentsBRL(chosen.amountCents)}
            </Text>
            <Text style={styles.decisionCaption}>ESCOLHIDO</Text>
          </View>

          {waUrl && (
            <TouchableOpacity
              style={styles.waPill}
              onPress={openWhatsApp}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="whatsapp"
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.metaRow}>
            <View style={[styles.statusPill, { backgroundColor: status.tint }]}>
              <MaterialIcons
                name={status.icon}
                size={12}
                color={status.color}
              />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.metaText} numberOfLines={1}>
              {demand.quotesCount === 0
                ? "Nenhuma cotação ainda"
                : `${demand.quotesCount} cotaç${
                    demand.quotesCount === 1 ? "ão" : "ões"
                  } · ${formatCentsBRL(demand.minAmountCents)}${
                    demand.maxAmountCents !== demand.minAmountCents
                      ? ` – ${formatCentsBRL(demand.maxAmountCents)}`
                      : ""
                  }`}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#C7CCD6" />
          </View>
        </>
      )}
    </PressableScale>
  );
}

// ─── Skeleton (espelha o layout real) ─────────────────────────────────────────

export function DemandSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Skeleton width="55%" height={18} borderRadius={6} />
        <Skeleton width={20} height={20} borderRadius={6} />
      </View>
      <View style={styles.metaRow}>
        <Skeleton width={96} height={22} borderRadius={99} />
      </View>
      <Skeleton width="80%" height={13} borderRadius={5} />
      <View style={styles.footer}>
        <Skeleton width={150} height={13} borderRadius={5} />
        <Skeleton width={20} height={20} borderRadius={6} />
      </View>
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
    borderColor: "#F0F4FB",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 8,
  },
  cardDecided: {
    borderLeftWidth: 3,
    borderLeftColor: SUCCESS,
    borderColor: "#E4F4EA",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  metaRow: { flexDirection: "row" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  desc: { fontSize: 13, color: "#6B7280", lineHeight: 18 },

  // ── Decisão ──
  decisionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
  },
  decisionMain: { flex: 1, gap: 2 },
  supplierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  supplierName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.2,
  },
  decisionValue: {
    fontSize: 17,
    fontWeight: "800",
    color: SUCCESS,
    letterSpacing: -0.3,
  },
  decisionCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5BA66F",
    letterSpacing: 1,
  },
  waPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: WHATSAPP,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 99,
  },
  waPillText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  // ── Em cotação ──
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    gap: 10,
  },
  metaText: { fontSize: 13, color: "#6B7280", fontWeight: "600", flex: 1 },
});
