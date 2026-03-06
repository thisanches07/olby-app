import type { ObraDetalhe } from "@/data/obras";
import React from "react";
import { View } from "react-native";
import { HomeEngenheiroAlerts } from "./home-engenheiro-alerts";
import { HomeEngenheiroQuickActions } from "./home-engenheiro-quick-actions";

interface HomeEngenheiroDashboardProps {
  obras: ObraDetalhe[];
  onAddTask?: () => void;
  onAddExpense?: () => void;
  onViewAnalytics?: () => void;
  onNavigateAlert?: (obraId: string, type: string) => void;
}

export function HomeEngenheiroDashboard({
  obras,
  onAddTask,
  onAddExpense,
  onViewAnalytics,
  onNavigateAlert,
}: HomeEngenheiroDashboardProps) {
  return (
    <View>
      <HomeEngenheiroAlerts obras={obras} onNavigate={onNavigateAlert} />
      <HomeEngenheiroQuickActions
        onAddTask={onAddTask}
        onAddExpense={onAddExpense}
        onViewAnalytics={onViewAnalytics}
      />
    </View>
  );
}
