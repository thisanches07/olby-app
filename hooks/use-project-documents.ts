import { useCallback, useEffect, useRef, useState } from "react";

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

const STALE_PENDING_UPLOAD_MS = 30_000;

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
  const cancelActiveUploadRef = useRef<(() => Promise<void>) | null>(null);
  const uploadCompletionRef = useRef<Promise<void> | null>(null);
  const resolveUploadCompletionRef = useRef<(() => void) | null>(null);
  const reconcilingPendingIdsRef = useRef<Set<string>>(new Set());
  const { showToast } = useToast();

  const cancelUpload = useCallback(async () => {
    cancelledRef.current = true;
    const cancelActiveUpload = cancelActiveUploadRef.current;
    cancelActiveUploadRef.current = null;
    await cancelActiveUpload?.();
    await uploadCompletionRef.current;
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

  const reconcilePendingDocuments = useCallback(
    async (items: DocumentAttachment[]) => {
      if (uploading) return false;

      const now = Date.now();
      const stalePendingDocuments = items.filter((document) => {
        if (document.status !== "PENDING_UPLOAD") return false;
        if (reconcilingPendingIdsRef.current.has(document.id)) return false;

        const createdAtMs = Date.parse(document.createdAt);
        if (Number.isNaN(createdAtMs)) return false;

        return now - createdAtMs >= STALE_PENDING_UPLOAD_MS;
      });

      if (stalePendingDocuments.length === 0) return false;

      stalePendingDocuments.forEach((document) => {
        reconcilingPendingIdsRef.current.add(document.id);
      });

      try {
        await Promise.allSettled(
          stalePendingDocuments.map((document) =>
            documentsService.confirm(projectId, document.id),
          ),
        );
        return true;
      } finally {
        stalePendingDocuments.forEach((document) => {
          reconcilingPendingIdsRef.current.delete(document.id);
        });
      }
    },
    [projectId, uploading],
  );

  const fetchDocumentsWithRecovery = useCallback(
    async (
      mode: "initial" | "refresh" | "search" = "initial",
      options?: FetchProjectDocumentsOptions,
    ) => {
      await fetchDocuments(mode, options);

      try {
        const response = await documentsService.listPage(projectId, {
          limit: 20,
          name: options?.name?.trim() || undefined,
        });
        const items = Array.isArray(response.items) ? response.items : [];
        setDocuments(items);
        setHasMore(response.pageInfo?.hasMore ?? false);
        setNextCursor(response.pageInfo?.nextCursor ?? null);

        const recoveredAnyPending = await reconcilePendingDocuments(items);
        if (recoveredAnyPending) {
          await fetchDocuments("refresh", options);
        }
      } catch {
        // ignore recovery failures; normal list result already rendered
      }
    },
    [fetchDocuments, projectId, reconcilePendingDocuments],
  );

  useEffect(() => {
    if (uploading || documents.length === 0) return;

    const now = Date.now();
    const pendingDocuments = documents.filter(
      (document) => document.status === "PENDING_UPLOAD",
    );

    if (pendingDocuments.length === 0) return;

    const stalePendingDocuments = pendingDocuments.filter((document) => {
      const createdAtMs = Date.parse(document.createdAt);
      return !Number.isNaN(createdAtMs) && now - createdAtMs >= STALE_PENDING_UPLOAD_MS;
    });

    if (stalePendingDocuments.length > 0) {
      void fetchDocumentsWithRecovery("refresh");
      return;
    }

    const nextRetryInMs = pendingDocuments.reduce((smallestDelay, document) => {
      const createdAtMs = Date.parse(document.createdAt);
      if (Number.isNaN(createdAtMs)) return smallestDelay;

      const delay = Math.max(
        STALE_PENDING_UPLOAD_MS - (now - createdAtMs),
        1_000,
      );
      return Math.min(smallestDelay, delay);
    }, STALE_PENDING_UPLOAD_MS);

    const timeoutId = setTimeout(() => {
      void fetchDocumentsWithRecovery("refresh");
    }, nextRetryInMs);

    return () => clearTimeout(timeoutId);
  }, [documents, fetchDocumentsWithRecovery, uploading]);

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
      uploadCompletionRef.current = new Promise<void>((resolve) => {
        resolveUploadCompletionRef.current = resolve;
      });
      try {
        await validateDocumentAssetSize(asset, options.kind);

        const document = await uploadProjectDocument(asset, {
          projectId,
          kind: options.kind,
          source: options.source,
          title: options.title,
          isCancelled: () => cancelledRef.current,
          onCancelUploadRequestReady: (cancelUploadRequest) => {
            cancelActiveUploadRef.current = cancelUploadRequest;
          },
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
          void fetchDocumentsWithRecovery("refresh");
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
        cancelActiveUploadRef.current = null;
        resolveUploadCompletionRef.current?.();
        resolveUploadCompletionRef.current = null;
        uploadCompletionRef.current = null;
        setUploading(false);
        setUploadingFileName(undefined);
      }
    },
    [fetchDocumentsWithRecovery, projectId, showToast],
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
    fetchDocuments: fetchDocumentsWithRecovery,
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
