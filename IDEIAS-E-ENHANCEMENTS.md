# Ideias e Enhancements

Este arquivo concentra ideias de melhoria de produto e arquitetura para evoluir funcionalidades sem misturar decisoes futuras com a documentacao principal do produto.

---

## Relatorios: limite mensal por obra

### Estado atual

Hoje o limite de relatorios e controlado no front em `utils/report-usage.ts`.

- O plano `FREE` nao gera relatorios.
- O plano `BASIC` gera ate 2 relatorios por mes por obra.
- O plano `PRO` gera relatorios ilimitados.
- A contagem e salva localmente com `AsyncStorage`.
- A chave local usa o formato `report_usage_${projectId}_${ano-mes}`.
- O contador aumenta quando o relatorio e gerado com sucesso na tela `app/report/[id].tsx`.

Exemplo de chave local:

```txt
report_usage_obra123_2026-05
```

### Problema do modelo atual

Esse controle nao e confiavel como regra comercial porque fica 100% no dispositivo do usuario.

Riscos:

- O usuario pode limpar os dados do app e zerar o contador.
- Reinstalar o app tambem pode apagar o historico local.
- Outro aparelho nao compartilha a mesma contagem.
- Nao existe auditoria no backend.
- Nao existe protecao real contra chamadas concorrentes.
- O suporte nao consegue consultar quantos relatorios foram gerados.
- A regra pode divergir entre versoes antigas e novas do app.

### Objetivo desejado

Transformar o limite de relatorios em uma regra de produto confiavel, sincronizada e auditavel, mantendo boa experiencia no app.

---

## Melhorias no Frontend

### 1. Exibir contador vindo do backend

Substituir o contador local por uma resposta da API.

Exemplo de estado para a tela:

```ts
type ReportUsageState = {
  used: number;
  limit: number | null;
  remaining: number | null;
  periodStart: string;
  periodEnd: string;
  planCode: "FREE" | "BASIC" | "PRO";
};
```

UI sugerida:

- BASIC: `1/2 relatorios usados este mes nesta obra`
- PRO: `Relatorios ilimitados no plano PRO`
- FREE: `Relatorios disponiveis a partir do plano BASIC`

Responsabilidade do front:

- Mostrar o contador atualizado.
- Mostrar loading enquanto busca uso.
- Mostrar estado de erro com retry.
- Atualizar o contador depois de uma geracao bem-sucedida.
- Redirecionar para tela de planos quando o backend negar acesso.

### 2. Bloquear geracao usando resposta do backend

O front pode continuar fazendo uma checagem visual antes de gerar, mas a decisao final deve vir do backend.

Fluxo recomendado:

1. Usuario escolhe periodo.
2. App chama endpoint de permissao/uso.
3. Se permitido, app inicia geracao.
4. Backend reserva ou registra a geracao.
5. App monta/recebe o relatorio.
6. UI atualiza contador.

Responsabilidade do front:

- Nao confiar apenas no `AsyncStorage`.
- Tratar erros `403`, `402` ou codigos especificos de limite.
- Mostrar mensagens claras por plano.
- Evitar duplo clique no botao de gerar.

### 3. Manter cache local apenas como UX

O `AsyncStorage` pode continuar existindo, mas somente como cache visual temporario.

Uso aceitavel:

- Mostrar ultimo contador conhecido enquanto a API carrega.
- Evitar tela vazia offline.
- Guardar preferencias da tela, como periodo selecionado.

Uso nao aceitavel:

- Ser a fonte final de verdade do limite.
- Incrementar limite comercial sem confirmar no backend.

### 4. Melhorar mensagens de paywall

Mensagens atuais podem ser mais especificas:

- FREE: explicar que relatorios sao recurso pago.
- BASIC no limite: mostrar quantos foram usados e quando reseta.
- PRO: reforcar ilimitado.

Exemplo:

```txt
Voce usou 2 de 2 relatorios desta obra em maio. O limite renova em 01/06/2026.
```

### 5. Mostrar data de renovacao

O backend pode devolver `resetsAt`.

Front exibe:

- `Renova em 01/06/2026`
- `Disponivel novamente em 27 dias`

### 6. Historico basico no app

Opcionalmente, mostrar uma lista simples:

- Data de geracao.
- Periodo escolhido.
- Obra.
- Usuario que gerou.
- Status: gerado, falhou, exportado.

