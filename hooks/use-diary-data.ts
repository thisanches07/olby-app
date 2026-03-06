import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/obra/toast";

import {
  DailyLogEntryResponseDto,
  dailyLogEntriesService,
} from "@/services/daily-log-entries.service";
import { dailyLogPhotosService } from "@/services/daily-log-photos.service";
import {
  preparePhotoForUpload,
  uploadPreparedPhotos,
  uploadPhotoToEntry,
  type LocalPhotoAsset,
} from "@/utils/photo-upload";

import { DiaryEntry, DiarySection, PhotoItem } from "./use-diary-state";
const MAX_DIARY_DESCRIPTION = 160;

// ── Tipo interno: entry do backend + fotos já mapeadas ────────────────────────
interface EntryWithPhotos extends DailyLogEntryResponseDto {
  photos: PhotoItem[];
}

// ── Helpers de data ───────────────────────────────────────────────────────────
function toISODate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const PT_WEEK_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const PT_MONTHS = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
];

function formatEntryDate(dateISO: string, todayISO: string): string {
  if (dateISO === todayISO) return "HOJE";
  const date = parseISODate(dateISO);
  const today = parseISODate(todayISO);
  const diffDays = Math.floor(
    (today.getTime() - date.getTime()) / 86_400_000,
  );
  if (diffDays < 7) return PT_WEEK_DAYS[date.getDay()];
  return `${String(date.getDate()).padStart(2, "0")} ${PT_MONTHS[date.getMonth()]}`;
}

/**
 * Extrai "HH:MM" diretamente do string ISO 8601 sem conversão de timezone.
 * Ex: "2026-03-01T08:30:00-03:00" → "08:30"
 */
function parseArrivedAtToTime(arrivedAt: string | null): string {
  if (!arrivedAt) return "";
  const m = arrivedAt.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "";
}

/** Constrói um ISO 8601 timestamptz a partir de "YYYY-MM-DD" + "HH:MM". */
function buildArrivedAt(dateISO: string, timeHHMM: string): string {
  const off = new Date().getTimezoneOffset(); // minutos; positivo = atrás do UTC
  const sign = off <= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${dateISO}T${timeHHMM}:00${sign}${hh}:${mm}`;
}

/** "DD/MM/AAAA" ou "HOJE" → ISO "YYYY-MM-DD" */
export function parseBrDateToISO(br: string): string {
  if (br.toUpperCase() === "HOJE") return toISODate(new Date());
  const parts = br.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return br;
}

/** ISO "YYYY-MM-DD" → "DD/MM/AAAA" */
export function parseISODateToBR(iso: string): string {
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return iso;
}

// ── Agrupamento em seções ─────────────────────────────────────────────────────
function groupIntoSections(
  entries: EntryWithPhotos[],
  todayISO: string,
): DiarySection[] {
  const today = parseISODate(todayISO);

  // Início desta semana (segunda-feira)
  const dow = today.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const startThisWeek = new Date(today);
  startThisWeek.setDate(today.getDate() - daysFromMon);

  const startLastWeek = new Date(startThisWeek);
  startLastWeek.setDate(startThisWeek.getDate() - 7);

  const startLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const ORDERED = ["ESTA SEMANA", "SEMANA PASSADA", "MÊS PASSADO"];
  const buckets: Record<string, EntryWithPhotos[]> = {};

  for (const entry of entries) {
    if (!entry.date) continue;
    const d = parseISODate(entry.date);
    let label: string;

    if (d >= startThisWeek) {
      label = "ESTA SEMANA";
    } else if (d >= startLastWeek) {
      label = "SEMANA PASSADA";
    } else if (d >= startLastMonth) {
      label = "MÊS PASSADO";
    } else {
      label = `${PT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }

    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(entry);
  }

  const olderLabels = Object.keys(buckets)
    .filter((l) => !ORDERED.includes(l))
    .sort((a, b) => {
      const [am, ay] = a.split(" ");
      const [bm, by] = b.split(" ");
      const aDate = new Date(parseInt(ay), PT_MONTHS.indexOf(am), 1);
      const bDate = new Date(parseInt(by), PT_MONTHS.indexOf(bm), 1);
      return bDate.getTime() - aDate.getTime();
    });

  return [...ORDERED, ...olderLabels]
    .filter((label) => (buckets[label]?.length ?? 0) > 0)
    .map((title) => ({
      title,
      entries: buckets[title].map((e) => toUIEntry(e, todayISO)),
    }));
}

