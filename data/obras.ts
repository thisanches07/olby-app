import { Obra, ObraMember, StatusType } from "@/components/obra-card";

export type { Obra, ObraMember, StatusType };

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  concluida: boolean;
  order: number;
}

// --- Modelo Obra -> Etapas -> Atividades ---------------------------------------

export type StageStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type ActivityStatus = "PENDING" | "IN_PROGRESS" | "DONE";

export interface Atividade {
  id: string;
  stageId: string;
  projectId: string;
  nome: string;
  descricao: string;
  status: ActivityStatus;
  order: number;
  startDate: string | null;
  dueDate: string | null;
  assignedUserId: string | null;
}

export interface Etapa {
  id: string;
  projectId: string;
  nome: string;
  descricao: string;
  status: StageStatus;
  prioridade: "ALTA" | "MEDIA" | "BAIXA" | null;
  order: number;
  totalActivities: number;
  completedActivities: number;
  /** Razão 0..1 ou null quando a etapa não tem atividades ("sem atividades"). */
  progress: number | null;
  /** Custo orçado da etapa em centavos. null = sem orçamento. */
  budgetCents: number | null;
}

export interface Gasto {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria:
    | "MATERIAL"
    | "LABOR"
    | "TOOLS"
    | "SERVICES"
    | "TRANSPORT"
    | "FEES"
    | "CONTINGENCY"
    | "OTHER";
  stageId?: string;
  /** Demanda que gerou a despesa (leitura). undefined = independente. */
  quoteGroupId?: string | null;
  /** @deprecated Use stageId. */
  tarefaId?: string;
  documentCount?: number;
  receiptDocumentId?: string | null;
  receiptUrl?: string | null;
}

export type DocumentKind =
  | "PLANT"
  | "PERMIT"
  | "RECEIPT"
  | "INVOICE"
  | "CONTRACT"
  | "REPORT"
  | "DELIVERY"
  | "PHOTO"
  | "OTHER";

export type DocumentVisibility = "INTERNAL" | "CLIENT";

export type DocumentSource = "CAMERA" | "SCAN" | "GALLERY" | "FILE_PICKER";

export type DocumentStatus = "PENDING_UPLOAD" | "READY" | "FAILED";

export interface DocumentAttachment {
  id: string;
  projectId: string;
  expenseId: string | null;
  kind: DocumentKind;
  title?: string | null;
  visibility?: DocumentVisibility;
  isPinned?: boolean;
  linkedTaskId?: string | null;
  linkedDiaryEntryId?: string | null;
  source: DocumentSource;
  status: DocumentStatus;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  pageCount?: number | null;
  thumbnailUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ObraDetalhe extends Obra {
  referencia: string;
  cidade: string;
  estado: string;
  dataPrevisaoEntrega: string | null;
  totalInvestido: number;
  orcamento: number;
  proximoPagamento: {
    valor: number;
    diasRestantes: number;
  };
  etapaAtual: string;
  proximaEtapa: string;
  tarefas: Tarefa[];
  // Novo modelo Obra -> Etapas -> Atividades
  etapas: Etapa[];
  /** Progresso agregado da obra (razão 0..1) ou null quando não há atividades. */
  progress: number | null;
  totalStages: number;
  totalActivities: number;
  completedActivities: number;
  /** Próximas atividades pendentes (do agregado /progress) para o cabeçalho. */
  nextActivities: Atividade[];
  gastos: Gasto[];
  horasContratadas: number;
  horasRealizadas: number;
  trackFinancial: boolean;
  trackActivities: boolean;
  myRole?: "OWNER" | "PRO" | "CLIENT_VIEWER" | null;
  members?: ObraMember[];
}

