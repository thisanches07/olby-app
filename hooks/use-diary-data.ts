import { useToast } from "@/components/obra/toast";
import {
  getProjectItemLimitMessage,
  PROJECT_ITEM_LIMIT,
} from "@/constants/creation-limits";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  dailyLogEntriesService,
  type DailyLogEntryFeedItemDto,
  type DailyLogEntryResponseDto,
} from "@/services/daily-log-entries.service";
import { dailyLogPhotosService } from "@/services/daily-log-photos.service";
import {
  preparePhotoForUpload,
  uploadPhotoToEntry,
  uploadPreparedPhotos,
  type LocalPhotoAsset,
} from "@/utils/photo-upload";

import type { DiaryEntry, DiarySection, PhotoItem } from "./use-diary-state";

const MAX_DIARY_DESCRIPTION = 160;

interface EntryWithPhotos extends DailyLogEntryResponseDto {
  photoCount: number;
  photos: PhotoItem[];
}

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

const PT_WEEK_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const PT_MONTHS = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

function formatEntryDate(dateISO: string, todayISO: string): string {
  if (dateISO === todayISO) return "HOJE";
  const date = parseISODate(dateISO);
  const today = parseISODate(todayISO);
  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return PT_WEEK_DAYS[date.getDay()];
  return `${String(date.getDate()).padStart(2, "0")} ${PT_MONTHS[date.getMonth()]}`;
}

function parseArrivedAtToTime(arrivedAt: string | null): string {
  if (!arrivedAt) return "";
  const m = arrivedAt.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "";
}

