import type { ReportData, ReportPeriod } from "@/services/report.service";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OBLY_LOGO_PATH =
  "M 555.34307,229.05651 c -45.96476,-0.80749 -81.45377,7.5651 -89.81129,10.49055 -90.30922,29.02465 -163.99335,108.10684 -183.79361,203.35204 -8.87261,24.24346 -9.69338,63.97222 -9.69338,63.97222 0,0 -62.70802,72.84924 -75.48898,110.82437 -16.0067,38.68994 7.37706,81.22718 40.69482,100.83047 62.97392,40.18621 135.20737,64.55192 208.62061,74.63084 49.73521,8.79621 97.15713,-12.45114 143.34523,-28.05884 63.14291,-26.67769 126.81129,-53.19061 186.06586,-88.18017 88.94717,-49.2887 87.21729,-136.47062 58.16033,-153.50222 C 808.28708,277.03945 656.46567,230.83298 555.34307,229.05651 Z m 4.36029,27.17763 C 328.02532,319.80788 304.25925,582.58487 304.2683,577.63347 271.70754,549.40658 273.67853,252.60306 559.70336,256.23414 Z m 31.25268,14.85587 c 24.74377,-0.54154 49.6481,4.89191 73.99317,17.10221 -96.89773,20.08625 -190.0772,71.62383 -255.14877,360.84523 -29.9158,-1.88896 -70.55592,-27.4273 -84.916,-43.74245 31.34987,-190.2805 146.85133,-331.59574 266.0716,-334.20499 z m 71.78337,41.76607 c 43.86437,-0.0864 78.01136,24.3231 86.94437,43.79593 -147.95111,-16.84809 -230.08227,153.59225 -240.187,304.48304 -18.98839,4.9027 -58.28095,0.80764 -75.33231,-7.47505 55.3649,-272.47439 155.46745,-340.6601 228.57494,-340.80392 z m 62.87636,69.18056 c 5.81141,0.008 11.07009,0.9654 15.63131,2.86521 47.70645,8.17053 52.91574,93.40169 65.35756,152.76363 C 699.17658,635.46414 560.39039,663.28607 535.9189,658.55507 561.75285,470.82982 669.43956,381.96587 725.61577,382.03664 Z M 265.75341,555.69985 c 24.02094,102.15029 237.21554,240.87566 557.98834,8.60841 10.14025,63.75887 -184.25981,169.5603 -345.01252,203.99642 -60.464,12.95248 -253.40165,-44.35043 -263.98121,-124.226 -2.92388,-22.07529 22.74489,-61.09185 51.00539,-88.37883 z";

function oblySvg(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" fill="none"><path fill="${color}" d="${OBLY_LOGO_PATH}"/></svg>`;
}

