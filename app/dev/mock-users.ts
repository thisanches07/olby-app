import type { AppRole } from "@/hooks/use-app-session";

/**
 * DEV ONLY - usuarios de teste para login rapido no DevPanel.
 *
 * Configure no .env:
 * EXPO_PUBLIC_DEV_CLIENTE_PASS=sua_senha
 * EXPO_PUBLIC_DEV_ARQ_PASS=sua_senha
 */
export interface DevUser {
  id: string;
  label: string;
  name: string;
  email: string;
  password: string;
  role: AppRole;
}

export const DEV_USERS: DevUser[] = [
  {
    id: "7675fa6b-26bf-4503-b867-5d65f8f243de",
    label: "Cliente",
    name: "Cliente Chique",
    email: "thiago.sanches0703@gmail.com",
    password: process.env.EXPO_PUBLIC_DEV_CLIENTE_PASS ?? "",
    role: "cliente",
  },
  {
    id: "be6749d7-3258-4c78-a723-222630b8a058",
    label: "Arquiteto",
    name: "Arquiteto Chique",
    email: "arq@gmail.com",
    password: process.env.EXPO_PUBLIC_DEV_ARQ_PASS ?? "",
    role: "engenheiro",
  },
];
