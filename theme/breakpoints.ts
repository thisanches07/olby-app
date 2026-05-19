// theme/breakpoints.ts
//
// O app é travado em retrato (app.json). Mesmo assim a largura varia bastante:
// iPhone (~320–430), iPad em Split View / Slide Over (~320–510) e iPad em tela
// cheia retrato (744–1024). Por isso toda a lógica responsiva é baseada em
// LARGURA — nunca em "é iPad?" — o que também cobre multitarefa do iPad.

export const breakpoints = {
  /** A partir daqui tratamos como tablet (iPad em retrato tela cheia: 744+). */
  tablet: 700,
  /** iPad Pro 12.9" em retrato = 1024 — libera 3 colunas. */
  largeTablet: 1000,
} as const;

/** Largura máxima do conteúdo por densidade de leitura. */
export const contentWidth = {
  /** Card de autenticação (login/criar conta/esqueci senha) — foco. */
  auth: 460,
  /** Formulários e texto corrido — linha legível. */
  narrow: 600,
  /** Coluna padrão de telas de detalhe. */
  default: 760,
  /** Listas / grades — aproveita o espaço sem esticar demais. */
  wide: 1100,
} as const;

/** Largura máxima de diálogos centralizados (modais que viram card no tablet). */
export const dialogWidth = {
  default: 460,
  large: 560,
} as const;

/** Padding horizontal da tela conforme a largura disponível. */
export const screenPadding = {
  phone: 16,
  tablet: 24,
  largeTablet: 32,
} as const;

/** Largura-alvo mínima de um card em grade antes de criar nova coluna. */
export const gridMinCardWidth = 340;

export type DeviceClass = "phone" | "tablet" | "largeTablet";

export function deviceClassFor(width: number): DeviceClass {
  if (width >= breakpoints.largeTablet) return "largeTablet";
  if (width >= breakpoints.tablet) return "tablet";
  return "phone";
}