Responsabilidade do front:

- Tela ou modal de historico.
- Estados vazios.
- Indicacao de erro quando uma geracao falhou.

---

## Melhorias no Backend

### 1. Criar tabela de uso de relatorios

Tabela sugerida: `project_report_usage`.

Campos:

```txt
id
project_id
user_id
year_month
used_count
limit_count
plan_code_snapshot
created_at
updated_at
```

Indice unico recomendado:

```txt
unique(project_id, user_id, year_month)
```

Alternativa: se o limite deve ser por obra independentemente do usuario, usar:

```txt
unique(project_id, year_month)
```

Decisao de produto necessaria:

- O limite e por obra?
- Por usuario?
- Por dono da obra?
- Por assinatura?

Pelo texto atual da UI, a regra parece ser "por obra por mes".

### 2. Criar log/auditoria de relatorios gerados

Tabela sugerida: `project_report_generations`.

Campos:

```txt
id
project_id
requested_by_user_id
period_days
period_start
period_end
status
file_name
usage_counted
created_at
finished_at
error_code
error_message
```

Status possiveis:

```txt
REQUESTED
GENERATED
FAILED
EXPORTED
```

Vantagens:

- Auditoria.
- Suporte consegue investigar.
- Permite historico no app.
- Permite metricas de uso.
- Permite evitar cobrar uso quando a geracao falha.

### 3. Endpoint para consultar uso

Endpoint sugerido:

```http
GET /projects/:projectId/reports/usage
```

Resposta:

```json
{
  "projectId": "project_123",
  "planCode": "BASIC",
  "used": 1,
  "limit": 2,
  "remaining": 1,
  "allowed": true,
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-31",
  "resetsAt": "2026-06-01T00:00:00.000Z"
}
```

Responsabilidade do backend:

- Determinar plano efetivo.
- Determinar limite do plano.
- Determinar periodo mensal.
- Validar permissao do usuario na obra.
- Retornar dados prontos para UI.

### 4. Endpoint atomico para registrar geracao

Endpoint sugerido:

```http
POST /projects/:projectId/reports/generations
```

Body:

```json
{
  "periodDays": 7
}
```

Resposta de sucesso:

```json
{
  "generationId": "report_gen_123",
  "usage": {
    "used": 2,
    "limit": 2,
    "remaining": 0,
    "allowed": true,
    "resetsAt": "2026-06-01T00:00:00.000Z"
  }
}
```

Resposta quando limite foi atingido:

```json
{
  "code": "REPORT_LIMIT_REACHED",
  "message": "Limite mensal de relatorios atingido.",
  "used": 2,
  "limit": 2,
  "resetsAt": "2026-06-01T00:00:00.000Z"
}
```

Importante:

- O incremento deve ser atomico no banco.
- Duas chamadas simultaneas nao podem passar do limite.
- A API deve validar role do usuario na obra.
- A API deve validar plano atual no momento da chamada.

### 5. Decidir quando contar uso

Opcoes:

1. Contar ao iniciar a geracao.
2. Contar somente quando o PDF foi gerado com sucesso.
3. Contar somente quando o usuario exporta/compartilha.

Recomendacao:

- Contar quando o relatorio foi gerado com sucesso.
- Se a geracao falhar por erro tecnico, nao consumir limite.
- Se o usuario gerou a previa e nao exportou, ainda pode contar, porque a funcionalidade foi usada.

### 6. Idempotencia

Adicionar `idempotencyKey` no request para evitar duplicar contagem quando o app repetir a chamada por timeout.

Exemplo:

```json
{
  "periodDays": 7,
  "idempotencyKey": "uuid-gerado-no-front"
}
```

Backend deve garantir:

- A mesma chave para o mesmo usuario/projeto nao incrementa duas vezes.
- Retorna a mesma resposta da primeira chamada.

### 7. Limites por plano configuraveis

Evitar limite hardcoded no front e no backend.

Modelo possivel:

```txt
plan_features
- plan_code
- feature_key
- limit_value
```

Exemplo:

```txt
BASIC | monthly_reports_per_project | 2
PRO   | monthly_reports_per_project | null
FREE  | monthly_reports_per_project | 0
```

Vantagens:

- Permite mudar limites sem publicar app.
- Permite testes A/B.
- Permite planos promocionais.
- Permite add-ons no futuro.

---

## Melhorias na geracao do PDF

