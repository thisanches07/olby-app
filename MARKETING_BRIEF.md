# Obly App — Brief Completo para Agente de Marketing & Design

---

## 1. VISÃO GERAL DO PRODUTO

**Nome:** Obly App
**Categoria:** Gestão de Obras / Construção Civil
**Plataformas:** iOS e Android
**Site:** oblyapp.com
**Suporte:** suporte@oblyapp.com

**Descrição em uma frase:**
Obly é a plataforma mobile all-in-one para engenheiros e profissionais de construção documentarem obras, compartilharem progresso com clientes e controlarem finanças — tudo de forma visual e simples.

---

## 2. PROPOSTA DE VALOR

### O problema que resolve
- Engenheiros perdem tempo respondendo clientes sobre andamento da obra
- Documentação feita em papel ou WhatsApp é desorganizada
- Clientes não têm visibilidade sobre o que está sendo feito com seu dinheiro
- Controle financeiro de obras é feito em planilhas ou cadernos

### A solução
- **Diário de obra digital** com fotos, data/hora automáticos
- **Compartilhamento transparente** — cliente acompanha em tempo real
- **Controle financeiro integrado** — orçamento vs. gastos numa tela
- **Gestão de tarefas** com prioridades e progresso visual

### Slogan
> **"Sua obra, documentada. Seu cliente, informado."**

---

## 3. PÚBLICO-ALVO

### Perfil 1 — Engenheiro / Mestre de Obra (usuário principal)
- **Idade:** 28–55 anos
- **Contexto:** Profissional com 1 a 10 obras ativas simultaneamente
- **Dor:** Clientes ligando para saber do andamento; falta de prova do trabalho executado
- **Benefício:** Documentação automática, diário visual, cliente informado sem esforço extra
- **Dispositivo:** Smartphone Android ou iPhone, usa em campo

### Perfil 2 — Cliente / Dono da Obra
- **Idade:** 30–60 anos
- **Contexto:** Investiu dinheiro numa reforma ou construção, quer acompanhar
- **Dor:** Falta de transparência, não sabe o que está sendo feito
- **Benefício:** Vê fotos do dia a dia, acompanha progresso, sente controle
- **Acesso:** Convite pelo engenheiro, acesso limitado (visualização)

### Perfil 3 — Construtora Pequena / Média
- **Contexto:** Coordena múltiplas equipes e projetos
- **Benefício:** Centraliza obras, tarefas e despesas numa plataforma

---

## 4. FUNCIONALIDADES PRINCIPAIS

| Feature | Descrição |
|---------|-----------|
| **Diário de Obra** | Registro diário com fotos, hora, duração e descrição de atividades |
| **Galeria de Fotos** | Visualização em grid por data, lightbox, exportação |
| **Gestão de Projetos** | Criar e gerenciar múltiplas obras com status, progresso e membros |
| **Controle de Despesas** | Categorias de gasto (Material, Mão de Obra, Ferramentas, etc.) + documentos |
| **Orçamento vs. Gastos** | Painel financeiro com indicadores de saúde orçamentária |
| **Gestão de Tarefas** | Lista com prioridade (Alta/Média/Baixa), reordenação, progresso |
| **Convite de Clientes** | Link de convite — cliente acessa com visualização limitada e segura |
| **Planos de Assinatura** | FREE (visualizar), BASIC (3 obras – R$79,90/mês), PRO (ilimitado – R$129,90/mês) |

---

## 5. IDENTIDADE VISUAL

### Paleta de Cores

| Nome | Hex | Uso |
|------|-----|-----|
| **Primary** | `#2563EB` | Botões principais, headers, elementos ativos, FAB |
| **Primary Dark** | `#1D4ED8` | Início do gradiente no header |
| **Primary Light** | `#3B82F6` | Fim do gradiente, ícones secundários |
| **Background** | `#F9FAFB` | Fundo geral da tela |
| **Surface** | `#FFFFFF` | Cards, painéis, modais |
| **Text Primary** | `#111827` | Textos principais |
| **Text Secondary** | `#6B7280` | Textos secundários, labels |
| **Text Muted** | `#9CA3AF` | Placeholders, captions |
| **Success** | `#22C55E` | Status "Concluído", indicadores positivos |
| **Warning** | `#F59E0B` | Status "Arquivado", alertas |
| **Danger** | `#EF4444` | Erros, ações destrutivas |
| **Purple** | `#8B5CF6` | Status "Planejamento" |
| **Border** | `#E5E7EB` | Bordas de cards, divisores |