function buildArrivedAt(dateISO: string, timeHHMM: string): string {
  const off = new Date().getTimezoneOffset();
  const sign = off <= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${dateISO}T${timeHHMM}:00${sign}${hh}:${mm}`;
}

export function parseBrDateToISO(br: string): string {
  if (br.toUpperCase() === "HOJE") return toISODate(new Date());
  const parts = br.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return br;
}

export function parseISODateToBR(iso: string): string {
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return iso;
}

function groupIntoSections(
  entries: EntryWithPhotos[],
  todayISO: string,
): DiarySection[] {
  const today = parseISODate(todayISO);
  const dow = today.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const startThisWeek = new Date(today);
  startThisWeek.setDate(today.getDate() - daysFromMon);

  const startLastWeek = new Date(startThisWeek);
  startLastWeek.setDate(startThisWeek.getDate() - 7);

  const startLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const ORDERED = ["ESTA SEMANA", "SEMANA PASSADA", "MES PASSADO"];
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
      label = "MES PASSADO";
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
      const aDate = new Date(parseInt(ay, 10), PT_MONTHS.indexOf(am), 1);
      const bDate = new Date(parseInt(by, 10), PT_MONTHS.indexOf(bm), 1);
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
    photoCount: e.photoCount ?? e.photos.length,
    photos: e.photos,
    isToday: (e.date ?? "") === todayISO,
  };
}

function mapPhotos(
  raw: Awaited<ReturnType<typeof dailyLogPhotosService.listByEntry>>,
): PhotoItem[] {
  return raw
    .filter((p) => p.status === "READY" && p.thumbUrl)
    .map((p) => ({
      id: p.id,
      thumbUrl: p.thumbUrl!,
      status: "READY" as const,
    }));
}

function mapFeedItemToEntry(feedItem: DailyLogEntryFeedItemDto): EntryWithPhotos {
  return {
    id: feedItem.id,
    projectId: feedItem.projectId,
    date: feedItem.date,
    arrivedAt: feedItem.arrivedAt,
    durationMinutes: feedItem.durationMinutes ?? 0,
    title: feedItem.title ?? "",
    notes: feedItem.notes ?? null,
    createdByUserId: "",
    createdAt: feedItem.createdAt,
    updatedAt: feedItem.createdAt,
    photoCount: feedItem.photoCount,
    photos: (feedItem.photosPreview ?? []).map((photo) => ({
      id: photo.id,
      thumbUrl: photo.thumbUrl,
      status: "READY" as const,
    })),
  };
}

function sortEntries(arr: EntryWithPhotos[]): EntryWithPhotos[] {
  return [...arr].sort((a, b) => {
    const dateCompare = (b.date ?? "").localeCompare(a.date ?? "");
    if (dateCompare !== 0) return dateCompare;
    return (b.arrivedAt ?? b.createdAt ?? "").localeCompare(
      a.arrivedAt ?? a.createdAt ?? "",
    );
  });
}

function mergeEntriesById(
  previous: EntryWithPhotos[],
  incoming: EntryWithPhotos[],
): EntryWithPhotos[] {
  const byId = new Map<string, EntryWithPhotos>();

  for (const entry of previous) {
    byId.set(entry.id, entry);
  }

  for (const entry of incoming) {
    byId.set(entry.id, entry);
  }

  return Array.from(byId.values());
}

export interface EntryFormData {
  date: string;
  time: string;
  title: string;
  description: string;
  durationMinutes: number | null;
  newPhotoAssets: LocalPhotoAsset[];
}

export interface UseDiaryDataReturn {
  sections: DiarySection[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  isSaving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
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

interface UseDiaryDataOptions {
  loadFullData?: boolean;
}

export function useDiaryData(
  projectId: string,
  options: UseDiaryDataOptions = {},
): UseDiaryDataReturn {
  const { loadFullData = false } = options;
  const { showToast } = useToast();
  const [rawEntries, setRawEntries] = useState<EntryWithPhotos[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isFullDataLoaded, setIsFullDataLoaded] = useState(false);

  const todayISO = toISODate(new Date());

  const sections = useMemo(
    () => groupIntoSections(rawEntries, todayISO),
    [rawEntries, todayISO],
  );

  const loadFeedPage = useCallback(
    async (cursor?: string | null) => {
      if (!projectId) return null;

      const response = await dailyLogEntriesService.listFeedByProject(
        projectId,
        cursor ?? undefined,
        10,
      );

      return {
        entries: (response.items ?? []).map(mapFeedItemToEntry),
        nextCursor: response.pageInfo?.nextCursor ?? null,
        hasMore: response.pageInfo?.hasMore ?? false,
      };
    },
    [projectId],
  );

  const loadAllEntries = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const entries = await dailyLogEntriesService.listByProject(projectId);

      const photosResults = await Promise.all(
        entries.map((entry) =>
          dailyLogPhotosService.listByEntry(projectId, entry.id).catch(() => []),
        ),
      );

      const enriched: EntryWithPhotos[] = entries.map((entry, index) => {
        const photos = mapPhotos(photosResults[index] ?? []);
        return {
          ...entry,
          photoCount: photos.length,
          photos,
        };
      });

      setRawEntries(sortEntries(enriched));
      setNextCursor(null);
      setHasMore(false);
      setIsFullDataLoaded(true);
    } catch {
      setError("Nao foi possivel carregar os registros.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const loadInitialFeed = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await loadFeedPage();
      setRawEntries(sortEntries(response?.entries ?? []));
      setNextCursor(response?.nextCursor ?? null);
      setHasMore(response?.hasMore ?? false);
      setIsFullDataLoaded(false);
    } catch {
      setError("Nao foi possivel carregar os registros.");
    } finally {
      setIsLoading(false);
    }
  }, [loadFeedPage, projectId]);

  useEffect(() => {
    setRawEntries([]);
    setError(null);
    setNextCursor(null);
    setHasMore(false);
    setIsFullDataLoaded(false);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (loadFullData) {
      if (!isFullDataLoaded) {
        void loadAllEntries();
      }
      return;
    }

    if (rawEntries.length === 0) {
      void loadInitialFeed();
    }
  }, [
    isFullDataLoaded,
    loadAllEntries,
    loadFullData,
    loadInitialFeed,
    projectId,
    rawEntries.length,
  ]);

  const refresh = useCallback(async () => {
    if (loadFullData || isFullDataLoaded) {
      await loadAllEntries();
      return;
    }
    await loadInitialFeed();
  }, [isFullDataLoaded, loadAllEntries, loadFullData, loadInitialFeed]);

  const loadMore = useCallback(async () => {
    if (!projectId || !nextCursor || !hasMore || isLoadingMore || isFullDataLoaded) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const response = await loadFeedPage(nextCursor);
      setRawEntries((prev) =>
        sortEntries(mergeEntriesById(prev, response?.entries ?? [])),
      );
      setNextCursor(response?.nextCursor ?? null);
      setHasMore(response?.hasMore ?? false);
    } catch {
      showToast({
        title: "Erro ao carregar mais",
        message: "Nao foi possivel carregar mais registros do diario.",
        tone: "error",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasMore,
    isFullDataLoaded,
    isLoadingMore,
    loadFeedPage,
    nextCursor,
    projectId,
    showToast,
  ]);

  const createEntry = useCallback(
    async (pid: string, data: EntryFormData) => {
      if (rawEntries.length >= PROJECT_ITEM_LIMIT) {
        throw new Error(getProjectItemLimitMessage("registros"));
      }

      setIsSaving(true);
      try {
        const dateISO = parseBrDateToISO(data.date);
        const prepared =
          data.newPhotoAssets.length > 0
            ? await Promise.all(data.newPhotoAssets.map(preparePhotoForUpload))
            : [];

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
              ? prepared.map((photo) => ({
                  contentType: photo.contentType,
                  sizeBytes: photo.sizeBytes,
                  thumbContentType: photo.thumbContentType,
                  thumbSizeBytes: photo.thumbSizeBytes,
                }))
              : undefined,
        });

        if (prepared.length > 0 && entry.photosToUpload?.length) {
          const { failed } = await uploadPreparedPhotos(
            prepared,
            entry.photosToUpload,
            pid,
          );
          if (failed > 0) {
            showToast({
              title: "Aviso",
              message: `${failed} foto(s) nao puderam ser enviadas. O registro foi salvo.`,
              tone: "info",
            });
          }
        }

        const rawPhotos = await dailyLogPhotosService
          .listByEntry(pid, entry.id)
          .catch(() => []);
        const photos = mapPhotos(rawPhotos);

        setRawEntries((prev) =>
          sortEntries([{ ...entry, photoCount: photos.length, photos }, ...prev]),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [rawEntries.length, showToast],
  );

  const updateEntry = useCallback(
    async (pid: string, entryId: string, data: EntryFormData) => {
      setIsSaving(true);
      try {
        const dateISO = parseBrDateToISO(data.date);

        const updated = await dailyLogEntriesService.update(entryId, {
          date: dateISO,
          arrivedAt: data.time ? buildArrivedAt(dateISO, data.time) : null,
          title: data.title,
          notes:
            data.description.trim().slice(0, MAX_DIARY_DESCRIPTION) || null,
          durationMinutes: data.durationMinutes ?? undefined,
        });

        if (data.newPhotoAssets.length > 0) {
          const results = await Promise.allSettled(
            data.newPhotoAssets.map((asset) =>
              uploadPhotoToEntry(asset, pid, entryId),
            ),
          );
          const failed = results.filter((result) => result.status === "rejected").length;
          if (failed > 0) {
            showToast({
              title: "Aviso",
              message: `${failed} foto(s) nao puderam ser enviadas. O registro foi salvo.`,
              tone: "info",
            });
          }
        }

        const allPhotos = await dailyLogPhotosService
          .listByEntry(pid, entryId)
          .catch(() => []);
        const photos = mapPhotos(allPhotos);

        setRawEntries((prev) =>
          sortEntries(
            prev.map((entry) =>
              entry.id === entryId
                ? { ...updated, photoCount: photos.length, photos }
                : entry,
            ),
          ),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [showToast],
  );

  const deleteEntry = useCallback(async (_pid: string, entryId: string) => {
    setIsSaving(true);
    try {
      await dailyLogEntriesService.remove(entryId);
      setRawEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deletePhoto = useCallback(
    async (pid: string, photoId: string, entryId: string) => {
      await dailyLogPhotosService.remove(pid, photoId);
      setRawEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                photoCount: Math.max(entry.photoCount - 1, 0),
                photos: entry.photos.filter((photo) => photo.id !== photoId),
              }
            : entry,
        ),
      );
    },
    [],
  );

  return {
    sections,
    isLoading,
    isLoadingMore,
    hasMore,
    isSaving,
    error,
    refresh,
    loadMore,
    createEntry,
    updateEntry,
    deleteEntry,
    deletePhoto,
  };
}
