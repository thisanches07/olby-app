import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import type { PlanCode } from "@/services/subscription.service";
import type { ReportPeriod } from "@/services/report.service";

const CACHE_PREFIX = "report_usage_cache_";

/** Máximo aceito pelo backend para periodDays (relatório "obra toda"). */
const ALL_PERIOD_DAYS = 3650;

export interface ReportUsage {
  used: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
  resetsAt: string | null;
  planCode?: PlanCode;
}

interface ReportUsageResponse {
  projectId: string;
  planCode: PlanCode;
  used: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
  periodStart: string;
  periodEnd: string;
  resetsAt: string;
}

interface CreateGenerationResponse {
  generationId: string;
  usage: {
    used: number;
    limit: number | null;
    remaining: number | null;
    allowed: boolean;
    resetsAt: string;
  };
}

function cacheKey(projectId: string): string {
  return `${CACHE_PREFIX}${projectId}`;
}

/** Converte o período da tela em dias para o backend (1..3650). */
export function periodToDays(period: ReportPeriod): number {
  return period === "all" ? ALL_PERIOD_DAYS : period;
}

async function writeCache(projectId: string, usage: ReportUsage): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(projectId), JSON.stringify(usage));
  } catch {
    // Cache é apenas visual — não-crítico.
  }
}

/**
 * Último valor de uso conhecido (cache local). Serve só para exibição imediata
 * enquanto o GET autoritativo carrega. Pode estar desatualizado.
 */
export async function getCachedReportUsage(
  projectId: string,
): Promise<ReportUsage | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(projectId));
    return raw ? (JSON.parse(raw) as ReportUsage) : null;
  } catch {
    return null;
  }
}

/**
 * Consulta o uso/limite mensal de relatórios no backend (não consome nada).
 * Atualiza o cache local. Em erro de rede, cai para o cache; sem cache, devolve
 * um default permissivo (o POST de geração é a autoridade final).
 */
export async function checkReportAccess(
  projectId: string,
): Promise<ReportUsage> {
  try {
    const res = await api.get<ReportUsageResponse>(
      `/projects/${projectId}/reports/usage`,
    );
    const usage: ReportUsage = {
      used: res.used,
      limit: res.limit,
      remaining: res.remaining,
      allowed: res.allowed,
      resetsAt: res.resetsAt,
      planCode: res.planCode,
    };
    await writeCache(projectId, usage);
    return usage;
  } catch {
    const cached = await getCachedReportUsage(projectId);
    if (cached) return cached;
    return {
      used: 0,
      limit: null,
      remaining: null,
      allowed: true,
      resetsAt: null,
    };
  }
}

/**
 * Registra a geração de um relatório no backend (consome 1 do limite, exceto PRO).
 * Idempotente por `idempotencyKey` — reenviar a mesma key não reconta. Propaga
 * `ApiError` (403 REPORT_LIMIT_REACHED) ao chamador.
 */
export async function recordReportGeneration(
  projectId: string,
  periodDays: number,
  idempotencyKey: string,
): Promise<{ generationId: string; usage: ReportUsage }> {
  const res = await api.post<CreateGenerationResponse>(
    `/projects/${projectId}/reports/generations`,
    { periodDays, idempotencyKey },
  );
  const usage: ReportUsage = {
    used: res.usage.used,
    limit: res.usage.limit,
    remaining: res.usage.remaining,
    allowed: res.usage.allowed,
    resetsAt: res.usage.resetsAt,
  };
  await writeCache(projectId, usage);
  return { generationId: res.generationId, usage };
}

/**
 * DEV: limpa o cache visual de uso de relatórios (todos os projetos). O limite
 * real é server-side e não é afetado por isto. Retorna quantas chaves apagou.
 */
export async function resetReportUsage(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const reportKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (reportKeys.length > 0) {
      await AsyncStorage.multiRemove(reportKeys);
    }
    return reportKeys.length;
  } catch {
    return 0;
  }
}