function toUIEntry(e: EntryWithPhotos, todayISO: string): DiaryEntry {
  return {
    id: e.id,
    dateISO: e.date ?? "",
    date: formatEntryDate(e.date ?? todayISO, todayISO),
    time: parseArrivedAtToTime(e.arrivedAt),
    title: e.title ?? "",
    description: e.notes ?? "",
    durationMinutes: e.durationMinutes ?? null,
    photos: e.photos,
    isToday: (e.date ?? "") === todayISO,
  };
}

function mapPhotos(
  raw: Awaited<ReturnType<typeof dailyLogPhotosService.listByEntry>>,
): PhotoItem[] {
  return raw
    .filter((p) => p.status === "READY" && p.thumbUrl)
    .map((p) => ({ id: p.id, thumbUrl: p.thumbUrl!, status: "READY" as const }));
}

/** Ordena entries: data desc, arrivedAt desc, createdAt desc */
function sortEntries(arr: EntryWithPhotos[]): EntryWithPhotos[] {
  return [...arr].sort((a, b) => {
    const dc = (b.date ?? "").localeCompare(a.date ?? "");
    if (dc !== 0) return dc;
    return (b.arrivedAt ?? b.createdAt ?? "").localeCompare(
      a.arrivedAt ?? a.createdAt ?? "",
    );
  });
}

