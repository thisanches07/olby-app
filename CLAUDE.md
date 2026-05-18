# Obly — Contexto do produto (app + backend + web)

App de gestão de obras (construção civil). Engenheiro/responsável registra obras,
tarefas, despesas e diário de obra com fotos; cliente acompanha em modo leitura.
Idioma do produto: **pt-BR**.

## Monorepo lógico (3 pastas irmãs em `C:\Users\tsanc\Desktop\novo app\`)

| Pasta | O que é | Stack | Git |
|---|---|---|---|
| `obra-app/` | **Frontend mobile** (este repo) | Expo SDK 54, RN 0.81, React 19, expo-router v6, TS | repo próprio (branch `main`) |
| `obra-backend/app-obra-backend/` | **Backend API** | NestJS 11, TypeORM 0.3, PostgreSQL, Firebase Admin, AWS S3 SDK (R2) | repo próprio |
| `obly-web/` | **Site estático** (landing + deep links + páginas legais) | HTML/CSS estático, deploy Vercel | repo próprio |

> Backend real fica em `obra-backend/app-obra-backend/` (um nível abaixo).
> Cada pasta tem seu próprio `.git` e seu próprio `.claude/`.

## Contrato de integração app ↔ backend

- App consome a API via `services/api.ts`. Base URL em `EXPO_PUBLIC_API_URL` (`.env`).
  - Produção atual: `https://obly-backend.onrender.com/v1` (Render).
  - `api.ts` evita duplicar `/v1` se a base já terminar em `/v1`.
- **Prefixo global da API: `/v1`** (`API_PREFIX`, ver `main.ts`).
- **Auth: Firebase ID Token** no header `Authorization: Bearer <token>`.
  - Backend: `FirebaseAuthGuard` valida o token; `AttachUserInterceptor` (global)
    resolve/atacha o usuário do banco. `@User()` injeta `AuthUser { dbId, phoneNumber }`.
    `dbId` é o UUID interno (≠ Firebase UID).
  - Firebase project: `obra-app-5d762`.
- Swagger em dev: `http://localhost:3000/docs` (desligado em prod por default).
- Dinheiro sempre em **centavos** (`*Cents: int`). Datas puras em **`YYYY-MM-DD`** (string).

## Mapa de features → endpoints → entidade → tela

| Feature | Endpoints backend (prefixo `/v1`) | Entidade | Tela app |
|---|---|---|---|
| Obras/projetos | `GET /projects/mine`, `GET /projects/mine/summary`, `POST /projects`, `GET/PATCH/DELETE /projects/:id` | `project` | `app/(tabs)/index.tsx`, `app/obra/[id].tsx` |
| Membros & papéis | `GET /projects/:id/members`, `DELETE /projects/:id/members/:memberId` | `project_member` | modais em `components/projeto/`, `components/obra/cliente-team-*` |
| Convites por link | `GET/POST /projects/:id/invites*`, `POST /invites/accept` | `project_invite` | `app/invite.tsx`, `share-project-modal` |
| Tarefas | `GET /tasks(/mine|/open|/:id)`, `POST/PATCH/DELETE /tasks` | `task` | `components/projeto/*tasks*`, `components/obra/eng-tasks-list` |
| Despesas | `GET /expenses(/mine|/:id)`, `POST/PATCH/DELETE /expenses` | `expense` | `components/projeto/project-expenses-section` |
| Diário (registros) | `GET /daily-log-entries(/feed|/:id)`, `POST/PATCH/DELETE` | `daily_log_entry` | `app/diario/[id].tsx`, `hooks/use-diary-data.ts` |
| Diário (fotos) | `POST /daily-log-photos/presign`+`/confirm`, `GET /daily-log-photos/by-*`, `GET /:id/url|/download`, `DELETE` | `daily_log_photo` | `components/diario/photos-tab`, `utils/photo-upload.ts` |
| Documentos | `POST /projects/:id/documents/presign`+`/:docId/confirm`, `GET .../documents*`, `PATCH/DELETE` | `project_document` | `components/documents/`, `hooks/use-project-documents.ts` |
| Assinaturas/planos | `GET /subscriptions/me` | `subscription`, `plan` | `app/subscription/{plans,my-plan}.tsx`, `contexts/subscription-context.tsx` |
| Compra IAP (mobile) | `POST /billing/mobile/verify`; webhooks `/billing/webhooks/{apple,google,subscriptions}` | `subscription`, `billing_webhook_event` | `services/billing.api.ts`, `expo-iap` |
| Perfil/conta | `GET/PATCH /users/me`, `POST /users/register`, `DELETE /users/me`, `GET /users/me/{subscription-status,billing-identity}` | `user` | `app/profile.tsx` |
| Push | `POST /notifications/push-tokens`(+`/revoke`,`/touch`) | `push_device_token` | `hooks/use-push-notifications.tsx`, `services/notifications.*` |
| Relatório | (gerado client-side) | — | `app/report/[id].tsx`, `utils/report-html.ts`, `services/report.service.ts` |
| Admin/ops | `GET/POST /admin/*` (header `x-operations-admin-key`) | vários | — (operacional) |
| Dev (local) | `POST /dev/set-plan`, `GET /dev/my-plan` (bloqueado em prod) | — | `app/dev/DevPanel.tsx` |

## Regras de negócio chave

