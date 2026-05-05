# Obly — Documentação de Produto

## Identidade

| Campo | Valor |
|---|---|
| **Nome** | Obly |
| **Tagline** | "Sua obra, documentada. Seu cliente, informado." |
| **Site** | oblyapp.com |
| **Plataformas** | iOS e Android |
| **Bundle ID** | `com.tsanc.obraapp` |
| **Versão atual** | 1.0.3 |
| **Esquema de URL** | `obraapp://` |

---

## O que é o Obly

O Obly é um aplicativo mobile brasileiro para gestão e documentação de obras na construção civil. Ele conecta profissionais da construção (engenheiros, arquitetos, mestres de obra) com seus clientes, permitindo que o profissional registre o avanço diário da obra em fotos, anotações e planilhas — e o cliente acompanhe tudo em tempo real, sem precisar ligar ou mandar mensagem.

**Proposta de valor central:** eliminar o ciclo interminável de "Como está minha obra?" e substituí-lo por transparência automática e documentada.

---

## Público-Alvo

### Usuário Primário — O Profissional (pagante)
- Engenheiros civis
- Arquitetos
- Mestres de obra / empreiteiros

**Dores que o app resolve:**
- Tempo gasto respondendo clientes que querem saber o status da obra
- Falta de registro fotográfico organizado do andamento
- Dificuldade de comprovar horas trabalhadas e despesas ao cliente
- Gestão manual de tarefas, orçamentos e documentos em planilhas separadas

### Usuário Secundário — O Cliente (gratuito via convite)
- Proprietários de imóveis
- Investidores em construção
- Empresas contratantes de obras

**Ganhos para o cliente:**
- Acompanha fotos e atualizações diárias direto no celular
- Visualiza cada despesa e comprovante em tempo real
- Não precisa ligar para o engenheiro para saber o que foi feito
- Confiança e transparência no uso do seu dinheiro

---

## Problema × Solução

| Problema | Solução no Obly |
|---|---|
| Clientes ligam todo dia perguntando sobre a obra | Diário de obra com fotos e timestamps enviados automaticamente |
| Sem registro fotográfico organizado | Galeria por obra com upload via câmera, galeria ou scanner |
| Controle de despesas manual em planilha | Módulo de despesas com categorias, comprovantes e saldo em tempo real |
| Tarefas esquecidas ou perdidas em mensagens | Gestão de tarefas com prioridade e status visual |
| Documentos espalhados (e-mail, WhatsApp, pasta física) | Hub de documentos centralizado por obra |
| Cliente não sabe quem está na equipe | Seção de equipe com papéis visíveis para o cliente |

---

## Funcionalidades

### Para o Profissional (Engenheiro / Arquiteto)

#### Gestão de Obras
- Criar e gerenciar múltiplas obras (limite por plano)
- Definir nome, endereço, status e datas da obra
- Filtrar obras por status: Em Andamento, Concluídas, Arquivadas
- Buscar obras por nome, cliente ou membro da equipe

#### Diário de Obra
- Registrar entradas diárias com título, notas e horário de chegada
- Duração da visita em incrementos de 30 minutos
- Até múltiplas fotos por entrada (câmera ou galeria)
- Geração automática de thumbnail 480px para performance
- Timeline visual com agrupamento por data
- Editar e deletar entradas e fotos individualmente

#### Controle Financeiro
- Orçamento total da obra vs. despesas registradas
- Despesas por categorias: Material, Mão de Obra, Ferramentas, Serviços, Transporte, Taxas, Contingência, Outros
- Anexar comprovantes (foto, scan ou arquivo) a cada despesa
- Resumo financeiro em tempo real (saldo disponível)
- Ajuste de orçamento e horas contratadas

#### Gestão de Tarefas
- Criar tarefas com título, descrição e prioridade (Alta / Média / Baixa)
- Status das tarefas: Pendente, Em Andamento, Concluída, Bloqueada
- Reordenar tarefas por drag-and-drop
- Vincular tarefas a documentos