### Gradiente Principal
```
Linear: #1D4ED8 → #2563EB → #3B82F6 (horizontal, esquerda para direita)
Usado no: header da home, topo das telas principais
```

### Tipografia

- **Família:** Inter (Google Fonts)
- **Pesos:** Regular 400, SemiBold 600, Bold 700

| Estilo | Tamanho | Peso | Uso |
|--------|---------|------|-----|
| Title | 20px | Bold 700 | Títulos de telas |
| Subtitle | 16px | SemiBold 600 | Subtítulos, nomes de obras |
| Body | 14px | Regular 400 | Texto corrido |
| Caption | 12px | Regular 400 | Informações secundárias |
| Label | 13px | SemiBold 600 | Tags, badges |
| Numeric | 14px | Bold 700 | Valores financeiros, números |

### Espaçamento
Sistema baseado em múltiplos de 4px (4, 8, 12, 16, 20, 24, 32, 40, 48px).

### Border Radius
- Botões e inputs: 12px
- Cards: 16px
- Modais/sheets: 20–24px
- Badges/chips: 999px (pill)

### Estilo Visual — Minimalismo Moderno
- Muito espaço em branco
- Cards limpos com sombra leve
- Ícones do Material Design
- Animações suaves (press scale, fade transitions)
- Haptic feedback no iOS
- Splash screen branca com logo centralizado
- Sem ornamentos — funcional e clean

---

## 6. TOM DE VOZ

- **Idioma:** Português Brasileiro
- **Estilo:** Informal mas profissional
- **Abordagem:** Direto ao ponto, sem jargão técnico excessivo
- **Emoção:** Confiança, organização, transparência
- **Evitar:** Texto longo, termos muito técnicos de TI, formalismo excessivo

---

## 7. ESTRUTURA DE TELAS (para referência de design)

```
Onboarding / Auth
  └─ Login (email, Google, Apple)

Home — Minhas Obras
  ├─ Header com gradiente azul + saudação personalizada
  ├─ Barra de busca
  ├─ Filtros de status (Todas, Em Andamento, Concluídas, Arquivadas)
  ├─ Lista de cards de obras
  └─ FAB (+) para nova obra

Detalhes da Obra (visão Engenheiro)
  ├─ Hero com progresso circular
  ├─ Painel financeiro (Orçamento / Gastos / Disponível)
  └─ Tabs: Projeto | Tarefas | Gastos

Detalhes da Obra (visão Cliente)
  ├─ Status da obra
  ├─ Progresso visual
  └─ Tabs: Detalhes | Tarefas

Diário de Obra
  ├─ Tab Timeline (entradas por data)
  └─ Tab Fotos (grid fotográfico)

Perfil
  ├─ Avatar + dados pessoais
  ├─ Status de assinatura
  └─ Links legais + Logout

Planos e Assinatura
  ├─ Comparativo FREE / BASIC / PRO
  └─ Botão "Assinar agora"
```

---

## 8. DIFERENCIAIS COMPETITIVOS

1. **Documentação visual automática** — foto + timestamp todo dia
2. **Transparência para o cliente** — convite por link, acesso seguro, sem edição
3. **Tudo num lugar** — diário + tarefas + financeiro integrado
4. **Mobile-first** — feito para uso em campo, não em escritório
5. **Plano freemium** — cliente pode visualizar obras gratuitamente
6. **Design brasileiro** — linguagem, valores em R$, UX adaptada ao mercado local

---

## 9. CASOS DE USO REAIS

**Engenheiro com múltiplas obras:**
> "Agora tiro foto todo dia, o cliente recebe notificação, e ninguém mais me liga para perguntar o andamento."

**Cliente investidor:**
> "Investi R$ 400 mil na reforma e agora vejo cada foto e cada real gasto direto no meu celular."

**Mestre de obra:**
> "Antes tudo era no papel ou WhatsApp. Agora todas as tarefas e horas estão organizadas num só lugar."

---

---

