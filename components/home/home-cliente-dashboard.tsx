import type { ObraDetalhe } from "@/data/obras";
import React from "react";
import { View } from "react-native";
import { HomeClienteActivityFeed } from "./home-cliente-activity-feed";
import { HomeClienteAlerts } from "./home-cliente-alerts";

interface HomeClienteDashboardProps {
  obras: ObraDetalhe[];
  onPaymentAlert?: (obraId: string) => void;
}

export function HomeClienteDashboard({
  obras,
  onPaymentAlert,
}: HomeClienteDashboardProps) {
  return (
    <View>
      <HomeClienteAlerts obras={obras} onActionPress={onPaymentAlert} />
      <HomeClienteActivityFeed obras={obras} />
    </View>
  );
}
