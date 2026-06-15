import type { Gasto, ObraDetalhe, Tarefa } from "@/data/obras";
import * as FileSystem from "expo-file-system/legacy";
import {
  dailyLogEntriesService,
  type DailyLogEntryFeedItemDto,
  type DailyLogEntryFeedPhotoPreviewDto,
  type DiaryWeather,
} from "./daily-log-entries.service";
import { dailyLogPhotosService } from "./daily-log-photos.service";

export type ReportPeriod = 7 | 15 | 30 | "all";

export interface ReportPhoto {
  id: string;
  thumbUrl: string;
}

export interface ReportDiaryEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string | null;
  notes: string | null;
  durationMinutes: number | null;
  weather: DiaryWeather | null;
  photos: ReportPhoto[];
}

export interface ReportExpenseCategory {
  categoria: string;
  label: string;
  total: number;
  color: string;
}

export interface ReportData {
  projectName: string;
  projectAddress: string;
  periodStart: string; // "YYYY-MM-DD"
  periodEnd: string;
  generatedAt: string; // ISO

  visitCount: number;
  totalHoursInPeriod: number;
  totalPhotosInPeriod: number;
  totalExpensesInPeriod: number;

  diaryEntries: ReportDiaryEntry[];

  // true quando o feed do período excedeu o teto de páginas e foi cortado.
  truncated: boolean;
  // Quantos registros realmente entraram no relatório (= diaryEntries.length).
  entriesShown: number;

  doneTasks: Tarefa[];
  nextPendingTask: Tarefa | null;
  pendingTaskCount: number;

  expensesInPeriod: Gasto[];
  expensesByCategory: ReportExpenseCategory[];

  horasContratadas: number;
  horasRealizadas: number;
  orcamento: number;
  totalInvestido: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  MATERIAL: "Material",
  LABOR: "Mão de obra",
  TOOLS: "Equipamentos",
  SERVICES: "Serviços",
  TRANSPORT: "Transporte",
  FEES: "Taxas",
  CONTINGENCY: "Contingência",
  OTHER: "Outros",
};

const CATEGORY_COLORS: Record<string, string> = {
  MATERIAL: "#BFDBFE",
  LABOR: "#BBF7D0",
  TOOLS: "#FDE68A",
  SERVICES: "#DDD6FE",
  TRANSPORT: "#FCA5A5",
  FEES: "#FDBA74",
  CONTINGENCY: "#A5F3FC",
  OTHER: "#E2E8F0",
};

// Tier mais alto do cap adaptativo de fotos (ver photoCapForEntries).
const MAX_REPORT_PHOTOS_PER_ENTRY = 10;

// Cap de fotos por registro derivado do total de registros do período. Evita
// gerar milhares de thumbs base64 num único HTML (crash do expo-print).
function photoCapForEntries(entryCount: number): number {
  if (entryCount <= 30) return MAX_REPORT_PHOTOS_PER_ENTRY;
  if (entryCount <= 100) return 4;
  return 2;
}

// Executa `fn` sobre `items` com no máximo `limit` chamadas simultâneas,
// preservando a ordem (results[i] === fn(items[i])). Evita o fan-out ilimitado
// de Promise.all, que satura a rede e derruba os downloads no catch.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await fn(items[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getPeriodDates(period: ReportPeriod): { dateFrom: string; dateTo: string } {
  const to = new Date();
  if (period === "all") {
    return { dateFrom: "0000-01-01", dateTo: isoDate(to) };
  }
  const from = new Date();
  from.setDate(from.getDate() - (period - 1));
  return { dateFrom: isoDate(from), dateTo: isoDate(to) };
}

const MAX_FEED_PAGES = 20;
const FEED_PAGE_SIZE = 10;

async function fetchFeedInPeriod(
  projectId: string,
  dateFrom: string,
): Promise<{ items: DailyLogEntryFeedItemDto[]; truncated: boolean }> {
  const result: DailyLogEntryFeedItemDto[] = [];
  let cursor: string | undefined;
  let truncated = false;

  for (let page = 0; page < MAX_FEED_PAGES; page++) {
    const response = await dailyLogEntriesService.listFeedByProject(
      projectId,
      cursor,
      FEED_PAGE_SIZE,
    );

    let reachedBeforePeriod = false;
    for (const item of response.items) {
      if (item.date >= dateFrom) {
        result.push(item);
      } else {
        reachedBeforePeriod = true;
        break;
      }
    }

    const hasMore =
      response.pageInfo.hasMore &&
      !!response.pageInfo.nextCursor &&
      !reachedBeforePeriod;

    if (!hasMore) {
      break;
    }

    // Ainda há registros no período, mas esgotamos as páginas permitidas.
    if (page === MAX_FEED_PAGES - 1) {
      truncated = true;
      break;
    }

    cursor = response.pageInfo.nextCursor ?? undefined;
  }

  return { items: result, truncated };
}