#### Gestão de Documentos
- Upload de múltiplos tipos de documento por obra
- Tipos: Planta, Alvará, Recibo, Nota Fiscal, Contrato, Relatório, Entrega, Foto, Outro
- Origem: Câmera, Scanner de documento, Galeria, Seletor de arquivos
- Visibilidade: Interna (equipe) ou Cliente (compartilhada)
- Fixar documentos importantes no topo da lista
- Vinculação a tarefas ou entradas do diário

#### Convite e Equipe
- Convidar clientes via link público (ilimitado nos planos pagos)
- Gerenciar membros da equipe com papéis definidos
- Gerar links de convite únicos por obra

#### Notificações
- Notificações push em tempo real (Firebase Cloud Messaging)
- Central de notificações no app
- Canal Android: "Atualizações de projetos"

### Para o Cliente (acesso gratuito)

- Visualizar fotos e atualizações do diário em tempo real
- Ver resumo financeiro (despesas e orçamento)
- Acompanhar lista de tarefas e progresso
- Ver documentos compartilhados pelo profissional
- Ver quem está na equipe da obra
- Acesso somente leitura — sem edição

---

## Planos de Assinatura

### Visão Geral

| Plano | Código | Preço | Limite de Obras |
|---|---|---|---|
| Gratuito | `FREE` | R$ 0 | 0 (apenas visualiza como convidado) |
| Básico | `BASIC` | R$ 79,90/mês | 3 obras ativas |
| Profissional | `PRO` | R$ 129,90/mês | Ilimitado |

### Detalhes por Plano

**Gratuito**
- Visualizar obras como convidado (ilimitado)
- Não pode criar obras próprias
- Acesso via convite do profissional

**Básico — R$ 79,90/mês**
- Criar até 3 obras ativas simultaneamente
- Convidar clientes ilimitados
- Diário de obra completo
- Controle de despesas
- Gestão de tarefas
- Hub de documentos

**Profissional — R$ 129,90/mês** *(plano recomendado)*
- Obras ilimitadas
- Tudo do plano Básico
- Suporte prioritário

### Compras In-App (IAP)
- Plataformas: App Store (iOS) e Google Play (Android)
- SKU BASIC: `com.tsanc.obraapp.sub.basic1`
- SKU PRO: `com.tsanc.obraapp.sub.pro`
- Renovação automática mensal — cancele quando quiser
- Suporte a período de trial com contador de dias restantes
- Restauração de compras disponível

### Status de Assinatura
`TRIAL` → `ACTIVE` → `GRACE` → `PAST_DUE` → `CANCELED` / `EXPIRED`

---

## Papéis de Usuário

| Papel | Código | Descrição |
|---|---|---|
| Proprietário | `OWNER` | Criador da obra; acesso total a todas as funcionalidades |
| Profissional | `PRO` | Membro da equipe técnica; maioria das permissões de edição |
| Cliente | `CLIENT_VIEWER` | Acesso somente leitura via convite |

---

## Autenticação

Métodos disponíveis:
- E-mail e senha
- Google OAuth
- Apple Sign-In (iOS)
- Verificação por telefone (SMS, opcional)

Backend: Firebase Authentication com ID Token Bearer

---

## Paleta de Cores

### Cores Principais

| Nome | Hex | Uso |
|---|---|---|
| **Primary** | `#2563EB` | Botões primários, destaques, marca, FAB |
| **Background** | `#F9FAFB` | Fundo geral das telas |
| **Surface** | `#FFFFFF` | Cards, modais, formulários |
| **Tint Blue** | `#EFF6FF` | Fundo suave em áreas de destaque azul |

### Escala de Cinzas

| Nome | Hex | Uso |
|---|---|---|
| Gray 50 | `#F9FAFB` | Background |
| Gray 100 | `#F3F4F6` | Áreas alternadas, skeletons |
| Gray 200 | `#E5E7EB` | Bordas, divisores |

