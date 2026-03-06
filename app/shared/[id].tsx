import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { CircularProgress } from "@/components/obra/circular-progress";
import { ProjectExpensesSection } from "@/components/projeto/project-expenses-section";
import { ProjectFinancialCards } from "@/components/projeto/project-financial-cards";
import { ProjectFinancialSummary } from "@/components/projeto/project-financial-summary";
import { ProjectTitleSection } from "@/components/projeto/project-title-section";
import { ObraDetalhe } from "@/data/obras";
import { useProjectSharing } from "@/hooks/use-project-sharing";

const PRIMARY = "#2563EB";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

export default function SharedProjectScreen() {
  const router = useRouter();
  const { id, token } = useLocalSearchParams<{ id: string; token: string }>();
  const { validateToken, markTokenAsUsed } = useProjectSharing();

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [invalidReason, setInvalidReason] = useState<
    "expired" | "used" | "not_found" | "revoked" | null
  >(null);
  const [obra, setObra] = useState<ObraDetalhe | null>(null);

  useEffect(() => {
    validateSharedLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const validateSharedLink = async () => {
    setIsValidating(true);
    setIsValid(false);
    setInvalidReason(null);
    setObra(null);

    if (!id || !token || !apiBaseUrl) {
      setInvalidReason("not_found");
      setIsValidating(false);
      return;
    }

    try {
      // 1) valida token
      const result = await validateToken(id, token);

      if (!result?.valid) {
        setInvalidReason(result?.reason || "not_found");
        return;
      }

      // 2) busca projeto real
      const response = await fetch(`${apiBaseUrl}/projects/${id}`);

      if (!response.ok) {
        setInvalidReason("not_found");
        return;
      }

      const project: ObraDetalhe = await response.json();

      setObra(project);
      setIsValid(true);

      // 3) marca token como usado
      await markTokenAsUsed(id, token);
    } catch (error) {
      setInvalidReason("not_found");
    } finally {
      setIsValidating(false);
    }
  };

  if (isValidating) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={styles.validatingText}>Validando acesso...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isValid || !obra) {
    let errorMessage = "Link inválido";
    let errorDescription = "";

    switch (invalidReason) {
      case "expired":
        errorMessage = "Link Expirado";
        errorDescription =
          "Este link de compartilhamento expirou. Solicite um novo link ao engenheiro.";
        break;
      case "used":
        errorMessage = "Link Já Utilizado";
        errorDescription =
          "Este link já foi acessado uma vez. Por segurança, links de compartilhamento funcionam apenas uma única vez.";
        break;
      case "not_found":
        errorMessage = "Link Inválido";
        errorDescription =
          "O link de compartilhamento não pode ser encontrado ou é inválido.";
        break;
      case "revoked":
        errorMessage = "Link Revogado";
        errorDescription =
          "Este link de compartilhamento foi revogado pelo engenheiro.";
        break;
    }

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Projeto Compartilhado</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <MaterialIcons name="error-outline" size={48} color="#DC2626" />
          </View>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <Text style={styles.errorDescription}>{errorDescription}</Text>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Projeto Compartilhado</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Shared Access Banner */}
      <View style={styles.banner}>
        <MaterialIcons name="info" size={18} color="#0369A1" />
        <Text style={styles.bannerText}>
          Você está visualizando um projeto em modo de acesso. Este link
          funcionará apenas neste acesso.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress */}
        <View style={styles.progressSection}>
          <CircularProgress
            value={obra.progresso}
            size={180}
            strokeWidth={14}
          />
        </View>

        {/* Project Title */}
        <ProjectTitleSection obra={obra} etapaAtual={obra.etapaAtual} />

        {/* Financial Cards */}
        <ProjectFinancialCards obra={obra} />

        {/* Expenses */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="receipt" size={20} color={PRIMARY} />
            <Text style={styles.sectionTitle}>Gastos</Text>
          </View>
          <ProjectExpensesSection
            gastos={obra.gastos}
            tarefas={obra.tarefas}
          />
        </View>

        {/* Financial Summary */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="account-balance-wallet"
              size={20}
              color={PRIMARY}
            />
            <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
          </View>
          <ProjectFinancialSummary obra={obra} />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  banner: {
    backgroundColor: "#E0F2FE",
    borderLeftWidth: 4,
    borderLeftColor: "#0369A1",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bannerText: {
    fontSize: 13,
    color: "#0369A1",
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 16,
  },
  validatingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  errorDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  backBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: PRIMARY,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  progressSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  sectionContainer: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
});
