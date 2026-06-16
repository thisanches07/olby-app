import type { ActivityStatus, Atividade, Etapa, StageStatus } from "@/data/obras";
import type { ActivityResponseDto } from "@/services/activities.service";
import type { StagePriority, StageResponseDto } from "@/services/stages.service";

export type LocalPriority = "ALTA" | "MEDIA" | "BAIXA";

export function stagePriorityFromApi(
  p: StagePriority | null,
): LocalPriority | null {
  if (p === "HIGH") return "ALTA";
  if (p === "MEDIUM") return "MEDIA";
  if (p === "LOW") return "BAIXA";
  return null;
}

export function stagePriorityToApi(
  p: LocalPriority | null | undefined,
): StagePriority | undefined {
  if (p === "ALTA") return "HIGH";
  if (p === "MEDIA") return "MEDIUM";
  if (p === "BAIXA") return "LOW";
  return undefined;
}

/** Razão de progresso 0..1, ou null quando não há atividades. Robusto a
 * diferenças de contrato (0..1 vs 0..100): sempre derivamos das contagens. */
export function progressRatio(completed: number, total: number): number | null {
  return total > 0 ? Math.min(Math.max(completed / total, 0), 1) : null;
}

export function stageCompletionProgress(
  etapas: readonly { status: StageStatus }[],
): number | null {
  if (etapas.length === 0) return null;
  const completed = etapas.filter((e) => e.status === "COMPLETED").length;
  return progressRatio(completed, etapas.length);
}

export function mapStage(dto: StageResponseDto): Etapa {
  return {
    id: dto.id,
    projectId: dto.projectId,
    nome: dto.name,
    descricao: dto.description ?? "",
    status: dto.status,
    prioridade: stagePriorityFromApi(dto.priority),
    order: dto.position ?? 0,
    totalActivities: dto.totalActivities ?? 0,
    completedActivities: dto.completedActivities ?? 0,
    progress: progressRatio(
      dto.completedActivities ?? 0,
      dto.totalActivities ?? 0,
    ),
  };
}

export function mapActivity(dto: ActivityResponseDto): Atividade {
  return {
    id: dto.id,
    stageId: dto.stageId,
    projectId: dto.projectId,
    nome: dto.name,
    descricao: dto.description ?? "",
    status: dto.status,
    order: dto.position ?? 0,
    startDate: dto.startDate ?? null,
    dueDate: dto.dueDate ?? null,
    assignedUserId: dto.assignedUserId ?? null,
  };
}

/** Deriva o status da etapa a partir das atividades:
 * - sem atividades ou todas PENDING -> NOT_STARTED
 * - todas DONE -> COMPLETED
 * - qualquer progresso (alguma IN_PROGRESS ou DONE, mas não todas) -> IN_PROGRESS */
export function deriveStageStatus(
  atividades: readonly { status: ActivityStatus }[],
): StageStatus {
  if (atividades.length === 0) return "NOT_STARTED";
  if (atividades.every((a) => a.status === "DONE")) return "COMPLETED";
  const anyProgress = atividades.some(
    (a) => a.status === "DONE" || a.status === "IN_PROGRESS",
  );
  return anyProgress ? "IN_PROGRESS" : "NOT_STARTED";
}

/** Etapa "em foco" da obra: primeira em andamento, senão primeira não iniciada,
 * senão "Concluída" quando todas concluídas. */
export function currentStageLabel(etapas: Etapa[]): string {
  if (etapas.length === 0) return "-";
  const ordered = [...etapas].sort((a, b) => a.order - b.order);
  const inProgress = ordered.find((e) => e.status === "IN_PROGRESS");
  if (inProgress) return inProgress.nome;
  const notStarted = ordered.find((e) => e.status !== "COMPLETED");
  if (notStarted) return notStarted.nome;
  return "Concluída";
}

