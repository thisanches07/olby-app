import { useCallback, useState } from "react";

import type { DocumentAttachment, DocumentKind, DocumentSource } from "@/data/obras";
import { documentsService } from "@/services/documents.service";
import { useToast } from "@/components/obra/toast";
import {
  uploadDocumentToExpense,
  type LocalDocumentAsset,
} from "@/utils/document-upload";

interface UseExpenseDocumentsOptions {
  projectId: string;
  expenseId: string;
  onDocumentCountChange?: (expenseId: string, count: number) => void;
}

interface UseExpenseDocumentsReturn {
  documents: DocumentAttachment[];
  loading: boolean;
  uploading: boolean;
  fetchDocuments: () => Promise<void>;
  addDocument: (
    asset: LocalDocumentAsset,
    kind: DocumentKind,
    source: DocumentSource,
  ) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
}

export function useExpenseDocuments({
  projectId,
  expenseId,
  onDocumentCountChange,
}: UseExpenseDocumentsOptions): UseExpenseDocumentsReturn {
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const notifyCount = useCallback(
    (docs: DocumentAttachment[]) => {
      onDocumentCountChange?.(expenseId, docs.length);
    },
    [expenseId, onDocumentCountChange],
  );

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentsService.listByExpense(projectId, expenseId);
      setDocuments(data);
      notifyCount(data);
    } catch {
      showToast({ title: "Erro", message: "Erro ao carregar documentos", tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [projectId, expenseId, notifyCount, showToast]);

  const addDocument = useCallback(
    async (
      asset: LocalDocumentAsset,
      kind: DocumentKind,
      source: DocumentSource,
    ) => {
      setUploading(true);
      try {
        const doc = await uploadDocumentToExpense(asset, {
          projectId,
          expenseId,
          kind,
          source,
        });
        setDocuments((prev) => {
          const next = [...prev, doc];
          notifyCount(next);
          return next;
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Falha no envio do documento";
        showToast({ title: "Erro no envio", message, tone: "error" });
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [projectId, expenseId, notifyCount, showToast],
  );

  const removeDocument = useCallback(
    async (documentId: string) => {
      const previous = documents;
      const next = documents.filter((d) => d.id !== documentId);
      setDocuments(next);
      notifyCount(next);

      try {
        await documentsService.remove(projectId, documentId);
      } catch {
        setDocuments(previous);
        notifyCount(previous);
        showToast({ title: "Erro", message: "Erro ao remover documento", tone: "error" });
      }
    },
    [projectId, documents, notifyCount, showToast],
  );

  return { documents, loading, uploading, fetchDocuments, addDocument, removeDocument };
}
