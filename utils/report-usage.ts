import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlanCode } from "@/services/subscription.service";

const BASIC_MONTHLY_LIMIT = 1;
const KEY_PREFIX = "report_usage_";

function storageKey(projectId: string): string {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${KEY_PREFIX}${projectId}_${ym}`;
}

export async function getMonthlyUsage(projectId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(projectId));
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function checkReportAccess(
  projectId: string,
  planCode: PlanCode,
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  if (planCode === "PRO") {
    return { allowed: true, used: 0, limit: null };
  }
  if (planCode === "FREE") {
    return { allowed: false, used: 0, limit: 0 };
  }
  // BASIC
  const used = await getMonthlyUsage(projectId);
  return {
    allowed: used < BASIC_MONTHLY_LIMIT,
    used,
    limit: BASIC_MONTHLY_LIMIT,
  };
}

/**
 * DEV: remove todos os contadores de uso de relatório (todos os projetos,
 * todos os meses). Retorna quantas chaves foram apagadas.
 */
export async function resetReportUsage(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const reportKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
    if (reportKeys.length > 0) {
      await AsyncStorage.multiRemove(reportKeys);
    }
    return reportKeys.length;
  } catch {
    return 0;
  }
}

export async function recordReportGeneration(projectId: string): Promise<void> {
  try {
    const key = storageKey(projectId);
    const raw = await AsyncStorage.getItem(key);
    const current = raw ? parseInt(raw, 10) : 0;
    await AsyncStorage.setItem(key, String(current + 1));
  } catch {
    // Non-critical — don't throw
  }
}
