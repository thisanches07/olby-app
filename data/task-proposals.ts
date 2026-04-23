export type DetailLevel = "essential" | "complete" | "detailed";
export type ProposalPriority = "ALTA" | "MEDIA" | "BAIXA";

export interface ProposalTask {
  title: string; // max 30 chars
  priority: ProposalPriority;
  category: string;
  minLevel: DetailLevel;
  phase: number; // 1=planning, 2=prep/demo, 3=structure, 4=installations, 5=finishing
}

export type ProjectType =
  | "new_construction"
  | "full_reform"
  | "room_reform"
  | "maintenance";

export interface WizardAnswers {
  projectType: ProjectType;
  scope: string;
  minPhase: number; // 1=all, 3=skip 1&2, 4=skip 1-3, 5=skip 1-4
  detailLevel: DetailLevel;
}

const LEVEL_ORDER: Record<DetailLevel, number> = {
  essential: 1,
  complete: 2,
  detailed: 3,
};

// ─── TASK SETS ────────────────────────────────────────────────────────────────

const NEW_CONSTRUCTION_HOUSE: ProposalTask[] = [
  // Phase 1 — Projeto e Licenças
  { title: "Elaborar projeto arquitetônico", priority: "ALTA", category: "Projeto e Licenças", minLevel: "essential", phase: 1 },
  { title: "Aprovar projeto na prefeitura", priority: "ALTA", category: "Projeto e Licenças", minLevel: "essential", phase: 1 },
  { title: "Contratar eng. responsável", priority: "ALTA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  { title: "Elaborar projeto estrutural", priority: "ALTA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  { title: "Elaborar projeto elétrico", priority: "MEDIA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  { title: "Elaborar projeto hidráulico", priority: "MEDIA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  { title: "Sondagem do terreno", priority: "ALTA", category: "Projeto e Licenças", minLevel: "detailed", phase: 1 },
  // Phase 2 — Fundação
  { title: "Limpar e nivelar terreno", priority: "ALTA", category: "Fundação", minLevel: "essential", phase: 2 },
  { title: "Escavar fundações", priority: "ALTA", category: "Fundação", minLevel: "essential", phase: 2 },
  { title: "Executar forma de sapatas", priority: "ALTA", category: "Fundação", minLevel: "complete", phase: 2 },
  { title: "Concretar fundações", priority: "ALTA", category: "Fundação", minLevel: "essential", phase: 2 },
  { title: "Aguardar cura do concreto", priority: "MEDIA", category: "Fundação", minLevel: "complete", phase: 2 },
  { title: "Executar baldrame", priority: "ALTA", category: "Fundação", minLevel: "complete", phase: 2 },
  { title: "Impermeabilizar fundações", priority: "MEDIA", category: "Fundação", minLevel: "detailed", phase: 2 },
  // Phase 3 — Estrutura
  { title: "Executar pilares (1ª laje)", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  { title: "Executar vigas e laje", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  { title: "Concretar laje", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  { title: "Executar pilares (2ª laje)", priority: "ALTA", category: "Estrutura", minLevel: "complete", phase: 3 },
  { title: "Executar laje de cobertura", priority: "ALTA", category: "Estrutura", minLevel: "complete", phase: 3 },
  { title: "Instalar cobertura (telhado)", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  { title: "Instalar calhas e rufos", priority: "MEDIA", category: "Estrutura", minLevel: "complete", phase: 3 },
  // Phase 4 — Vedações e Instalações
  { title: "Executar alvenaria externa", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Executar alvenaria interna", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Executar reboco externo", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Executar reboco interno", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar quadro elétrico", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Passar eletrodutos", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  { title: "Passar fiação elétrica", priority: "ALTA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  { title: "Instalar pontos elétricos", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  { title: "Instalar tubulação de água", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar tubulação de esgoto", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar caixa d'água", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar aquecedor", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  { title: "Instalar pontos de luz", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  // Phase 5 — Acabamento
  { title: "Assentar piso interno", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Revestir paredes banheiros", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Aplicar gesso / estuque", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Pintar paredes internas", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Pintar paredes externas", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar portas e janelas", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar louças sanitárias", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar metais e torneiras", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar iluminação", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar bancadas", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Executar área externa", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Assentar calçadas", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar portão e cerca", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Limpeza final da obra", priority: "MEDIA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Vistoria e entrega", priority: "ALTA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const NEW_CONSTRUCTION_APARTMENT: ProposalTask[] = [
  // Phase 1 — Projeto
  { title: "Elaborar projeto arquitetônico", priority: "ALTA", category: "Projeto e Licenças", minLevel: "essential", phase: 1 },
  { title: "Aprovar projeto na prefeitura", priority: "ALTA", category: "Projeto e Licenças", minLevel: "essential", phase: 1 },
  { title: "Contratar eng. responsável", priority: "ALTA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  { title: "Elaborar projeto elétrico", priority: "MEDIA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  { title: "Elaborar projeto hidráulico", priority: "MEDIA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  // Phase 4 — Instalações (estrutura já existe no ap.)
  { title: "Executar alvenaria interna", priority: "ALTA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  { title: "Executar reboco interno", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar quadro elétrico", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Passar eletrodutos", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  { title: "Passar fiação elétrica", priority: "ALTA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  { title: "Instalar pontos elétricos", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  { title: "Instalar tubulação de água", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar tubulação de esgoto", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar aquecedor", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  { title: "Instalar pontos de luz", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "complete", phase: 4 },
  // Phase 5 — Acabamento
  { title: "Assentar piso interno", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Revestir paredes banheiros", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Aplicar gesso / estuque", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Pintar paredes internas", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar portas internas", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar louças sanitárias", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar metais e torneiras", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar iluminação", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar bancadas", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar ar-condicionado", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Limpeza final", priority: "MEDIA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Vistoria e entrega", priority: "ALTA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const NEW_CONSTRUCTION_COMMERCIAL: ProposalTask[] = [
  // Phase 1 — Projeto e Licenças
  { title: "Elaborar projeto arquitetônico", priority: "ALTA", category: "Projeto e Licenças", minLevel: "essential", phase: 1 },
  { title: "Aprovar projeto na prefeitura", priority: "ALTA", category: "Projeto e Licenças", minLevel: "essential", phase: 1 },
  { title: "Contratar eng. responsável", priority: "ALTA", category: "Projeto e Licenças", minLevel: "essential", phase: 1 },
  { title: "Elaborar projeto estrutural", priority: "ALTA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  { title: "Elaborar projeto elétrico", priority: "MEDIA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  { title: "Elaborar projeto hidráulico", priority: "MEDIA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  { title: "Projeto SPDA (para-raios)", priority: "MEDIA", category: "Projeto e Licenças", minLevel: "detailed", phase: 1 },
  { title: "AVCB (Corpo de Bombeiros)", priority: "ALTA", category: "Projeto e Licenças", minLevel: "complete", phase: 1 },
  // Phase 2 — Fundação
  { title: "Limpar e nivelar terreno", priority: "ALTA", category: "Fundação", minLevel: "essential", phase: 2 },
  { title: "Escavar fundações", priority: "ALTA", category: "Fundação", minLevel: "essential", phase: 2 },
  { title: "Concretar fundações", priority: "ALTA", category: "Fundação", minLevel: "essential", phase: 2 },
  { title: "Executar baldrame", priority: "ALTA", category: "Fundação", minLevel: "complete", phase: 2 },
  // Phase 3 — Estrutura
  { title: "Executar estrutura de concreto", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  { title: "Instalar cobertura (telhado)", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  { title: "Instalar calhas e rufos", priority: "MEDIA", category: "Estrutura", minLevel: "complete", phase: 3 },
  // Phase 4 — Instalações
  { title: "Executar alvenaria externa", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Executar alvenaria interna", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Executar reboco", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar quadro elétrico", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Passar fiação elétrica", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar pontos elétricos", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar tubulação de água", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar tubulação de esgoto", priority: "ALTA", category: "Vedações e Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar SPDA (para-raios)", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "detailed", phase: 4 },
  { title: "Instalar sistema de alarme", priority: "MEDIA", category: "Vedações e Instalações", minLevel: "detailed", phase: 4 },
  { title: "Instalar CFTV", priority: "BAIXA", category: "Vedações e Instalações", minLevel: "detailed", phase: 4 },
  // Phase 5 — Acabamento
  { title: "Assentar piso comercial", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Revestir paredes banheiros", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Pintar paredes internas", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Pintar fachada", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar portas e janelas", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar louças sanitárias", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar metais e torneiras", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar iluminação", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar ar-condicionado", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar fachada / letreiro", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Executar área externa", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Limpeza final da obra", priority: "MEDIA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Vistoria e entrega", priority: "ALTA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const FULL_REFORM: ProposalTask[] = [
  // Phase 1 — Planejamento
  { title: "Elaborar escopo da reforma", priority: "ALTA", category: "Planejamento", minLevel: "essential", phase: 1 },
  { title: "Vistoria técnica inicial", priority: "ALTA", category: "Planejamento", minLevel: "essential", phase: 1 },
  { title: "Contratar eng. responsável", priority: "ALTA", category: "Planejamento", minLevel: "complete", phase: 1 },
  { title: "Elaborar projeto elétrico", priority: "MEDIA", category: "Planejamento", minLevel: "complete", phase: 1 },
  { title: "Elaborar projeto hidráulico", priority: "MEDIA", category: "Planejamento", minLevel: "complete", phase: 1 },
  // Phase 2 — Demolição
  { title: "Demolir revestimentos", priority: "ALTA", category: "Demolição", minLevel: "essential", phase: 2 },
  { title: "Demolir pisos existentes", priority: "ALTA", category: "Demolição", minLevel: "essential", phase: 2 },
  { title: "Remover instalações antigas", priority: "ALTA", category: "Demolição", minLevel: "complete", phase: 2 },
  { title: "Verificar estrutura existente", priority: "ALTA", category: "Demolição", minLevel: "essential", phase: 2 },
  { title: "Caçamba e limpeza de entulho", priority: "MEDIA", category: "Demolição", minLevel: "essential", phase: 2 },
  // Phase 3 — Estrutura e Vedações
  { title: "Reparar estrutura", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  { title: "Executar alvenaria nova", priority: "ALTA", category: "Estrutura", minLevel: "complete", phase: 3 },
  { title: "Impermeabilizar áreas molhadas", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  { title: "Executar reboco", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  // Phase 4 — Instalações
  { title: "Refazer instalação elétrica", priority: "ALTA", category: "Instalações", minLevel: "essential", phase: 4 },
  { title: "Refazer instalação hidráulica", priority: "ALTA", category: "Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar quadro elétrico", priority: "ALTA", category: "Instalações", minLevel: "complete", phase: 4 },
  { title: "Instalar pontos de luz", priority: "MEDIA", category: "Instalações", minLevel: "complete", phase: 4 },
  { title: "Instalar ar-condicionado", priority: "MEDIA", category: "Instalações", minLevel: "detailed", phase: 4 },
  // Phase 5 — Acabamento
  { title: "Assentar piso", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Assentar azulejos", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Aplicar gesso / estuque", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Pintar paredes", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Pintar tetos", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar portas e janelas", priority: "ALTA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar louças sanitárias", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar metais e torneiras", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar iluminação", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar bancadas", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Fazer rejunte", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Fazer silicone nos vãos", priority: "BAIXA", category: "Acabamento", minLevel: "detailed", phase: 5 },
  { title: "Limpeza final da obra", priority: "MEDIA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Vistoria e entrega", priority: "ALTA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const ROOM_REFORM_BATHROOM: ProposalTask[] = [
  // Phase 2 — Demolição
  { title: "Demolir revestimentos", priority: "ALTA", category: "Demolição", minLevel: "essential", phase: 2 },
  { title: "Demolir piso existente", priority: "ALTA", category: "Demolição", minLevel: "essential", phase: 2 },
  { title: "Remover louças e metais", priority: "MEDIA", category: "Demolição", minLevel: "complete", phase: 2 },
  { title: "Entulho e limpeza", priority: "MEDIA", category: "Demolição", minLevel: "essential", phase: 2 },
  // Phase 3 — Impermeabilização
  { title: "Verificar impermeabilização", priority: "ALTA", category: "Impermeabilização", minLevel: "essential", phase: 3 },
  { title: "Executar impermeabilização", priority: "ALTA", category: "Impermeabilização", minLevel: "essential", phase: 3 },
  { title: "Aguardar cura (3-7 dias)", priority: "MEDIA", category: "Impermeabilização", minLevel: "complete", phase: 3 },
  // Phase 4 — Instalações
  { title: "Refazer pontos hidráulicos", priority: "ALTA", category: "Instalações", minLevel: "essential", phase: 4 },
  { title: "Refazer pontos de esgoto", priority: "ALTA", category: "Instalações", minLevel: "essential", phase: 4 },
  { title: "Refazer pontos elétricos", priority: "ALTA", category: "Instalações", minLevel: "essential", phase: 4 },
  // Phase 5 — Acabamento
  { title: "Assentar revestimento parede", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Assentar novo piso", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar box de vidro", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar louças sanitárias", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar metais e torneiras", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar espelho", priority: "BAIXA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar iluminação", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar ventilação", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Pintar teto", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Fazer rejunte", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Fazer silicone nos vãos", priority: "BAIXA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Limpeza final", priority: "BAIXA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Vistoria e entrega", priority: "ALTA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const ROOM_REFORM_KITCHEN: ProposalTask[] = [
  // Phase 2 — Demolição
  { title: "Demolir revestimentos", priority: "ALTA", category: "Demolição", minLevel: "essential", phase: 2 },
  { title: "Demolir piso existente", priority: "ALTA", category: "Demolição", minLevel: "complete", phase: 2 },
  { title: "Remover armários antigos", priority: "MEDIA", category: "Demolição", minLevel: "essential", phase: 2 },
  { title: "Entulho e limpeza", priority: "MEDIA", category: "Demolição", minLevel: "essential", phase: 2 },
  // Phase 3 — Impermeabilização e Vedação
  { title: "Impermeabilizar (se necessário)", priority: "ALTA", category: "Vedação", minLevel: "essential", phase: 3 },
  { title: "Regularizar paredes", priority: "MEDIA", category: "Vedação", minLevel: "complete", phase: 3 },
  // Phase 4 — Instalações
  { title: "Refazer pontos hidráulicos", priority: "ALTA", category: "Instalações", minLevel: "essential", phase: 4 },
  { title: "Refazer ponto de gás", priority: "ALTA", category: "Instalações", minLevel: "complete", phase: 4 },
  { title: "Refazer pontos elétricos", priority: "ALTA", category: "Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar tomadas especiais", priority: "MEDIA", category: "Instalações", minLevel: "complete", phase: 4 },
  // Phase 5 — Acabamento
  { title: "Assentar revestimento parede", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Assentar novo piso", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar armários (aéreos)", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar armários (base)", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar bancada", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar cuba e torneira", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar cooktop / fogão", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar coifa / exaustor", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar iluminação", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Pintar teto", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Fazer rejunte", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Fazer silicone nos vãos", priority: "BAIXA", category: "Acabamento", minLevel: "detailed", phase: 5 },
  { title: "Limpeza final", priority: "BAIXA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Vistoria e entrega", priority: "ALTA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const ROOM_REFORM_BEDROOM_LIVING: ProposalTask[] = [
  // Phase 2 — Demolição
  { title: "Demolir revestimentos", priority: "ALTA", category: "Demolição", minLevel: "complete", phase: 2 },
  { title: "Demolir piso existente", priority: "ALTA", category: "Demolição", minLevel: "essential", phase: 2 },
  { title: "Entulho e limpeza", priority: "MEDIA", category: "Demolição", minLevel: "essential", phase: 2 },
  // Phase 3 — Vedação
  { title: "Regularizar paredes", priority: "MEDIA", category: "Vedação", minLevel: "essential", phase: 3 },
  { title: "Executar reboco novo", priority: "MEDIA", category: "Vedação", minLevel: "complete", phase: 3 },
  // Phase 4 — Instalações
  { title: "Refazer pontos elétricos", priority: "ALTA", category: "Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar pontos de luz", priority: "MEDIA", category: "Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar ar-condicionado", priority: "MEDIA", category: "Instalações", minLevel: "complete", phase: 4 },
  // Phase 5 — Acabamento
  { title: "Assentar piso novo", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Aplicar gesso / estuque", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Pintar paredes", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Pintar teto", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar portas e janelas", priority: "ALTA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar rodapé", priority: "BAIXA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar iluminação", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Limpeza final", priority: "BAIXA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Vistoria e entrega", priority: "ALTA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const ROOM_REFORM_OUTDOOR: ProposalTask[] = [
  // Phase 2 — Demolição / Preparação
  { title: "Demolir estrutura existente", priority: "ALTA", category: "Preparação", minLevel: "complete", phase: 2 },
  { title: "Limpar e nivelar área", priority: "ALTA", category: "Preparação", minLevel: "essential", phase: 2 },
  { title: "Entulho e limpeza", priority: "MEDIA", category: "Preparação", minLevel: "essential", phase: 2 },
  // Phase 3 — Estrutura
  { title: "Executar impermeabilização", priority: "ALTA", category: "Estrutura", minLevel: "essential", phase: 3 },
  { title: "Executar alvenaria / muro", priority: "ALTA", category: "Estrutura", minLevel: "complete", phase: 3 },
  { title: "Executar cobertura / pergolado", priority: "MEDIA", category: "Estrutura", minLevel: "complete", phase: 3 },
  // Phase 4 — Instalações
  { title: "Instalar pontos elétricos", priority: "MEDIA", category: "Instalações", minLevel: "essential", phase: 4 },
  { title: "Instalar tubulação de água", priority: "MEDIA", category: "Instalações", minLevel: "complete", phase: 4 },
  { title: "Instalar sistema de irrigação", priority: "BAIXA", category: "Instalações", minLevel: "detailed", phase: 4 },
  { title: "Instalar iluminação externa", priority: "MEDIA", category: "Instalações", minLevel: "complete", phase: 4 },
  // Phase 5 — Acabamento
  { title: "Assentar piso externo", priority: "ALTA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Pintar muros / paredes", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Instalar portão e cerca", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Executar jardim / paisagismo", priority: "BAIXA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Instalar churrasqueira", priority: "BAIXA", category: "Acabamento", minLevel: "detailed", phase: 5 },
  { title: "Limpeza final", priority: "BAIXA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Vistoria e entrega", priority: "ALTA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const MAINTENANCE_ELECTRICAL: ProposalTask[] = [
  { title: "Vistoria elétrica inicial", priority: "ALTA", category: "Diagnóstico", minLevel: "essential", phase: 4 },
  { title: "Mapear circuitos existentes", priority: "ALTA", category: "Diagnóstico", minLevel: "essential", phase: 4 },
  { title: "Desligar rede elétrica", priority: "ALTA", category: "Execução", minLevel: "essential", phase: 4 },
  { title: "Trocar quadro elétrico", priority: "ALTA", category: "Execução", minLevel: "complete", phase: 4 },
  { title: "Substituir fiação danificada", priority: "ALTA", category: "Execução", minLevel: "essential", phase: 4 },
  { title: "Instalar disjuntores novos", priority: "ALTA", category: "Execução", minLevel: "essential", phase: 4 },
  { title: "Instalar aterramento", priority: "ALTA", category: "Execução", minLevel: "complete", phase: 4 },
  { title: "Instalar pontos elétricos", priority: "MEDIA", category: "Execução", minLevel: "complete", phase: 4 },
  { title: "Instalar iluminação LED", priority: "BAIXA", category: "Execução", minLevel: "detailed", phase: 4 },
  { title: "Testar circuitos elétricos", priority: "ALTA", category: "Verificação", minLevel: "essential", phase: 4 },
  { title: "Laudo elétrico (ART)", priority: "ALTA", category: "Verificação", minLevel: "essential", phase: 4 },
  { title: "Limpeza e organização", priority: "BAIXA", category: "Finalização", minLevel: "essential", phase: 4 },
];

const MAINTENANCE_PLUMBING: ProposalTask[] = [
  { title: "Vistoria hidráulica inicial", priority: "ALTA", category: "Diagnóstico", minLevel: "essential", phase: 4 },
  { title: "Identificar vazamentos", priority: "ALTA", category: "Diagnóstico", minLevel: "essential", phase: 4 },
  { title: "Cortar abastecimento de água", priority: "ALTA", category: "Execução", minLevel: "essential", phase: 4 },
  { title: "Substituir tubulação antiga", priority: "ALTA", category: "Execução", minLevel: "essential", phase: 4 },
  { title: "Reparar pontos de vazamento", priority: "ALTA", category: "Execução", minLevel: "essential", phase: 4 },
  { title: "Substituir registros / válvulas", priority: "ALTA", category: "Execução", minLevel: "complete", phase: 4 },
  { title: "Instalar caixa d'água nova", priority: "MEDIA", category: "Execução", minLevel: "complete", phase: 4 },
  { title: "Desentupir ralos / esgoto", priority: "MEDIA", category: "Execução", minLevel: "complete", phase: 4 },
  { title: "Testar pressão e estanqueidade", priority: "ALTA", category: "Verificação", minLevel: "essential", phase: 4 },
  { title: "Restaurar revestimentos", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Limpeza final", priority: "BAIXA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const MAINTENANCE_PAINTING: ProposalTask[] = [
  { title: "Vistoria e avaliação inicial", priority: "MEDIA", category: "Preparação", minLevel: "essential", phase: 5 },
  { title: "Proteger móveis e pisos", priority: "MEDIA", category: "Preparação", minLevel: "essential", phase: 5 },
  { title: "Lixar paredes e tetos", priority: "ALTA", category: "Preparação", minLevel: "essential", phase: 5 },
  { title: "Reparar trincas e buracos", priority: "ALTA", category: "Preparação", minLevel: "essential", phase: 5 },
  { title: "Aplicar massa corrida", priority: "ALTA", category: "Preparação", minLevel: "essential", phase: 5 },
  { title: "Aplicar fundo preparador", priority: "MEDIA", category: "Preparação", minLevel: "complete", phase: 5 },
  { title: "Pintar tetos (1ª demão)", priority: "ALTA", category: "Pintura", minLevel: "essential", phase: 5 },
  { title: "Pintar tetos (2ª demão)", priority: "ALTA", category: "Pintura", minLevel: "essential", phase: 5 },
  { title: "Pintar paredes (1ª demão)", priority: "ALTA", category: "Pintura", minLevel: "essential", phase: 5 },
  { title: "Pintar paredes (2ª demão)", priority: "ALTA", category: "Pintura", minLevel: "essential", phase: 5 },
  { title: "Pintar paredes (3ª demão)", priority: "MEDIA", category: "Pintura", minLevel: "complete", phase: 5 },
  { title: "Pintar fachada externa", priority: "ALTA", category: "Pintura", minLevel: "complete", phase: 5 },
  { title: "Pintar rodapés e guarnições", priority: "MEDIA", category: "Pintura", minLevel: "detailed", phase: 5 },
  { title: "Remover proteções", priority: "BAIXA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Limpeza final", priority: "BAIXA", category: "Finalização", minLevel: "essential", phase: 5 },
];

const MAINTENANCE_STRUCTURAL: ProposalTask[] = [
  // Phase 3 — Estrutura
  { title: "Vistoria estrutural inicial", priority: "ALTA", category: "Diagnóstico", minLevel: "essential", phase: 3 },
  { title: "Laudo de engenheiro (ART)", priority: "ALTA", category: "Diagnóstico", minLevel: "essential", phase: 3 },
  { title: "Identificar trincas e fissuras", priority: "ALTA", category: "Diagnóstico", minLevel: "essential", phase: 3 },
  { title: "Escavar para inspeção", priority: "ALTA", category: "Execução", minLevel: "complete", phase: 3 },
  { title: "Reforçar fundações", priority: "ALTA", category: "Execução", minLevel: "essential", phase: 3 },
  { title: "Injetar resina nas fissuras", priority: "ALTA", category: "Execução", minLevel: "essential", phase: 3 },
  { title: "Reforçar pilares / vigas", priority: "ALTA", category: "Execução", minLevel: "complete", phase: 3 },
  { title: "Executar impermeabilização", priority: "ALTA", category: "Execução", minLevel: "essential", phase: 3 },
  { title: "Substituir telhado danificado", priority: "ALTA", category: "Execução", minLevel: "complete", phase: 3 },
  { title: "Monitorar movimentação", priority: "MEDIA", category: "Verificação", minLevel: "detailed", phase: 3 },
  // Phase 5 — Acabamento
  { title: "Restaurar reboco", priority: "MEDIA", category: "Acabamento", minLevel: "essential", phase: 5 },
  { title: "Pintar áreas reparadas", priority: "MEDIA", category: "Acabamento", minLevel: "complete", phase: 5 },
  { title: "Vistoria final", priority: "ALTA", category: "Finalização", minLevel: "essential", phase: 5 },
  { title: "Limpeza final", priority: "BAIXA", category: "Finalização", minLevel: "essential", phase: 5 },
];

// ─── LIBRARY MAP ──────────────────────────────────────────────────────────────

const TASK_LIBRARY: Record<string, ProposalTask[]> = {
  "new_construction:house": NEW_CONSTRUCTION_HOUSE,
  "new_construction:apartment": NEW_CONSTRUCTION_APARTMENT,
  "new_construction:commercial": NEW_CONSTRUCTION_COMMERCIAL,
  "new_construction:other": NEW_CONSTRUCTION_HOUSE,
  "full_reform:all_rooms": FULL_REFORM,
  "full_reform:internal": FULL_REFORM,
  "full_reform:external": FULL_REFORM,
  "full_reform:mixed": FULL_REFORM,
  "room_reform:bathroom": ROOM_REFORM_BATHROOM,
  "room_reform:kitchen": ROOM_REFORM_KITCHEN,
  "room_reform:bedroom_living": ROOM_REFORM_BEDROOM_LIVING,
  "room_reform:outdoor": ROOM_REFORM_OUTDOOR,
  "maintenance:electrical": MAINTENANCE_ELECTRICAL,
  "maintenance:plumbing": MAINTENANCE_PLUMBING,
  "maintenance:painting": MAINTENANCE_PAINTING,
  "maintenance:structural": MAINTENANCE_STRUCTURAL,
};

// ─── SELECTOR ─────────────────────────────────────────────────────────────────

export function selectProposalTasks(answers: WizardAnswers): ProposalTask[] {
  const key = `${answers.projectType}:${answers.scope}`;
  const pool = TASK_LIBRARY[key] ?? NEW_CONSTRUCTION_HOUSE;
  const maxLevel = LEVEL_ORDER[answers.detailLevel];

  return pool.filter(
    (task) =>
      task.phase >= answers.minPhase &&
      LEVEL_ORDER[task.minLevel] <= maxLevel,
  );
}

// ─── WIZARD CONFIG ────────────────────────────────────────────────────────────

export interface WizardOption {
  id: string;
  emoji: string;
  label: string;
  description?: string;
}

export interface WizardQuestion {
  title: string;
  subtitle: string;
  options: WizardOption[];
}

export const Q1: WizardQuestion = {
  title: "Qual o tipo de projeto?",
  subtitle: "Isso nos ajuda a sugerir as etapas certas para sua obra.",
  options: [
    { id: "new_construction", emoji: "🏗️", label: "Construção nova" },
    { id: "full_reform", emoji: "🔨", label: "Reforma completa" },
    { id: "room_reform", emoji: "🪟", label: "Reforma de cômodo" },
    { id: "maintenance", emoji: "🔧", label: "Manutenção / Reparos" },
  ],
};

export const Q2_BY_TYPE: Record<string, WizardQuestion> = {
  new_construction: {
    title: "Qual o tipo de construção?",
    subtitle: "Vamos ajustar as tarefas\nconforme o projeto.",
    options: [
      { id: "house", emoji: "🏠", label: "Casa" },
      { id: "apartment", emoji: "🏢", label: "Apartamento" },
      { id: "commercial", emoji: "🏪", label: "Comercial" },
      { id: "other", emoji: "📐", label: "Outro" },
    ],
  },
  full_reform: {
    title: "Qual a abrangência?",
    subtitle: "Nos ajuda a dimensionar\nas etapas da reforma.",
    options: [
      { id: "all_rooms", emoji: "🏠", label: "Todos os cômodos" },
      { id: "internal", emoji: "🛋️", label: "Área interna" },
      { id: "external", emoji: "🌿", label: "Área externa" },
      { id: "mixed", emoji: "🔀", label: "Interna e externa" },
    ],
  },
  room_reform: {
    title: "Qual cômodo?",
    subtitle: "Sugerimos tarefas\nespecíficas para cada ambiente.",
    options: [
      { id: "bathroom", emoji: "🚿", label: "Banheiro" },
      { id: "kitchen", emoji: "🍳", label: "Cozinha" },
      { id: "bedroom_living", emoji: "🛋️", label: "Quarto / Sala" },
      { id: "outdoor", emoji: "🌿", label: "Área externa" },
    ],
  },
  maintenance: {
    title: "Que tipo de manutenção?",
    subtitle: "Cada especialidade tem\nsua lista de verificações.",
    options: [
      { id: "electrical", emoji: "⚡", label: "Elétrica" },
      { id: "plumbing", emoji: "🚰", label: "Hidráulica" },
      { id: "painting", emoji: "🎨", label: "Pintura" },
      { id: "structural", emoji: "🧱", label: "Estrutural" },
    ],
  },
};

export const Q3: WizardQuestion = {
  title: "Em que etapa está?",
  subtitle: "Pulamos tarefas de fases\nque já foram concluídas.",
  options: [
    { id: "1", emoji: "📋", label: "Início / Planejamento" },
    { id: "3", emoji: "🏚️", label: "Preparação concluída" },
    { id: "4", emoji: "🧱", label: "Estrutura pronta" },
    { id: "5", emoji: "⚡", label: "Instalações prontas" },
  ],
};

export const Q4: WizardQuestion = {
  title: "Quantas tarefas sugerir?",
  subtitle: "Você pode ajustar a lista\nantes de adicionar.",
  options: [
    { id: "essential", emoji: "⚡", label: "Essencial", description: "~10–15 tarefas" },
    { id: "complete", emoji: "⚖️", label: "Completo", description: "~20–30 tarefas" },
    { id: "detailed", emoji: "💎", label: "Detalhado", description: "até 50 tarefas" },
  ],
};