### Textos

| Nome | Hex | Uso |
|---|---|---|
| text | `#111827` | Texto principal |
| textMuted | `#6B7280` | Texto secundário, labels |
| title | `#374151` | Títulos e headings |
| subtext | `#9CA3AF` | Texto terciário, placeholders |
| disabledText | `#B0B0B0` | Elementos desabilitados |

### Status

| Nome | Hex | Uso |
|---|---|---|
| success | `#22C55E` | Concluído, sucesso, ativo |
| warning | `#F59E0B` | Atenção, em andamento |
| danger | `#EF4444` | Erro, excluir, cancelado |

### Bordas e Ícones

| Nome | Valor | Uso |
|---|---|---|
| border | `#E5E7EB` | Bordas de cards e inputs |
| primaryBorderSoft | `rgba(37, 99, 235, 0.18)` | Bordas suaves em elementos primários |
| iconMuted | `#D1D5DB` | Ícones inativos |

---

## Tipografia

**Fonte:** Inter (carregada via expo-font)

| Peso | Valor | Uso |
|---|---|---|
| Regular | 400 | Textos de corpo, labels |
| SemiBold | 600 | Subtítulos, ênfase |
| Bold | 700 | Títulos, valores numéricos importantes |

**Tamanhos disponíveis:** 12px, 13px, 14px, 15px, 16px, 18px, 20px, 24px

**Variantes semânticas:**
- `title` — 20px Bold, line-height 28
- `subtitle` — 16px SemiBold, line-height 24
- `body` — 14px Regular, line-height 22
- `caption` — 12px Regular, line-height 18
- `label` — 13px SemiBold
- `numeric` — 18px Bold (valores monetários e números)

---

## Espaçamento

Escala em pixels: `0, 2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 100`

---

## Border Radius

| Token | Valor | Uso típico |
|---|---|---|
| xs | 8px | Tags, chips pequenos |
| sm | 10px | Inputs, botões menores |
| md | 12px | Cards internos |
| lg | 16px | Cards principais |
| xl | 20px | Modais, bottom sheets |
| 2xl | 24px | Elementos grandes |
| pill | 999px | Badges, avatares |

---

## Sombras

| Nível | Offset | Opacidade | Raio | Uso |
|---|---|---|---|---|
| 1 | (0, 2) | 0.12 | 6 | Cards simples |
| 2 | (0, 4) | 0.18 | 10 | Cards destacados |
| 3 | (0, 8) | 0.22 | 16 | Modais, FAB |

---

## Stack Técnica

### Frontend (Mobile)
- **Framework:** React Native 0.81.5 com Expo SDK 54
- **Linguagem:** TypeScript
- **Navegação:** expo-router v6 (file-based routing)
- **React:** 19.1.0
- **Arquitetura:** New Architecture habilitada (`newArchEnabled: true`)

### Bibliotecas Principais
| Lib | Versão | Uso |
|---|---|---|
| expo-router | v6 | Navegação |
| firebase | ^12.9.0 | Auth + Push Notifications |
| expo-iap | — | Compras in-app |
| @gorhom/bottom-sheet | — | Bottom sheets |
| @shopify/flash-list | — | Listas performáticas |
| react-native-reanimated | ~4.1.1 | Animações |
| expo-blur | — | Efeito blur |
| expo-linear-gradient | — | Gradientes |
| expo-image-manipulator | — | Redimensionamento de fotos |
| expo-notifications | — | Push notifications |
| expo-apple-authentication | — | Sign in with Apple |
| expo-document-picker | — | Seleção de arquivos |
| react-native-document-scanner-plugin | — | Scanner de documentos |

### Backend
- **Framework:** NestJS
- **Autenticação:** `FirebaseAuthGuard` (Bearer Token = Firebase ID Token)
- **URL:** Configurada via `EXPO_PUBLIC_API_URL`
- **Rota base:** `/projects`

