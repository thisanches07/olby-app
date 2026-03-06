import type { ObraDetalhe } from "@/data/obras";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#2563EB";

interface HomeClienteAlertsProps {
  obras: ObraDetalhe[];
  onActionPress?: (obraId: string) => void;
}

export function HomeClienteAlerts({
  obras,
  onActionPress,
}: HomeClienteAlertsProps) {
  // Filtrar pagamentos pendentes nos próximos 7 dias
  const proximosPagamentos = obras
    .filter(
      (o) =>
        o.proximoPagamento.diasRestantes > 0 &&
        o.proximoPagamento.diasRestantes <= 7,
    )
    .slice(0, 3);

  if (proximosPagamentos.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertas Importantes</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {proximosPagamentos.map((obra) => (
          <View key={obra.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={styles.alertIcon}>
                <MaterialIcons name="warning" size={20} color="#F59E0B" />
              </View>
              <TouchableOpacity onPress={() => onActionPress?.(obra.id)}>
                <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.alertTitle} numberOfLines={2}>
              {obra.nome}
            </Text>
            <Text style={styles.alertText}>
              Pagamento em {obra.proximoPagamento.diasRestantes}{" "}
              {obra.proximoPagamento.diasRestantes === 1 ? "dia" : "dias"}
            </Text>
            <Text style={styles.alertValue}>
              {obra.proximoPagamento.valor.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 16,
  },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    width: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  alertText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 6,
  },
  alertValue: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
  },
});
