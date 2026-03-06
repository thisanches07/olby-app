import type { ObraDetalhe } from "@/data/obras";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface HomeClienteActivityFeedProps {
  obras: ObraDetalhe[];
}

export function HomeClienteActivityFeed({
  obras,
}: HomeClienteActivityFeedProps) {
  // Simular atividades recentes - em produção viria de useDiaryState
  const recentActivities = generateActivities(obras).slice(0, 4);

  if (recentActivities.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Atividades Recentes</Text>
      <View style={styles.feed}>
        {recentActivities.map((activity, idx) => (
          <View key={idx} style={styles.activityItem}>
            <View style={styles.dot} />
            <View style={styles.content}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityMeta}>{activity.obraNome}</Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function generateActivities(
  obras: ObraDetalhe[],
): { title: string; obraNome: string; time: string }[] {
  // Em produção, isso viria de useDiaryState hook
  return obras.slice(0, 4).map((obra) => ({
    title: "Atualização de progresso registrada",
    obraNome: obra.nome,
    time: "Há 2 horas",
  }));
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  feed: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityItem: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "flex-start",
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginTop: 6,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  activityMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: "#D1D5DB",
    marginTop: 2,
  },
});