function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function fmtHoursDecimal(h: number): string {
  if (h === 0) return "0h";
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function fmtDateBR(iso: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function fmtDateShort(iso: string): string {
  if (!iso) return "";
  const [, month, day] = iso.split("-");
  return `${parseInt(day, 10)} ${MONTHS[parseInt(month, 10) - 1]}`;
}

function fmtRailDate(iso: string): { day: string; mon: string } {
  if (!iso) return { day: "", mon: "" };
  const [, month, day] = iso.split("-");
  return {
    day: String(parseInt(day, 10)).padStart(2, "0"),
    mon: MONTHS[parseInt(month, 10) - 1] ?? "",
  };
}

function fmtWeekdayLine(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const wd = new Date(
    parseInt(y, 10),
    parseInt(m, 10) - 1,
    parseInt(d, 10),
  ).getDay();
  return `${WEEKDAYS[wd]}, ${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

function fmtPeriodLabel(period: ReportPeriod): string {
  if (period === "all") return "Obra toda";
  if (period === 7) return "Últimos 7 dias";
  if (period === 15) return "Últimos 15 dias";
  return "Últimos 30 dias";
}

function escHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pct(value: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(Math.round((value / total) * 100), 100);
}

function pctClass(p: number): string {
  if (p >= 100) return "over";
  if (p >= 80) return "warn";
  return "";
}

// â”€â”€â”€ Tasks section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function tasksSection(data: ReportData): string {
  const doneItems = data.doneTasks
    .slice(0, 8)
    .map(
      (t) => `
    <div class="task-item done">
      <svg class="task-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span class="task-txt">${escHtml(t.titulo)}</span>
    </div>`,
    )
    .join("");

  const nextItem = data.nextPendingTask
    ? `
    <div class="task-next-block">
    <div class="task-next-label">Próxima tarefa</div>
    <div class="task-item next">
      <svg class="task-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span class="task-txt">${escHtml(data.nextPendingTask.titulo)}</span>
    </div>
    </div>`
    : "";

  const pendingInfo =
    data.pendingTaskCount > 1
      ? `<div class="task-pending-count">+${data.pendingTaskCount - 1} tarefa${data.pendingTaskCount - 1 > 1 ? "s" : ""} pendente${data.pendingTaskCount - 1 > 1 ? "s" : ""}</div>`
      : "";

  if (!doneItems && !nextItem) return "";

  return `
  <div class="section keep-section">
    <div class="s-head"><div class="s-bar"></div><span class="s-title">Tarefas</span></div>
    ${doneItems}
    ${nextItem}
    ${pendingInfo}
  </div>`;
}

// â”€â”€â”€ Indicators section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function indicatorsSection(data: ReportData): string {
  const showHours = data.horasContratadas > 0;
  const showBudget = data.orcamento > 0;
  if (!showHours && !showBudget) return "";

  const hoursPct = pct(data.horasRealizadas, data.horasContratadas);
  const hoursClass = pctClass(hoursPct);

  const budgetPct = pct(data.totalInvestido, data.orcamento);
  const budgetClass = pctClass(budgetPct);

  const hoursCard = showHours
    ? `
    <div class="ind-b">
      <div class="ib-t">
        <span class="ib-n">Horas trabalhadas</span>
        <span class="ib-p ${hoursClass}">${hoursPct}%</span>
      </div>
      <div class="ibar"><div class="ibar-f ${hoursClass}" style="width:${hoursPct}%">&nbsp;</div></div>
      <div class="ib-s">
        <span><strong>${fmtHoursDecimal(data.horasRealizadas)}</strong> realizadas</span>
        <span>${fmtHoursDecimal(data.horasContratadas)} contratadas</span>
      </div>
    </div>`
    : "";

  const budgetCard = showBudget
    ? `
    <div class="ind-b">
      <div class="ib-t">
        <span class="ib-n">Orçamento utilizado</span>
        <span class="ib-p ${budgetClass}">${budgetPct}%</span>
      </div>
      <div class="ibar"><div class="ibar-f ${budgetClass}" style="width:${budgetPct}%">&nbsp;</div></div>
      <div class="ib-s">
        <span><strong>${fmtBRL(data.totalInvestido)}</strong> gastos</span>
        <span>${fmtBRL(data.orcamento)} total</span>
      </div>
    </div>`
    : "";

  return `
  <div class="section keep-section">
    <div class="s-head"><div class="s-bar"></div><span class="s-title">Indicadores da Obra</span></div>
    <div class="ind-pair">
      ${hoursCard}
      ${budgetCard}
    </div>
  </div>`;
}

// â”€â”€â”€ Financial section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function financialSection(data: ReportData): string {
  if (data.expensesInPeriod.length === 0 && data.totalInvestido === 0)
    return "";

  const isFullProjectReport = data.periodStart === "0000-01-01";
  const periodLabel = isFullProjectReport
    ? "Todo o período"
    : `${fmtDateBR(data.periodStart)} - ${fmtDateBR(data.periodEnd)}`;

  const catItems = data.expensesByCategory
    .map(
      (c) => `
    <div class="cat-item">
      <div class="ci-l"><div class="ci-dot" style="background:${c.color}"></div><span class="ci-nm">${escHtml(c.label)}</span></div>
      <span class="ci-val">${fmtBRL(c.total)}</span>
    </div>`,
    )
    .join("");

  return `
  <div class="section keep-section">
    <div class="s-head"><div class="s-bar"></div><span class="s-title">Financeiro</span></div>
    <div class="fin-row">
      <div class="fin-box">
        <div class="fb-lbl">No período</div>
        <div class="fb-val">${fmtBRL(data.totalExpensesInPeriod)}</div>
        <div class="fb-sub">${periodLabel}</div>
      </div>
      <div class="fin-box">
        <div class="fb-lbl">Acumulado total</div>
        <div class="fb-val">${fmtBRL(data.totalInvestido)}</div>
        <div class="fb-sub">desde o início da obra</div>
      </div>
    </div>
    ${catItems}
  </div>`;
}

// â”€â”€â”€ Diary section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function diarySection(data: ReportData): string {
  if (data.diaryEntries.length === 0) return "";

  // Ordem cronológica crescente (mais antigo → mais recente) em todos
  // os tipos de relatório; numeração sequencial 01..N de cima pra baixo.
  const ordered = [...data.diaryEntries].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const total = ordered.length;

  const itemsArr = ordered
    .map((entry, idx) => {
      const num = String(idx + 1).padStart(2, "0");
      const rail = fmtRailDate(entry.date);

      const duration = entry.durationMinutes
        ? `<span class="rdo-dur"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 1.5"/></svg>${fmtHours(entry.durationMinutes)}</span>`
        : "";
      const notes = entry.notes
        ? `<p class="rdo-notes">${escHtml(entry.notes)}</p>`
        : "";

      const shots =
        entry.photos.length > 0
          ? `
      <div class="rdo-shots">
        <div class="rdo-shots-cap">Registro fotográfico</div>
        <div class="pg">${entry.photos
          .map(
            (p) =>
              `<div class="ph"><img src="${escHtml(p.thumbUrl)}" alt=""/></div>`,
          )
          .join("")}</div>
      </div>`
          : "";

      const lastClass = idx === total - 1 ? " rdo-last" : "";

      return `
    <article class="rdo${lastClass}">
      <div class="rdo-rail">
        <span class="rdo-node"></span>
        <div class="rdo-dt"><b>${rail.day}</b><span>${rail.mon}</span></div>
      </div>
      <div class="rdo-body">
        <div class="rdo-keep">
          <div class="rdo-tag">Registro Nº ${num} · ${escHtml(fmtWeekdayLine(entry.date))}</div>
          <div class="rdo-head">
            <h3 class="rdo-title">${escHtml(entry.title ?? "Visita registrada")}</h3>
            ${duration}
          </div>
          ${notes}
        </div>
        ${shots}
      </div>
    </article>`;
    });

  const firstItem = itemsArr[0] ?? "";
  const restItems = itemsArr.slice(1).join("");

  return `
  <div class="section diary">
    <div class="rdo-start">
      <div class="s-head"><div class="s-bar"></div><span class="s-title">Registros Diários</span></div>
      ${firstItem}
    </div>
    ${restItems}
  </div>`;
}

