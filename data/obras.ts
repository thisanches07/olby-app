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
  tarefaId?: string;
  documentCount?: number;
  receiptDocumentId?: string | null;
  receiptUrl?: string | null;
}

export type DocumentKind =
  | "RECEIPT"
  | "INVOICE"
  | "CONTRACT"
  | "REPORT"
  | "PHOTO"
  | "OTHER";

export type DocumentSource = "CAMERA" | "SCAN" | "GALLERY" | "FILE_PICKER";

export type DocumentStatus = "PENDING_UPLOAD" | "READY" | "FAILED";

export interface DocumentAttachment {
  id: string;
  projectId: string;
  expenseId: string;
  kind: DocumentKind;
  source: DocumentSource;
  status: DocumentStatus;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
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
  gastos: Gasto[];
  horasContratadas: number;
  horasRealizadas: number;
  trackFinancial: boolean;
  trackActivities: boolean;
  myRole?: "OWNER" | "PRO" | "CLIENT_VIEWER" | null;
  members?: ObraMember[];
}
