/**
 * Tipos centrais da feature Diário de Obra.
 * O gerenciamento de estado real está em use-diary-data.ts.
 */

/** Foto já confirmada no backend (status READY). */
export interface PhotoItem {
  id: string;
  thumbUrl: string;
  status: "READY" | "PENDING" | "uploading";
}

export interface DiaryEntry {
  id: string;
  /** ISO "2025-10-18" — usado internamente para agrupamento/ordenação. */
  dateISO: string;
  /** Label de exibição: "HOJE" | "TER" | "18 OUT" */
  date: string;
  /** "HH:MM" */
  time: string;
  title: string;
  description: string;
  /** Duração em minutos (ex.: 90 = 1h30). null se não informado. */
  durationMinutes: number | null;
  photos: PhotoItem[];
  isToday: boolean;
}

export interface DiarySection {
  title: string;
  entries: DiaryEntry[];
}