async function inlineReportPhoto(
  photo: Pick<DailyLogEntryFeedPhotoPreviewDto, "id" | "thumbUrl"> & {
    thumbContentType?: string;
  },
): Promise<ReportPhoto> {
  if (!photo.thumbUrl || photo.thumbUrl.startsWith("data:")) {
    return { id: photo.id, thumbUrl: photo.thumbUrl };
  }

  try {
    const extension = photo.thumbContentType?.includes("png")
      ? "png"
      : photo.thumbContentType?.includes("webp")
        ? "webp"
        : "jpg";
    const localUri = `${FileSystem.cacheDirectory}report_photo_${photo.id}.${extension}`;
    const { uri } = await FileSystem.downloadAsync(photo.thumbUrl, localUri);
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const contentType = photo.thumbContentType || "image/jpeg";
    return {
      id: photo.id,
      thumbUrl: `data:${contentType};base64,${base64}`,
    };
  } catch {
    return { id: photo.id, thumbUrl: photo.thumbUrl };
  }
}

async function getEntryReportPhotos(
  projectId: string,
  item: DailyLogEntryFeedItemDto,
  maxPhotos: number,
): Promise<ReportPhoto[]> {
  const previewPhotos = item.photosPreview.slice(0, maxPhotos);

  try {
    // listByEntry retorna TODAS as fotos READY (sem o cap de 3 do feed) com
    // thumbUrl assinada — shape de array correto, ideal pro tamanho do PDF.
    const allPhotos = await dailyLogPhotosService.listByEntry(
      projectId,
      item.id,
    );
    const photos = allPhotos
      .filter((p) => p.status === "READY" && p.thumbUrl)
      .slice(0, maxPhotos)
      .map((p) => ({
        id: p.id,
        thumbUrl: p.thumbUrl!,
        thumbContentType: p.thumbContentType,
      }));

    if (photos.length > 0) {
      return mapWithConcurrency(photos, 4, inlineReportPhoto);
    }
  } catch {
    // Falls back to the feed preview below.
  }

  return mapWithConcurrency(previewPhotos, 4, inlineReportPhoto);
}

export async function buildReportData(
  projectId: string,
  obra: ObraDetalhe,
  period: ReportPeriod,
): Promise<ReportData> {
  const { dateFrom, dateTo } = getPeriodDates(period);

  const { items: feedItems, truncated } = await fetchFeedInPeriod(
    projectId,
    dateFrom,
  );

  const photoCap = photoCapForEntries(feedItems.length);

  const diaryEntries: ReportDiaryEntry[] = await mapWithConcurrency(
    feedItems,
    5,
    async (item) => ({
      id: item.id,
      date: item.date,
      title: item.title,
      notes: item.notes,
      durationMinutes: item.durationMinutes,
      weather: item.weather ?? null,
      photos: await getEntryReportPhotos(projectId, item, photoCap),
    }),
  );

  const visitCount = diaryEntries.length;
  const totalMinutes = diaryEntries.reduce(
    (sum, e) => sum + (e.durationMinutes ?? 0),
    0,
  );
  const totalPhotosInPeriod = feedItems.reduce(
    (sum, e) => sum + e.photoCount,
    0,
  );

  const expensesInPeriod = obra.gastos.filter(
    (g) => g.data >= dateFrom && g.data <= dateTo,
  );
  const totalExpensesInPeriod = expensesInPeriod.reduce(
    (sum, g) => sum + g.valor,
    0,
  );

  const categoryMap = new Map<string, number>();
  for (const g of expensesInPeriod) {
    categoryMap.set(g.categoria, (categoryMap.get(g.categoria) ?? 0) + g.valor);
  }
  const expensesByCategory: ReportExpenseCategory[] = Array.from(
    categoryMap.entries(),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => ({
      categoria: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      total,
      color: CATEGORY_COLORS[cat] ?? "#E2E8F0",
    }));

  const doneTasks = obra.tarefas.filter((t) => t.concluida);
  const openTasks = obra.tarefas.filter((t) => !t.concluida);
  const nextPendingTask = openTasks[0] ?? null;
  const pendingTaskCount = openTasks.length;

  return {
    projectName: obra.nome,
    projectAddress: obra.endereco,
    periodStart: dateFrom,
    periodEnd: dateTo,
    generatedAt: new Date().toISOString(),

    visitCount,
    totalHoursInPeriod: totalMinutes / 60,
    totalPhotosInPeriod,
    totalExpensesInPeriod,

    diaryEntries,

    truncated,
    entriesShown: diaryEntries.length,

    doneTasks,
    nextPendingTask,
    pendingTaskCount,

    expensesInPeriod,
    expensesByCategory,

    horasContratadas: obra.horasContratadas,
    horasRealizadas: obra.horasRealizadas,
    orcamento: obra.orcamento,
    totalInvestido: obra.totalInvestido,
  };
}
