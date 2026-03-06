import type { ObraDetalhe } from "@/data/obras";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#2563EB";

interface HomeEngenheiroAlertsProps {
  obras: ObraDetalhe[];
  onNavigate?: (obraId: string, type: string) => void;
}

export function HomeEngenheiroAlerts({
  obras,
  onNavigate,
}: HomeEngenheiroAlertsProps) {
  const orcamentoEmRisco = obras.filter(
    (o) => (o.totalInvestido / o.orcamento) * 100 > 80,
  );
  const tarefasVencidas = obras
    .flatMap((o) =>
      o.tarefas.map((t) => ({ ...t, obraId: o.id, obraNome: o.nome })),
    )
    .filter((t) => !t.concluida && t.prioridade === "ALTA")
    .slice(0, 3);

  if (orcamentoEmRisco.length === 0 && tarefasVencidas.length === 0)
    return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertas Técnicos</Text>

      {orcamentoEmRisco.length > 0 && (
        <AlertCard
          icon="attach-money"
          iconBg="#FEE2E2"
          iconColor="#EF4444"
          title={`${orcamentoEmRisco.length} obra(s) com orçamento crítico`}
          subtitle="Mais de 80% do orçamento utilizado"
          onPress={() => onNavigate?.(orcamentoEmRisco[0].id, "budget")}
        />
      )}

      {tarefasVencidas.length > 0 && (
        <AlertCard
          icon="assignment-late"
          iconBg="#FEF3C7"
          iconColor="#F59E0B"
          title={`${tarefasVencidas.length} tarefa(s) crítica(s)`}
          subtitle="Prioridade alta pendente"
          onPress={() => onNavigate?.(tarefasVencidas[0].obraId, "tasks")}
        />
      )}
    </View>
  );
}

function AlertCard({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.alertCard} onPress={onPress}>
      <View
        style={[
          styles.alertIconBg,
          {
            backgroundColor: iconBg,
          },
        ]}
      >
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
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
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  alertSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
});
