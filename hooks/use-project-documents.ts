import { useCallback, useRef, useState } from "react";

import { useToast } from "@/components/obra/toast";
import type { DocumentAttachment } from "@/data/obras";
import { ApiError } from "@/services/api";
import { documentsService } from "@/services/documents.service";
import { expensesService } from "@/services/expenses.service";
import {
  uploadProjectDocument,
  UploadCancelledError,
  validateDocumentAssetSize,
  type LocalDocumentAsset,
} from "@/utils/document-upload";

interface UseProjectDocumentsOptions {
  projectId: string;
}

interface FetchProjectDocumentsOptions {
  name?: string;
}

export function useProjectDocuments({
  projectId,
}: UseProjectDocumentsOptions) {
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | undefined>();
  const cancelledRef = useRef(false);
  const { showToast } = useToast();

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const fetchDocuments = useCallback(
    async (
      mode: "initial" | "refresh" | "search" = "initial",
      options?: FetchProjectDocumentsOptions,
    ) => {
      if (!projectId) return;

      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "search") {
        setLoading(true);
        setDocuments([]);
      }

      try {
        const response = await documentsService.listPage(projectId, {
          limit: 20,
          name: options?.name?.trim() || undefined,
        });
        setDocuments(Array.isArray(response.items) ? response.items : []);
        setHasMore(response.pageInfo?.hasMore ?? false);
        setNextCursor(response.pageInfo?.nextCursor ?? null);
      } catch {
        showToast({
          title: "Erro",
          message: "Nao foi possivel carregar os documentos.",
          tone: "error",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId, showToast],
  );

  const loadMoreDocuments = useCallback(async (options?: FetchProjectDocumentsOptions) => {
    if (!projectId || !nextCursor || !hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const response = await documentsService.listPage(projectId, {
        limit: 20,
        name: options?.name?.trim() || undefined,
        cursor: nextCursor,
      });
      setDocuments((prev) => mergeDocuments(prev, response.items ?? []));
      setHasMore(response.pageInfo?.hasMore ?? false);
      setNextCursor(response.pageInfo?.nextCursor ?? null);
    } catch {
      showToast({
        title: "Erro",
        message: "Nao foi possivel carregar mais documentos.",
        tone: "error",
      });
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor, projectId, showToast]);

  const uploadDocument = useCallback(
    async (
      asset: LocalDocumentAsset,
      options: {
        kind: DocumentAttachment["kind"];
        source: DocumentAttachment["source"];
        title?: string;
      },
    ) => {
      cancelledRef.current = false;
      setUploading(true);
      setUploadingFileName(asset.fileName);
      try {
        await validateDocumentAssetSize(asset, options.kind);

        const document = await uploadProjectDocument(asset, {
          projectId,
          kind: options.kind,
          source: options.source,
          title: options.title,
          isCancelled: () => cancelledRef.current,
        });

        setDocuments((prev) => mergeDocuments([document], prev));

        showToast({
          title: "Documento enviado",
          message: "O documento foi adicionado ao projeto.",
          tone: "success",
        });
      } catch (error) {
        if (error instanceof UploadCancelledError) {
          showToast({ title: "Upload cancelado", tone: "info" });
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Falha ao enviar documento.";
        showToast({
          title: "Erro no envio",
          message,
          tone: "error",
        });
      } finally {
        setUploading(false);
        setUploadingFileName(undefined);
      }
    },
    [projectId, showToast],
  );

  const removeDocument = useCallback(
    async (document: DocumentAttachment): Promise<boolean> => {
      const documentId = document.id;
      const previous = documents;
      const next = documents.filter((item) => item.id !== documentId);
      setDocuments(next);

      try {
        await documentsService.remove(projectId, documentId);
        if (document.expenseId) {
          await expensesService.update(document.expenseId, {
            receiptDocumentId: null,
          });
        }
        showToast({
          title: "Documento removido",
          tone: "success",
        });
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          if (document.expenseId) {
            await expensesService.update(document.expenseId, {
              receiptDocumentId: null,
            }).catch(() => undefined);
          }
          showToast({
            title: "Documento removido",
            tone: "success",
          });
          return true;
        }

        setDocuments(previous);
        showToast({
          title: "Erro",
          message: "Nao foi possivel remover o documento.",
          tone: "error",
        });
        return false;
      }
    },
    [documents, projectId, showToast],
  );

  return {
    documents,
    loading,
    refreshing,
    uploading,
    loadingMore,
    hasMore,
    uploadingFileName,
    cancelUpload,
    fetchDocuments,
    loadMoreDocuments,
    uploadDocument,
    removeDocument,
  };
}

function mergeDocuments(
  previous: DocumentAttachment[],
  incoming: DocumentAttachment[],
): DocumentAttachment[] {
  const byId = new Map<string, DocumentAttachment>();

  for (const document of [...previous, ...incoming]) {
    if (!byId.has(document.id)) {
      byId.set(document.id, document);
    }
  }

  return Array.from(byId.values());
}
