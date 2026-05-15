# Relatório — Escalabilidade (notas para revisitar)

> Documento de análise. Nada aqui foi implementado ainda. Serve para
> decidirmos as mitigações depois.

## Código envolvido

- `services/report.service.ts` — busca de dados (onde estão os gargalos)
  - `fetchFeedInPeriod` (~L98-129) — pagina o feed
  - `buildReportData` (~L190-274) — orquestra o fan-out
  - `getEntryReportPhotos` (~L161-189) — fotos por registro (usa `listByEntry`)
  - `inlineReportPhoto` (~L131-159) — baixa thumb + base64 inline
- `utils/report-html.ts` — monta o HTML (grid 3 colunas, `.pg` ~L498)
- `utils/report-usage.ts` — geração/uso do PDF
- `services/daily-log-photos.service.ts` — `listByEntry`
- Backend: `obra-backend/.../diary/daoly-log-photos.service.ts`
  `listByEntry` L296-330 (sem limite; 1 presign R2 por foto)

## Cadeia atual da request

1. **Feed paginado** (`fetchFeedInPeriod`): `for (page < 20)` ×
   `listFeedByProject(limit=10)` → **máx. 200 entradas**, sequencial.
2. **Fan-out** (`buildReportData`): `Promise.all(feedItems.map(...))` —
   **sem limite de concorrência**.
3. **Por entrada** (`getEntryReportPhotos`): 1× `listByEntry` (HTTP;
   backend faz 1 presign R2 por foto) + `Promise.all(photos.map(inlineReportPhoto))`
   — cada foto = 1 `FileSystem.downloadAsync` + base64, também sem limite.

### Cenário 500 registros × 10 fotos

| Item | Valor |
|---|---|
| Entradas processadas | **~200** (loop trava em 20 págs; ~300 descartadas em silêncio) |
| Chamadas de feed | ~20 (sequenciais) |
| `listByEntry` | **~200 em paralelo de uma vez** |
| Presigns R2 (backend) | **~2.000** |
| Downloads de thumb (device) | **~2.000 em paralelo** |
| Imagens base64 num único HTML | **~2.000 (~60-100 MB+ de string)** |

## Os 3 problemas

1. **Cap silencioso de 200.** Registros além de ~200 (mais recentes) somem
   sem aviso; `totalPhotosInPeriod` também fica subestimado.
2. **Fan-out ilimitado.** ~200 HTTP + ~2.000 downloads simultâneos →
   satura rede móvel → timeouts caem no `catch {}` → fallback de 3 fotos.
3. **Estouro de memória.** ~2.000 thumbs base64 concatenados numa única
   string HTML → trava/crash no celular antes de virar PDF.

## Planos de mitigação

Ordenados por custo/benefício. Itens A+B resolvem o uso real sem tocar no
backend; D é a solução estrutural definitiva.

### A. Limitar concorrência (resolve #2) — esforço baixo, impacto alto

- Processar entradas em lotes (ex.: 5-8 por vez) em vez de
  `Promise.all` sobre tudo. Mesmo para `inlineReportPhoto` dentro da entrada.
- Implementação: helper simples de `mapWithConcurrency(items, n, fn)` em
  `services/report.service.ts` (sem dependência nova) ou `p-limit`.
- Tradeoff: relatório fica mais lento (serializado), mas conclui de forma
  confiável em vez de saturar/timeout.

### B. Cap adaptativo de fotos por registro (alivia #3) — esforço baixo

- `MAX_REPORT_PHOTOS_PER_ENTRY` deixa de ser fixo (10): escala conforme o
  nº de registros do período. Ex.: ≤30 registros → 10 fotos; 31-100 → 4;
  >100 → 2. Limita o nº total de imagens inline a um teto seguro.
- Implementação: derivar o cap em `buildReportData` a partir de
  `feedItems.length` e passar para `getEntryReportPhotos`.
- Tradeoff: relatórios grandes mostram menos fotos por registro (decisão
  de produto — pode vir acompanhado de aviso no PDF).

### C. Tratar o cap de 200 (resolve #1) — esforço baixo/médio

- Mínimo: avisar o usuário ("relatório limitado aos N registros mais
  recentes do período") quando o feed bater o teto.
- Ideal: aumentar/remover o teto de páginas e paginar até o fim do período
  — mas só faz sentido junto de A+B+D, senão agrava #2/#3.

### D. Geração no backend (resolve #3 de vez) — esforço alto, estrutural

- Endpoint que monta o relatório server-side com streaming (sem inline
  base64 no device): backend lê fotos do R2 e gera PDF/zip, ou retorna
  HTML com URLs assinadas (sem embutir bytes).
- É o caminho correto para volumes grandes (centenas de registros).
- Tradeoff: trabalho de backend (novo módulo/endpoint, geração de PDF
  server-side), fora do escopo só-frontend.

## Recomendação

Curto prazo: **A + B + aviso do C**. Resolve o caso real (relatório que
conclui e não crasha) sem mexer no backend. **D** fica como evolução
estrutural quando volume justificar.

## Histórico

- Correção do bug "relatório só pegava 3 fotos": migrado
  `getEntryReportPhotos` de `getSignedUrlsForEntry` (shape objeto vs array,
  estourava e caía no preview de 3) para `listByEntry` (todas as READY,
  thumbUrl). Detalhe em memória `diario-photos-feed-cap`.
- `getSignedUrlsForEntry` em `daily-log-photos.service.ts` ficou **sem uso**
  e com tipagem errada (backend retorna `{ count, expiresInSeconds, photos[] }`,
  campo `photoId`) — armadilha latente; corrigir tipo ou remover.
