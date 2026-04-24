import * as FileSystem from "expo-file-system/legacy";

import { documentsService } from "@/services/documents.service";
import type {
  DocumentAttachment,
  DocumentKind,
  DocumentSource,
} from "@/data/obras";

export const DEFAULT_DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024;
export const PLANT_DOCUMENT_MAX_SIZE_BYTES = 50 * 1024 * 1024;
export const PROJECT_DOCUMENT_LIMIT = 150;
export const PROJECT_PLANT_LIMIT = 20;
export const PROJECT_DOCUMENT_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;

/** Asset local de documento selecionado pelo usuário. */
export interface LocalDocumentAsset {
  uri: string;
  mimeType: string;
  fileName: string;
  fileSize?: number | null;
}

export interface UploadDocumentOptions {
  projectId: string;
  kind: DocumentKind;
  source: DocumentSource;
  expenseId?: string;
  title?: string;
  isCancelled?: () => boolean;
  onCancelUploadRequestReady?: (cancelUpload: () => Promise<void>) => void;
}

export class UploadCancelledError extends Error {
  constructor() {
    super("Upload cancelado pelo usuário.");
    this.name = "UploadCancelledError";
  }
}

function formatSizeLimit(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

export function getDocumentMaxSizeBytes(kind: DocumentKind): number {
  return kind === "PLANT"
    ? PLANT_DOCUMENT_MAX_SIZE_BYTES
    : DEFAULT_DOCUMENT_MAX_SIZE_BYTES;
}

export function getDocumentSizeLimitLabel(kind: DocumentKind): string {
  return formatSizeLimit(getDocumentMaxSizeBytes(kind));
}

export async function validateDocumentAssetSize(
  asset: LocalDocumentAsset,
  kind: DocumentKind,
): Promise<number> {
  const sizeBytes = asset.fileSize ?? (await getFileSize(asset.uri));
  const limitBytes = getDocumentMaxSizeBytes(kind);

  if (sizeBytes > limitBytes) {
    const message =
      kind === "PLANT"
        ? "Plantas aceitam arquivos de até 50 MB. Compacte o arquivo e tente novamente."
        : "Documentos aceitam arquivos de até 25 MB. Compacte o arquivo e tente novamente.";
    throw new Error(message);
  }

  return sizeBytes;
}

/**
 * Fluxo completo: presign → PUT binário → confirm.
 * Retorna o DocumentAttachment confirmado pelo backend.
 */
export async function uploadProjectDocument(
  asset: LocalDocumentAsset,
  options: UploadDocumentOptions,
): Promise<DocumentAttachment> {
  const sizeBytes = await validateDocumentAssetSize(asset, options.kind);

  if (sizeBytes === 0) {
    throw new Error(
      "Não foi possível determinar o tamanho do arquivo. Tente novamente.",
    );
  }

  const { documentId, uploadUrl } = await documentsService.presign(
    options.projectId,
    {
      originalFileName: asset.fileName,
      contentType: asset.mimeType,
      sizeBytes,
      kind: options.kind,
      source: options.source,
      ...(options.title ? { title: options.title } : {}),
      ...(options.expenseId ? { expenseId: options.expenseId } : {}),
    },
  );

  if (options.isCancelled?.()) {
    await documentsService.remove(options.projectId, documentId).catch(() => {});
    throw new UploadCancelledError();
  }

  try {
    await putBinaryFile(uploadUrl, asset.uri, asset.mimeType, {
      isCancelled: options.isCancelled,
      onCancelUploadRequestReady: options.onCancelUploadRequestReady,
    });
  } catch (error) {
    if (error instanceof UploadCancelledError || options.isCancelled?.()) {
      await documentsService.remove(options.projectId, documentId).catch(() => {});
      throw new UploadCancelledError();
    }
    throw error;
  }

  if (options.isCancelled?.()) {
    await documentsService.remove(options.projectId, documentId).catch(() => {});
    throw new UploadCancelledError();
  }

  return await documentsService.confirm(options.projectId, documentId);
}

export async function uploadDocumentToExpense(
  asset: LocalDocumentAsset,
  options: UploadDocumentOptions,
): Promise<DocumentAttachment> {
  return uploadProjectDocument(asset, options);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) return (info as any).size ?? 0;
  } catch {
    // ignore
  }
  return 0;
}

export async function putBinaryFile(
  url: string,
  fileUri: string,
  contentType: string,
  options?: {
    isCancelled?: () => boolean;
    onCancelUploadRequestReady?: (cancelUpload: () => Promise<void>) => void;
  },
): Promise<void> {
  const uploadTask = FileSystem.createUploadTask(url, fileUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": contentType },
  });

  options?.onCancelUploadRequestReady?.(async () => {
    await uploadTask.cancelAsync();
  });

  if (options?.isCancelled?.()) {
    await uploadTask.cancelAsync().catch(() => {});
    throw new UploadCancelledError();
  }

  try {
    const result = await uploadTask.uploadAsync();

    if (options?.isCancelled?.()) {
      throw new UploadCancelledError();
    }

    if (!result) {
      throw new UploadCancelledError();
    }

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload falhou com status ${result.status}`);
    }
  } catch (error) {
    if (options?.isCancelled?.()) {
      throw new UploadCancelledError();
    }
    throw error;
  }
}