// â”€â”€â”€ Main generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function generateReportHtml(
  data: ReportData,
  period: ReportPeriod,
): string {
  const isFullProjectReport = period === "all";
  const periodText = isFullProjectReport
    ? "Todo o período"
    : `${fmtDateBR(data.periodStart)} - ${fmtDateBR(data.periodEnd)}`;
  const periodPill = isFullProjectReport
    ? "Obra toda"
    : `${fmtDateShort(data.periodStart)} - ${fmtDateShort(data.periodEnd)} ${new Date(data.periodEnd).getFullYear()}`;
  const generatedDate = new Date(data.generatedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const hoursLabel = fmtHoursDecimal(data.totalHoursInPeriod);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório - ${escHtml(data.projectName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  /* Documento branco limpo. Margem em toda folha: respiro no topo e faixa
     inferior reservada para o rodapé corrido fixo (que se repete em todas as
     páginas, sem ser empurrado nem deixar página em branco no fim). */
  /* Sem margens de página: a capa azul sangra no topo da 1ª folha. O rodapé
     é reservado pelo <tfoot> (o motor repete o tfoot e guarda a altura dele
     em cada folha), não por margem — assim não há faixa branca no topo nem
     sobreposição do conteúdo. Respiro de topo das páginas de continuação vem
     do padding-top do .rdo. */
  @page { margin:0; }

  html, body { background:#FFFFFF; }

  body {
    font-family:'Inter', -apple-system, 'Helvetica Neue', sans-serif;
    color:#111827;
    -webkit-font-smoothing:antialiased;
  }

  .page {
    max-width:794px;
    margin:0 auto;
    background:#FFFFFF;
  }

  /* â”€â”€ CAPA â”€â”€ */
  .cover {
    background:linear-gradient(150deg,#EFF6FF 0%,#DBEAFE 100%);
    padding:52px 52px 44px;
    display:flex; flex-direction:column; gap:32px;
    border-bottom:1px solid #BFDBFE;
  }
  .cover-top { display:flex; justify-content:space-between; align-items:flex-start; }
  .c-eyebrow { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.18em; color:#60A5FA; }
  .c-brand { display:flex; align-items:center; gap:7px; }
  .c-brand-text { font-size:11px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:#93C5FD; }
  .c-title { font-family:'Archivo',sans-serif; font-size:40px; font-weight:800; color:#0F172A; line-height:1.05; letter-spacing:-0.03em; margin-bottom:6px; }
  .c-sub { font-size:14px; color:#475569; font-weight:400; }
  .cover-bottom { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px; }
  .cover-fields { display:flex; gap:36px; flex-wrap:wrap; }
  .cf label { display:block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#93C5FD; margin-bottom:3px; }
  .cf span { font-size:14px; font-weight:600; color:#1E3A5F; }
  .period-pill {
    background:rgba(255,255,255,.7); border:1px solid rgba(147,197,253,.5);
    color:#1D4ED8; font-size:13px; font-weight:600;
    padding:8px 18px; border-radius:999px; white-space:nowrap;
  }

  /* â”€â”€ STATS â”€â”€ */
  .stats {
    display:grid; grid-template-columns:repeat(4,1fr);
    border-bottom:1px solid #F1F5F9; background:#FAFBFC;
  }
  .stat { padding:20px 16px; border-right:1px solid #F1F5F9; display:flex; align-items:center; gap:12px; }
  .stat:last-child { border-right:none; }
  .stat-icon { flex-shrink:0; color:#93C5FD; }
  .stat-body { min-width:0; }
  .stat-val { font-family:'JetBrains Mono',monospace; font-size:19px; font-weight:700; color:#0F172A; letter-spacing:-0.02em; line-height:1; display:block; font-variant-numeric:tabular-nums; }
  .stat-lbl { font-size:11px; color:#64748B; font-weight:500; margin-top:3px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* â”€â”€ CONTEÚDO â”€â”€ */
  /* Sem padding-bottom: o respiro final vem do @page margin-bottom. Evita
     sobra de espaço vazio que empurrava uma página em branco no fim. */
  .content { padding:32px 52px 0; }
  .section { margin-top:30px; padding-top:30px; border-top:1px solid #F1F5F9; }
  .section:first-child { margin-top:0; padding-top:28px; border-top:none; }
  .keep-section { break-inside:avoid; page-break-inside:avoid; }
  /* Diário: o divisor (borda + respiro) sai da .section e vai para o wrapper
     .rdo-start, que agrupa o título "Registros Diários" + o 1º registro num
     bloco break-inside:avoid — título e 1º registro nunca se separam. */
  .section.diary { border-top:none; padding-top:0; }
  .rdo-start {
    break-inside:avoid; page-break-inside:avoid;
    padding-top:30px; border-top:1px solid #F1F5F9;
  }
  .section:first-child.diary .rdo-start { border-top:none; padding-top:28px; }
  .s-head { display:flex; align-items:center; gap:10px; margin-bottom:20px; break-after:avoid; page-break-after:avoid; }
  .s-bar { width:3px; height:18px; background:#2563EB; border-radius:2px; flex-shrink:0; }
  .s-title { font-family:'Archivo',sans-serif; font-size:12px; font-weight:700; color:#0F172A; text-transform:uppercase; letter-spacing:0.06em; }

  /* â”€â”€ RDO TIMELINE â”€â”€ */
  /* Registro compacto e atômico: nunca parte no meio; ~≤330px com 1 linha de
     fotos → 3 cabem por página. padding-top:14 dá o respiro do topo em
     páginas de continuação (não há mais margem @page no topo). */
  .rdo { display:flex; gap:18px; padding:14px 0 16px; break-inside:avoid; page-break-inside:avoid; }
  .rdo.rdo-last { padding-bottom:0; }
  .rdo-rail { position:relative; width:44px; flex-shrink:0; text-align:center; }
  .rdo-rail::before { content:""; position:absolute; left:50%; top:8px; bottom:-16px; width:2px; background:#DBEAFE; transform:translateX(-50%); }
  .rdo.rdo-last .rdo-rail::before { display:none; }
  .rdo-node { position:relative; z-index:1; display:block; width:11px; height:11px; margin:8px auto 8px; border-radius:50%; background:#2563EB; box-shadow:0 0 0 4px #EFF6FF; }
  .rdo-dt { font-family:'JetBrains Mono',monospace; }
  .rdo-dt b { display:block; font-size:18px; font-weight:700; color:#0F172A; line-height:1; }
  .rdo-dt span { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#94A3B8; }
  .rdo-body { flex:1; min-width:0; }
  .rdo-keep { break-inside:avoid; page-break-inside:avoid; break-after:avoid; page-break-after:avoid; }
  .rdo-tag { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; letter-spacing:0.06em; color:#2563EB; text-transform:uppercase; margin-bottom:4px; }
  .rdo-head { display:flex; align-items:baseline; gap:10px; margin-bottom:4px; }
  .rdo-title { font-family:'Archivo',sans-serif; font-size:15px; font-weight:700; color:#0F172A; letter-spacing:-0.01em; line-height:1.2; flex:1; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .rdo-dur { display:inline-flex; align-items:center; gap:5px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:500; color:#475569; background:#F1F5F9; padding:3px 8px; border-radius:5px; white-space:nowrap; flex-shrink:0; }
  .rdo-dur svg { flex-shrink:0; }
  .rdo-notes { font-size:12px; color:#475569; line-height:1.45; margin-bottom:10px; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .rdo-shots-cap { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#94A3B8; margin:0 0 6px; break-after:avoid; page-break-after:avoid; }

  /* â”€â”€ TAREFAS â”€â”€ */
  .task-item { display:flex; align-items:center; gap:9px; padding:10px 0; border-bottom:1px solid #F8FAFC; }
  .task-item:last-of-type { border-bottom:none; }
  .task-icon { flex-shrink:0; }
  .task-txt { font-size:13px; color:#374151; }
  .task-item.done .task-txt { color:#6B7280; }
  .task-next-block { break-inside:avoid; page-break-inside:avoid; }
  .task-next-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#93C5FD; margin-top:16px; margin-bottom:6px; break-after:avoid; page-break-after:avoid; }
  .task-item.next .task-txt { font-weight:600; color:#1E293B; }
  .task-item.next { break-inside:avoid; page-break-inside:avoid; }
  .task-pending-count { font-size:12px; color:#64748B; margin-top:10px; }

  /* â”€â”€ INDICADORES â”€â”€ */
  .ind-pair { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .ind-b { background:#F8FAFC; border-radius:10px; padding:16px 18px; }
  .ib-t { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:8px; }
  .ib-n { font-size:12px; font-weight:600; color:#374151; }
  .ib-p { font-size:11px; font-weight:700; background:#EFF6FF; color:#2563EB; padding:2px 7px; border-radius:4px; white-space:nowrap; flex-shrink:0; }
  .ib-p.warn { background:#FFFBEB; color:#D97706; }
  .ib-p.over { background:#FEF2F2; color:#DC2626; }
  .ibar { display:block; width:100%; height:6px; min-height:6px; background:#E2E8F0; border-radius:999px; overflow:hidden; margin-bottom:10px; line-height:0; font-size:0; }
  .ibar-f { display:block; height:6px; min-height:6px; background:#2563EB; border-radius:999px; line-height:0; font-size:0; color:transparent; }
  .ibar-f.warn { background:#F59E0B; }
  .ibar-f.over { background:#EF4444; }
  .ib-s { display:flex; justify-content:space-between; font-size:11px; color:#64748B; }
  .ib-s strong { color:#1E293B; font-weight:600; }

  /* â”€â”€ FINANCEIRO â”€â”€ */
  .fin-row { display:flex; gap:14px; margin-bottom:18px; }
  .fin-box { flex:1; background:#F8FAFC; border-radius:10px; padding:16px 18px; }
  .fb-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#64748B; margin-bottom:6px; }
  .fb-val { font-size:24px; font-weight:800; color:#0F172A; letter-spacing:-0.02em; line-height:1.1; }
  .fb-sub { font-size:11px; color:#64748B; margin-top:4px; }
  .cat-item { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #F1F5F9; }
  .cat-item:last-child { border-bottom:none; }
  .ci-l { display:flex; align-items:center; gap:8px; }
  .ci-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .ci-nm { font-size:13px; color:#4B5563; }
  .ci-val { font-size:13px; font-weight:600; color:#0F172A; }

  /* â”€â”€ FOTOS â”€â”€ */
  .pg { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
  .ph { aspect-ratio:3/2; background:#F1F5F9; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; break-inside:avoid; page-break-inside:avoid; }
  .ph img { width:100%; height:100%; object-fit:cover; }

  /* â”€â”€ FOOTER · rodapé corrido via <tfoot> â”€â”€
     O motor de impressão repete o <tfoot> no fim de cada folha E reserva a
     altura dele, então o conteúdo nunca passa por cima (ao contrário de
     position:fixed, que no WebKit do expo-print invadia a imagem). */
  table.doc { width:100%; border-collapse:collapse; }
  table.doc > tbody > tr > td,
  table.doc > tfoot > tr > td { padding:0; border:0; vertical-align:top; }
  .doc-foot td { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .footer { padding:0 0 14px; }
  .f-inner {
    width:100%; max-width:794px; margin:0 auto;
    padding:10px 52px 0;
    display:flex; align-items:center; justify-content:space-between; gap:18px;
    border-top:1px solid rgba(15,23,42,0.10);
  }
  .f-brand { display:flex; align-items:center; gap:6px; flex-shrink:0; }
  .f-brand-text { font-size:11px; font-weight:800; color:#475569; letter-spacing:0.14em; text-transform:uppercase; }
  .f-title {
    flex:1; min-width:0; text-align:center;
    font-size:10px; font-weight:700; color:#94A3B8;
    letter-spacing:0.16em; text-transform:uppercase;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .f-info { font-size:11px; color:#94A3B8; flex-shrink:0; }

  /* â”€â”€ MOBILE â”€â”€ */
  @media (max-width:600px) {
    .cover { padding:36px 20px 28px; gap:20px; }
    .c-title { font-size:28px; }
    .stats { grid-template-columns:repeat(2,1fr); }
    .stat { padding:16px 14px; }
    .content { padding:24px 20px 40px; }
    .ind-pair { grid-template-columns:1fr; }
    .fin-row { flex-direction:column; gap:10px; }
    .fb-val { font-size:20px; }
    .rdo { gap:12px; }
    .rdo-rail { width:34px; }
    .rdo-dt b { font-size:16px; }
    .rdo-title { font-size:15px; }
    .pg { grid-template-columns:repeat(2,1fr); }
    /* Preview em tela: rodapé empilhado (o tfoot já fica após o conteúdo). */
    .f-inner { padding:16px 20px; border-top:1px solid #E2E8F0; flex-direction:column; align-items:flex-start; gap:6px; }
    .f-title { text-align:left; letter-spacing:0.12em; }
  }
</style>
</head>
<body>
<table class="doc">
<tfoot class="doc-foot"><tr><td>
  <div class="footer">
    <div class="f-inner">
      <div class="f-brand">
        ${oblySvg(16, "#94A3B8")}
        <span class="f-brand-text">Obly</span>
      </div>
      <span class="f-title">${escHtml(data.projectName)}</span>
      <span class="f-info">oblyapp.com · Gerado em ${generatedDate}</span>
    </div>
  </div>
</td></tr></tfoot>
<tbody><tr><td>
<div class="page">

  <!-- CAPA -->
  <div class="cover">
    <div class="cover-top">
      <span class="c-eyebrow">Relatório Diário de Obra · ${escHtml(fmtPeriodLabel(period))}</span>
      <div class="c-brand">
        ${oblySvg(28, "#60A5FA")}
        <span class="c-brand-text">Obly</span>
      </div>
    </div>
    <div>
      <div class="c-title">${escHtml(data.projectName)}</div>
      ${data.projectAddress ? `<div class="c-sub">${escHtml(data.projectAddress)}</div>` : ""}
    </div>
    <div class="cover-bottom">
      <div class="cover-fields">
        <div class="cf"><label>Período</label><span>${periodText}</span></div>
        <div class="cf"><label>Gerado em</label><span>${generatedDate}</span></div>
      </div>
      <div class="period-pill">${periodPill}</div>
    </div>
  </div>

  <!-- STATS -->
  <div class="stats">
    <div class="stat">
      <div class="stat-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <div class="stat-body">
        <span class="stat-val">${data.visitCount}</span>
        <span class="stat-lbl">Visitas</span>
      </div>
    </div>
    <div class="stat">
      <div class="stat-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 1.5"/>
        </svg>
      </div>
      <div class="stat-body">
        <span class="stat-val">${hoursLabel}</span>
        <span class="stat-lbl">Horas trabalhadas</span>
      </div>
    </div>
    <div class="stat">
      <div class="stat-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"/><circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
      <div class="stat-body">
        <span class="stat-val">${data.totalPhotosInPeriod}</span>
        <span class="stat-lbl">Fotos</span>
      </div>
    </div>
    <div class="stat">
      <div class="stat-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      </div>
      <div class="stat-body">
        <span class="stat-val">${fmtBRL(data.totalExpensesInPeriod).replace("R$ ", "R$ ")}</span>
        <span class="stat-lbl">Despesas no período</span>
      </div>
    </div>
  </div>

  <!-- CONTEÚDO -->
  <div class="content">
    ${tasksSection(data)}
    ${indicatorsSection(data)}
    ${financialSection(data)}
    ${diarySection(data)}
  </div>

</div>
</td></tr></tbody>
</table>
</body>
</html>`;
}
