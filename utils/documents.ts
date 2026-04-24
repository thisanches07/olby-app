import type { DocumentAttachment, DocumentKind } from "@/data/obras";

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  PLANT: "Planta",
  PERMIT: "Alvara",
  RECEIPT: "Comprovante",
  INVOICE: "Nota fiscal",
  CONTRACT: "Contrato",
  REPORT: "relatório",
  DELIVERY: "Entrega",
  PHOTO: "Foto",
  OTHER: "Outro",
};

export const DOCUMENT_KIND_COLORS: Record<DocumentKind, string> = {
  PLANT: "#2563EB",
  PERMIT: "#0F766E",
  RECEIPT: "#059669",
  INVOICE: "#2563EB",
  CONTRACT: "#7C3AED",
  REPORT: "#D97706",
  DELIVERY: "#DC2626",
  PHOTO: "#0891B2",
  OTHER: "#6B7280",
};

export const DOCUMENT_KIND_ICONS: Record<DocumentKind, string> = {
  PLANT: "architecture",
  PERMIT: "verified",
  RECEIPT: "receipt-long",
  INVOICE: "description",
  CONTRACT: "assignment",
  REPORT: "summarize",
  DELIVERY: "inventory-2",
  PHOTO: "photo-library",
  OTHER: "attach-file",
};

export function getDocumentDisplayName(document: DocumentAttachment): string {
  return document.title?.trim() || document.originalFileName;
}

export function formatDocumentBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocumentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function matchesDocumentSearch(
  document: DocumentAttachment,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    document.title,
    document.originalFileName,
    document.kind,
    DOCUMENT_KIND_LABELS[document.kind],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}