### Armazenamento de Mídia
- **Fotos:** Cloudflare R2 via presigned URL (PUT binário direto)
- Fluxo: presign → PUT binário → confirm no backend

### Serviços Firebase
- Firebase Authentication
- Firebase Cloud Messaging (push notifications)

---

## Estrutura de Rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/` ou `/(tabs)` | Home — Minhas Obras | Autenticado |
| `/login` | Login / Cadastro | Público |
| `/forgot-password` | Recuperar senha | Público |
| `/invite` | Aceitar convite de obra | Público |
| `/obra/[id]` | Detalhe da obra | Autenticado |
| `/diario/[id]` | Diário da obra | Autenticado |
| `/profile` | Perfil e configurações | Autenticado |
| `/notifications` | Central de notificações | Autenticado |
| `/subscription/plans` | Paywall / Planos | Autenticado |
| `/subscription/my-plan` | Meu plano atual | Autenticado |
| `/dev/DevPanel` | Painel dev | Dev builds |

---

## Modelos de Dados Principais

### Obra (Project)
```
id, name, address, status (ACTIVE | COMPLETED | ARCHIVED | PLANNING)
budgetCents, totalExpenseCents, hoursContracted
expectedDeliveryAt, createdAt, updatedAt
myRole (OWNER | PRO | CLIENT_VIEWER)
members[], trackFinancial, trackActivities
```

### Tarefa (Task)
```
id, projectId, title, description
priority (high | medium | low)
status (pending | in_progress | done | blocked)
position (para reordenação)
```

### Despesa (Expense)
```
id, projectId, taskId?
description, amountCents, date
category (MATERIAL | LABOR | TOOLS | SERVICES | TRANSPORT | FEES | CONTINGENCY | OTHER)
receiptDocument?
```

### Entrada do Diário (Daily Log Entry)
```
id, projectId, date (YYYY-MM-DD)
arrivedAt (ISO timestamp), durationMinutes
title, notes
photos: PhotoItem[]
createdByUserId, createdAt, updatedAt
```

### Documento
```
id, projectId
kind (PLANT | PERMIT | RECEIPT | INVOICE | CONTRACT | REPORT | DELIVERY | PHOTO | OTHER)
source (CAMERA | SCAN | GALLERY | FILE_PICKER)
visibility (INTERNAL | CLIENT)
isPinned, linkedTaskId?, linkedDiaryEntryId?, expenseId?
status (PENDING_UPLOAD | READY | FAILED)
```

---

## Limites do Sistema

- Máximo de 500 itens por obra (tarefas + despesas + entradas do diário combinados)
- Plano BASIC: máximo 3 obras ativas simultaneamente
- Fotos: thumbnail gerado em 480px JPEG para otimização de performance

---

## Arquivos de Referência no Código

| Arquivo | Conteúdo |
|---|---|
| [theme/colors.ts](theme/colors.ts) | Paleta de cores completa |
| [theme/typography.ts](theme/typography.ts) | Tamanhos, pesos e variantes de texto |
| [theme/spacing.ts](theme/spacing.ts) | Escala de espaçamento |
| [theme/radius.ts](theme/radius.ts) | Border radius tokens |
| [theme/shadows.ts](theme/shadows.ts) | Definições de sombra |
| [app.json](app.json) | Config Expo — nome, versão, ícones, splash |
| [app/subscription/plans.tsx](app/subscription/plans.tsx) | Tela de paywall e integração IAP |
| [contexts/subscription-context.tsx](contexts/subscription-context.tsx) | Estado global de assinatura |
| [hooks/use-auth.tsx](hooks/use-auth.tsx) | Estado global de autenticação |
| [services/api.ts](services/api.ts) | Cliente HTTP com auth automático |
| [app/_layout.tsx](app/_layout.tsx) | Layout raiz + AuthGate |