// ── Tipo do form ──────────────────────────────────────────────────────────────
export interface EntryFormData {
  /** "DD/MM/AAAA" ou "HOJE" */
  date: string;
  /** "HH:MM" — mapeia para arrivedAt no backend */
  time: string;
  title: string;
  /** Mapeia para `notes` no backend. */
  description: string;
  /** Duração em minutos. Obrigatório na criação (mínimo 30). */
  durationMinutes: number | null;
  /** Fotos locais novas a fazer upload. */
  newPhotoAssets: LocalPhotoAsset[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export interface UseDiaryDataReturn {
  sections: DiarySection[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createEntry: (projectId: string, data: EntryFormData) => Promise<void>;
  updateEntry: (
    projectId: string,
    entryId: string,
    data: EntryFormData,
  ) => Promise<void>;
  deleteEntry: (projectId: string, entryId: string) => Promise<void>;
  deletePhoto: (
    projectId: string,
    photoId: string,
    entryId: string,
  ) => Promise<void>;
}

export function useDiaryData(projectId: string): UseDiaryDataReturn {
  const { showToast } = useToast();
  const [rawEntries, setRawEntries] = useState<EntryWithPhotos[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayISO = toISODate(new Date());

  const sections = useMemo(
    () => groupIntoSections(rawEntries, todayISO),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawEntries],
  );

  // ── Carrega entries + fotos ────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const entries = await dailyLogEntriesService.listByProject(projectId);

      // Carrega fotos de todos os entries em paralelo
      const photosResults = await Promise.all(
        entries.map((e) =>
          dailyLogPhotosService.listByEntry(projectId, e.id).catch(() => []),
        ),
      );

      const enriched: EntryWithPhotos[] = entries.map((e, i) => ({
        ...e,
        photos: mapPhotos(photosResults[i] ?? []),
      }));

      setRawEntries(sortEntries(enriched));
    } catch {
      setError("Nao foi possivel carregar os registros.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadEntries();
  }, [projectId, loadEntries]);

  const refresh = useCallback(() => loadEntries(), [loadEntries]);

  // ── createEntry ────────────────────────────────────────────────────────────
  const createEntry = useCallback(
    async (pid: string, data: EntryFormData) => {
      setIsSaving(true);
      try {
        const dateISO = parseBrDateToISO(data.date);

        // 1. Prepara fotos (gera thumbs e mede tamanhos) antes do POST
        const prepared =
          data.newPhotoAssets.length > 0
            ? await Promise.all(
                data.newPhotoAssets.map(preparePhotoForUpload),
              )
            : [];

        // 2. POST entry — inclui metadados das fotos no body
        const normalizedDescription =
          data.description.trim().slice(0, MAX_DIARY_DESCRIPTION) || undefined;
        const entry = await dailyLogEntriesService.create({
          projectId: pid,
          date: dateISO,
          arrivedAt: data.time ? buildArrivedAt(dateISO, data.time) : undefined,
          durationMinutes: data.durationMinutes ?? 30,
          title: data.title,
          notes: normalizedDescription,
          photos:
            prepared.length > 0
              ? prepared.map((p) => ({
                  contentType: p.contentType,
                  sizeBytes: p.sizeBytes,
                  thumbContentType: p.thumbContentType,
                  thumbSizeBytes: p.thumbSizeBytes,
                }))
              : undefined,
        });

        // 3. Faz PUT para as URLs pré-assinadas retornadas pelo backend
        if (prepared.length > 0 && entry.photosToUpload?.length) {
          const { failed } = await uploadPreparedPhotos(
            prepared,
            entry.photosToUpload,
            pid,
          );
          if (failed > 0) {
            showToast({
              title: "Aviso",
              message: `${failed} foto(s) não puderam ser enviadas. O registro foi salvo.`,
              tone: "info",
            });
          }
        }

        // 4. Recarrega fotos confirmadas do entry
        const rawPhotos = await dailyLogPhotosService
          .listByEntry(pid, entry.id)
          .catch(() => []);
        const photos = mapPhotos(rawPhotos);

        setRawEntries((prev) =>
          sortEntries([{ ...entry, photos }, ...prev]),
        );
      } finally {
        setIsSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showToast],
  );

  // ── updateEntry ────────────────────────────────────────────────────────────
  const updateEntry = useCallback(
    async (pid: string, entryId: string, data: EntryFormData) => {
      setIsSaving(true);
      try {
        const dateISO = parseBrDateToISO(data.date);

        const updated = await dailyLogEntriesService.update(entryId, {
          date: dateISO,
          arrivedAt: data.time ? buildArrivedAt(dateISO, data.time) : null,
          title: data.title,
          notes: data.description.trim().slice(0, MAX_DIARY_DESCRIPTION) || null,
          durationMinutes: data.durationMinutes ?? undefined,
        });

        // Fotos novas: usa fluxo de presign avulso
        if (data.newPhotoAssets.length > 0) {
          const results = await Promise.allSettled(
            data.newPhotoAssets.map((a) =>
              uploadPhotoToEntry(a, pid, entryId),
            ),
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            showToast({
              title: "Aviso",
              message: `${failed} foto(s) não puderam ser enviadas. O registro foi salvo.`,
              tone: "info",
            });
          }
        }

        // Recarrega lista completa de fotos do entry
        const allPhotos = await dailyLogPhotosService
          .listByEntry(pid, entryId)
          .catch(() => []);
        const photos = mapPhotos(allPhotos);

        setRawEntries((prev) =>
          sortEntries(
            prev.map((e) => (e.id === entryId ? { ...updated, photos } : e)),
          ),
        );
      } finally {
        setIsSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showToast],
  );

  // ── deleteEntry ────────────────────────────────────────────────────────────
  const deleteEntry = useCallback(async (_pid: string, entryId: string) => {
    setIsSaving(true);
    try {
      await dailyLogEntriesService.remove(entryId);
      setRawEntries((prev) => prev.filter((e) => e.id !== entryId));
    } finally {
      setIsSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── deletePhoto ────────────────────────────────────────────────────────────
  const deletePhoto = useCallback(
    async (pid: string, photoId: string, entryId: string) => {
      await dailyLogPhotosService.remove(pid, photoId);
      setRawEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, photos: e.photos.filter((p) => p.id !== photoId) }
            : e,
        ),
      );
    },
    [],
  );

  return {
    sections,
    isLoading,
    isSaving,
    error,
    refresh,
    createEntry,
    updateEntry,
    deleteEntry,
    deletePhoto,
  };
}
