import type { Gasto, ObraDetalhe, Tarefa } from "@/data/obras";
import * as FileSystem from "expo-file-system/legacy";
import {
  dailyLogEntriesService,
  type DailyLogEntryFeedItemDto,
  type DailyLogEntryFeedPhotoPreviewDto,
} from "./daily-log-entries.service";
import { dailyLogPhotosService } from "./daily-log-photos.service";

export type ReportPeriod = 7 | 15 | 30;

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

const MAX_REPORT_PHOTOS_PER_ENTRY = 6;

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getPeriodDates(days: ReportPeriod): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { dateFrom: isoDate(from), dateTo: isoDate(to) };
}

async function fetchFeedInPeriod(
  projectId: string,
  dateFrom: string,
): Promise<DailyLogEntryFeedItemDto[]> {
  const result: DailyLogEntryFeedItemDto[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 20; page++) {
    const response = await dailyLogEntriesService.listFeedByProject(
      projectId,
      cursor,
      10,
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

    if (!response.pageInfo.hasMore || reachedBeforePeriod || !response.pageInfo.nextCursor) {
      break;
    }
    cursor = response.pageInfo.nextCursor;
  }

  return result;
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
): Promise<ReportPhoto[]> {
  const previewPhotos = item.photosPreview.slice(0, MAX_REPORT_PHOTOS_PER_ENTRY);

  try {
    const signedUrls = await dailyLogPhotosService.getSignedUrlsForEntry(
      projectId,
      item.id,
    );
    const photos = signedUrls
      .slice(0, MAX_REPORT_PHOTOS_PER_ENTRY)
      .map((photo) => ({
        id: photo.id,
        thumbUrl: photo.url,
        thumbContentType: "image/jpeg",
      }));

    if (photos.length > 0) {
      return Promise.all(photos.map(inlineReportPhoto));
    }
  } catch {
    // Falls back to the feed preview below.
  }

  return Promise.all(previewPhotos.map(inlineReportPhoto));
}

export async function buildReportData(
  projectId: string,
  obra: ObraDetalhe,
  period: ReportPeriod,
): Promise<ReportData> {
  const { dateFrom, dateTo } = getPeriodDates(period);

  const feedItems = await fetchFeedInPeriod(projectId, dateFrom);

  const diaryEntries: ReportDiaryEntry[] = await Promise.all(
    feedItems.map(async (item) => ({
      id: item.id,
      date: item.date,
      title: item.title,
      notes: item.notes,
      durationMinutes: item.durationMinutes,
      photos: await getEntryReportPhotos(projectId, item),
    })),
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
