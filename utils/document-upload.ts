import * as FileSystem from "expo-file-system/legacy";

import { documentsService } from "@/services/documents.service";
import type { DocumentAttachment, DocumentKind, DocumentSource } from "@/data/obras";

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
}

/**
 * Fluxo completo: presign → PUT binário → confirm.
 * Retorna o DocumentAttachment confirmado pelo backend.
 */
export async function uploadDocumentToExpense(
  asset: LocalDocumentAsset,
  options: UploadDocumentOptions,
): Promise<DocumentAttachment> {
  const sizeBytes = asset.fileSize ?? (await getFileSize(asset.uri));

  const { documentId, uploadUrl } = await documentsService.presign(
    options.projectId,
    {
      originalFileName: asset.fileName,
      contentType: asset.mimeType,
      sizeBytes,
      kind: options.kind,
      source: options.source,
      ...(options.expenseId ? { expenseId: options.expenseId } : {}),
    },
  );

  await putBinaryFile(uploadUrl, asset.uri, asset.mimeType);

  return await documentsService.confirm(options.projectId, documentId);
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
): Promise<void> {
  const result = await FileSystem.uploadAsync(url, fileUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": contentType },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload falhou com status ${result.status}`);
  }
}