### 1. Geracao no backend

Hoje o PDF e gerado no app com `expo-print`.

Alternativa robusta:

- Backend gera o PDF.
- Usa renderer controlado, como Playwright/Chromium.
- Salva arquivo em R2.
- Retorna URL assinada para download/compartilhamento.

Vantagens:

- Layout mais previsivel.
- Menos diferenca entre iOS/Android.
- Melhor controle de quebras de pagina.
- Imagens remotas podem ser baixadas pelo servidor.
- Facilita historico de relatorios.

Desvantagens:

- Mais custo de infraestrutura.
- Mais complexidade no backend.
- Precisa fila/worker se o PDF ficar pesado.

### 2. Geracao hibrida

Backend valida limite e retorna dados; front continua gerando PDF localmente.

Vantagens:

- Menor mudanca inicial.
- Mantem geracao rapida local.
- Resolve o problema comercial do limite.

Desvantagens:

- PDF continua sujeito a variacoes do `expo-print`.
- Historico de arquivos fica limitado.

### 3. Salvar snapshot do relatorio

Mesmo se o PDF for gerado no front, o backend pode salvar metadados:

- Periodo.
- Totais.
- Quantidade de fotos.
- Quem gerou.
- Nome do arquivo.

Isso permite auditoria sem armazenar o PDF inicialmente.

---

## Melhorias de Produto

### 1. Relatorios como recurso premium claro

Adicionar uma mini area de valor na tela:

- BASIC: `2 relatorios por obra/mes`
- PRO: `relatorios ilimitados`
- FREE: `disponivel no BASIC`

### 2. Upgrade no momento certo

Quando o usuario BASIC atinge limite:

- Mostrar quantos usou.
- Mostrar quando renova.
- Botao principal: `Gerar relatorios ilimitados com PRO`.
- Botao secundario: `Fechar`.

### 3. Packs adicionais

Ideia futura:

- BASIC tem 2 relatorios por obra/mes.
- Usuario pode comprar pack avulso de relatorios extras.

Requer backend:

- Tabela de creditos.
- Consumo atomico.
- Integracao IAP para produtos consumiveis.

### 4. Relatorio compartilhavel por link

Em vez de apenas exportar PDF local:

- Gerar link seguro.
- Cliente acessa no navegador.
- Expira em X dias ou fica permanente por obra.

Requer backend:

- Armazenamento do PDF.
- Controle de acesso.
- Links assinados ou tokens publicos.

### 5. Historico de relatorios da obra

Tela dentro da obra:

- Lista de relatorios gerados.
- Filtro por periodo.
- Baixar novamente.
- Recompartilhar.

Requer backend:

- Persistencia dos arquivos ou metadados.
- Permissao por role.

---

## Faseamento sugerido

### Fase 1: Confiabilidade comercial minima

Back:

- Criar endpoint de uso.
- Criar endpoint de registro atomico de geracao.
- Persistir contador mensal.
- Validar plano e permissao.

Front:

- Trocar `AsyncStorage` por API.
- Mostrar contador vindo do backend.
- Tratar erro de limite.
- Manter cache local apenas para UX.

### Fase 2: Auditoria e suporte

Back:

- Criar tabela de historico de geracoes.
- Registrar status de sucesso/falha.
- Adicionar idempotencia.

Front:

- Atualizar contador apos geracao.
- Mostrar data de reset.
- Melhorar mensagens do paywall.

### Fase 3: Relatorios persistidos

Back:

- Gerar ou armazenar PDF.
- Salvar em R2.
- Retornar URL assinada.

Front:

- Tela de historico.
- Baixar/recompartilhar relatorios antigos.

### Fase 4: Monetizacao avancada

Back:

- Features configuraveis por plano.
- Packs extras.
- Creditos de relatorio.

Front:

- UI de compra de creditos.
- Paywall contextual.
- Indicadores de uso por plano.

---

## Recomendacao pratica

Para a proxima entrega, a melhor relacao impacto/esforco e:

1. Mover a fonte da verdade do limite para o backend.
2. Manter a geracao do PDF no front por enquanto.
3. Criar um endpoint atomico de consumo de uso.
4. Mostrar no app o contador e a data de renovacao vindos da API.
5. Remover o `AsyncStorage` como regra comercial.

Isso resolve o principal risco de negocio sem precisar reescrever todo o motor de PDF agora.
