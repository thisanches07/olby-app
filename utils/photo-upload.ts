import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

import { dailyLogPhotosService } from "@/services/daily-log-photos.service";
import type { PhotoToUpload } from "@/services/daily-log-entries.service";

/** Asset local selecionado pelo usuário (galeria ou câmera). */
export interface LocalPhotoAsset {
  uri: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

/**
 * Foto preparada localmente: thumb já gerado, tamanhos medidos.
 * Pronta para enviar os metadados ao backend e depois fazer o PUT.
 */
export interface PreparedPhoto {
  originalUri: string;
  thumbUri: string;
  contentType: "image/jpeg" | "image/jpg" | "image/png" | "image/webp";
  sizeBytes: number;
  thumbContentType: "image/jpeg";
  thumbSizeBytes: number;
}

const THUMB_MAX_PX = 480;

/**
 * Etapa 1 — geração local (antes de chamar o backend).
 * Gera o thumb e mede os tamanhos para incluir no body do POST.
 */
export async function preparePhotoForUpload(
  asset: LocalPhotoAsset,
): Promise<PreparedPhoto> {
  const thumb = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: THUMB_MAX_PX } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );

  const origSize = asset.fileSize ?? (await getFileSize(asset.uri));
  const thumbSize = await getFileSize(thumb.uri);

  const rawMime = asset.mimeType ?? "image/jpeg";
  const contentType = (
    ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(rawMime)
      ? rawMime
      : "image/jpeg"
  ) as PreparedPhoto["contentType"];

  return {
    originalUri: asset.uri,
    thumbUri: thumb.uri,
    contentType,
    sizeBytes: origSize,
    thumbContentType: "image/jpeg",
    thumbSizeBytes: thumbSize,
  };
}

/**
 * Etapa 2 — upload para as URLs pré-assinadas retornadas pelo POST do entry.
 * Faz PUT do original + thumb em paralelo por foto, depois confirma cada uma.
 * Retorna o número de falhas (para exibir aviso ao usuário).
 */
export async function uploadPreparedPhotos(
  prepared: PreparedPhoto[],
  targets: PhotoToUpload[],
  projectId: string,
): Promise<{ failed: number }> {
  const results = await Promise.allSettled(
    prepared.map(async (p, i) => {
      const target = targets[i];
      if (!target) throw new Error("Missing upload target");

      await Promise.all([
        putBinaryFile(target.uploadUrl, p.originalUri, p.contentType),
        putBinaryFile(target.thumbUploadUrl, p.thumbUri, p.thumbContentType),
      ]);

      await dailyLogPhotosService.confirm({
        projectId,
        photoId: target.photoId,
      });
    }),
  );

  return { failed: results.filter((r) => r.status === "rejected").length };
}

/**
 * Fluxo avulso — adicionar foto a um entry já existente (presign → upload → confirm).
 * Usado no modo de edição (updateEntry).
 */
export async function uploadPhotoToEntry(
  asset: LocalPhotoAsset,
  projectId: string,
  entryId: string,
): Promise<string> {
  const p = await preparePhotoForUpload(asset);

  const { photoId, uploadUrl, thumbUploadUrl } =
    await dailyLogPhotosService.presign({
      projectId,
      entryId,
      contentType: p.contentType,
      sizeBytes: p.sizeBytes,
      thumbContentType: p.thumbContentType,
      thumbSizeBytes: p.thumbSizeBytes,
    });

  await Promise.all([
    putBinaryFile(uploadUrl, p.originalUri, p.contentType),
    putBinaryFile(thumbUploadUrl, p.thumbUri, p.thumbContentType),
  ]);

  await dailyLogPhotosService.confirm({ projectId, photoId });

  return photoId;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) return (info as any).size ?? 0;
  } catch {
    // ignore
  }
  return 0;
}

async function putBinaryFile(
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