# PROMPT PARA O AGENTE DE MARKETING / DESIGN

> Copie o bloco abaixo e envie para o seu agente de design ou marketing:

---

```
Você vai criar os materiais de marketing e design para um aplicativo mobile chamado Obly App.

## O QUE É O OBLY APP
Obly é uma plataforma mobile (iOS e Android) para gestão completa de obras de construção civil.
Ele resolve um problema real: engenheiros não conseguem documentar o progresso das obras de forma organizada,
e os clientes ficam no escuro sobre o andamento do que foi contratado.

O app conecta engenheiros/mestres de obra com seus clientes, permitindo:
- Registrar o diário da obra com fotos diárias (câmera ou galeria)
- Compartilhar progresso com clientes em tempo real via convite
- Controlar orçamento e despesas por categoria
- Gerenciar tarefas com prioridades

## PÚBLICO-ALVO
1. **Engenheiros e Mestres de Obra** (28–55 anos) — usuários principais que criam e gerenciam obras
2. **Clientes / Donos de Obra** (30–60 anos) — visualizam progresso e fotos via convite
3. **Pequenas Construtoras** — coordenam múltiplas obras e equipes

## PROPOSTA DE VALOR
Slogan: "Sua obra, documentada. Seu cliente, informado."
O app transforma um processo caótico (papel, WhatsApp, planilha) num fluxo digital simples e visual.

## IDENTIDADE VISUAL

### Cores Principais
- **Azul Primário:** #2563EB — cor de ação, botões, destaques
- **Azul Escuro:** #1D4ED8 — início do gradiente no header
- **Azul Claro:** #3B82F6 — fim do gradiente, elementos secundários
- **Fundo:** #F9FAFB — cinza muito claro para o background
- **Surface:** #FFFFFF — cards e painéis
- **Verde:** #22C55E — sucesso, obra concluída
- **Âmbar:** #F59E0B — alerta, obra arquivada
- **Vermelho:** #EF4444 — erro, perigo
- **Roxo:** #8B5CF6 — status planejamento
- **Texto Principal:** #111827
- **Texto Secundário:** #6B7280

### Gradiente do Header
Linear de #1D4ED8 → #2563EB → #3B82F6 (esquerda para direita)

### Tipografia
- Fonte: **Inter** (Google Fonts)
- Pesos: Regular 400, SemiBold 600, Bold 700

### Estilo Visual
- **Minimalismo moderno**
- Muito espaço em branco
- Cards com sombra leve e bordas arredondadas (16px)
- Ícones do Material Design
- Animações suaves (scale press, fade transitions)
- Splash screen branca com logo centralizado
- Design clean, sem ornamentos, funcional

### Tom de Voz
- Português Brasileiro
- Informal mas profissional
- Direto e prático
- Confiança e organização como emoção central

## FUNCIONALIDADES PARA DESTACAR
1. Diário de Obra com fotos + timestamp automático
2. Compartilhamento seguro com clientes via link
3. Controle de orçamento vs. gastos
4. Gestão de tarefas com prioridades
5. Histórico fotográfico em grid por data
6. Planos: FREE / BASIC (R$79,90/mês) / PRO (R$129,90/mês)

## DIFERENCIAIS
- Tudo num lugar (diário + tarefas + financeiro)
- Mobile-first, feito para uso em campo
- Cliente vê sem poder editar (seguro e transparente)
- Design brasileiro, linguagem acessível

## CASOS DE USO (use em copy)
- Engenheiro que quer parar de responder "como está a obra?" no WhatsApp
- Cliente que investiu alto e quer ver o progresso sem ligar todo dia
- Construtora que quer centralizar a documentação de todas as obras

## REFERÊNCIAS VISUAIS DE ESTILO
- Minimalismo iOS/Material Design
- Apps de referência de estilo: Linear, Notion, Figma Mobile
- Paleta fria (azul + branco), com acentos de verde e âmbar
- Fotografia realista de obras brasileiras (construção civil, concreto, trabalhadores)

## O QUE PRECISO DE VOCÊ
[Aqui você especifica o que quer: posts para Instagram, identidade visual, anúncios, App Store screenshots, landing page, etc.]
```

---

**Site:** oblyapp.com | **Suporte:** suporte@oblyapp.com