- **Papéis de membro** (`ProjectMemberRole`): `OWNER`, `PRO`, `CLIENT_VIEWER`.
  - Só `OWNER` escreve (`canProjectMemberWrite` em `project-member.entity.ts`).
  - `CLIENT_VIEWER` = cliente, somente leitura. Convite por link gera `CLIENT_VIEWER`
    (uso único, 24h, token guardado só como hash SHA-256).
- **Guards de projeto**: `ProjectAccessGuard` (membership) + `@ProjectRoles(...)` +
  `@ProjectMember()` injeta o membro. Escritas exigem `ProjectWriteSubscriptionGuard`
  + `@RequireProjectWriteSubscription()` (assinatura ativa do usuário).
- **Planos** (`plan`): FREE (limit 0), BASIC (R$79,90, 3 obras), PRO (R$129,90, ilimitado `-1`).
  - `GET /subscriptions/me` devolve plano efetivo + `ownedProjectCount` + `canCreateProject`.
  - Plano efetivo = assinatura ativa > trial > ambassador > free.
  - `user.trialEndsAt` (default 7 dias, `TRIAL_DAYS`); `user.ambassadorSince` (PRO grátis manual via SQL).
- **IAP**: SKUs `com.tsanc.obraapp.sub.basic1` / `com.tsanc.obraapp.sub.pro`.
  Fluxo: compra `expo-iap` → `POST /billing/mobile/verify` (Apple/Google) →
  backend valida na store e sincroniza `subscription` → app força refresh do token Firebase.
  Webhooks oficiais (`/billing/webhooks/apple|google`) reconciliam de forma idempotente.
- **App 403 de plano**: `api.ts` detecta erro de limite e chama `setPlanErrorHandler`
  → `PlanErrorInterceptor` redireciona para `/subscription/plans`.
- **Upload de fotos/documentos**: padrão presign → `PUT` binário direto no R2 → confirm.
  Thumbs geradas no app (`expo-image-manipulator`). Originais acessadas via URL assinada sob demanda.

## Frontend obra-app — arquitetura

- **Roteamento**: expo-router v6, `typedRoutes` + React Compiler ligados. App scheme `obraapp`,
  bundle `com.tsanc.obraapp`, nome de exibição **Obly**, universal link domain `oblyapp.com`.
- **Árvore de providers** (`app/_layout.tsx`): `Auth → Subscription → AppSession → Toast →
  Projects → Onboarding → PushNotifications → AuthGate`.
  - `AuthGate`: redireciona login ↔ (tabs); `/invite` é público.
  - `SubscriptionLoader` recarrega plano após auth e no foreground.
  - `RolePickerGate`: onboarding de papel (engenheiro/cliente) via bottom sheet.
  - `DevPanelBridge` só em `__DEV__`.
- **Rotas**: `(tabs)/index` (home/lista de obras), `obra/[id]`, `diario/[id]`,
  `report/[id]`, `profile`, `notifications`, `invite`, `subscription/{plans,my-plan}`,
  `login`, `forgot-password`, `modal`.
- **Camadas**: `services/*` (chamadas API + mappers), `contexts/*` e `hooks/use-*` (estado),
  `components/{home,obra,projeto,diario,documents,subscription,ui}/*` (UI por domínio).
  - `services/api.ts`: cliente fetch único com Bearer automático e `ApiError{status}`.
  - `ObraDetalhe` (UI) é mapeado de `ProjectSummaryDto` em `contexts/projects-context.tsx`.
- **Auth/Firebase**: `services/firebase.ts` (init), `services/auth.service.ts`,
  `services/token.ts` (getIdToken/forceRefresh). Login email/senha, Google, Apple.
- **Builds**: EAS (`eas build/submit` via scripts npm). Projeto EAS `ed0b0d87-...`.

## obly-web — papel

Site estático no Vercel servindo o domínio dos deep links e páginas de suporte:
- `index.html` — landing; `download/` — redirect de instalação.
- `legal/` — `privacy.html`, `terms.html`, `delete-account.html` e handlers de ação
  do Firebase Auth (`reset-password.html`, `verify-email.html`, `auth-action.html`).
- `invite/index.html` — landing do convite (abre o app via deep link).
- `.well-known/{apple-app-site-association,assetlinks.json}` — universal links / app links.
- URLs legais consumidas pelo app em `utils/legal.ts`.

## Comandos úteis

- App: `npm start` (Expo), `npm run start:dev-client`, `npm run ios|android`,
  `npm run ios:release|android:release`, `npm run lint`,
  `npm run test:billing`, `npm run test:permissions`.
- Backend (em `obra-backend/app-obra-backend/`): `docker compose up -d` (Postgres),
  `npm run migration:run`, `npm run start:dev`, `npm test`, `npm run smoke:apple-sandbox`.

## Convenções

- pt-BR em UI e mensagens de erro. Dinheiro em centavos. Datas puras `YYYY-MM-DD`.
- Backend valida DTOs com `class-validator` (whitelist + transform globais).
- `bigint` do TypeORM volta como **string** em JS (usar `Number()` quando precisar).
- Não commitar `.env` com segredos. Buckets/contas R2 separados por ambiente.
- Ao planejar feature nova: confirmar guard/role necessário, impacto em plano/quota,
  e se precisa de migração TypeORM no backend.
