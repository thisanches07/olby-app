import type { StatusType } from "@/components/obra-card";
import { useToast } from "@/components/obra/toast";
import type { ObraDetalhe } from "@/data/obras";
import {
  projectsService,
  type ProjectSummaryDto,
} from "@/services/projects.service";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/hooks/use-auth";

// ─── Mapper: backend summary → ObraDetalhe ───────────────────────────────────

export function mapSummaryToObra(s: ProjectSummaryDto): ObraDetalhe {
  const statusUi: StatusType =
    s.status === "COMPLETED"
      ? "concluida"
      : s.status === "ARCHIVED"
        ? "pausada"
        : s.status === "PLANNING"
          ? "planejamento"
          : "em_andamento";

  const progresso =
    s.taskCount > 0
      ? Math.round((s.completedTaskCount / s.taskCount) * 100)
      : 0;

  const createdAtBR = s.createdAt
    ? new Date(s.createdAt).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  const expectedBR = s.expectedDeliveryAt
    ? new Date(s.expectedDeliveryAt).toLocaleDateString("pt-BR")
    : "";

  return {
    id: s.id,
    nome: s.name,
    endereco: s.address ?? "",
    cliente: "",
    status: statusUi,
    progresso,
    referencia: `#${s.id.slice(0, 6).toUpperCase()}`,
    cidade: "",
    estado: "",
    dataInicio: createdAtBR,
    dataPrevisao: expectedBR || createdAtBR,
    dataPrevisaoEntrega: expectedBR || createdAtBR,
    totalInvestido: s.totalExpenseCents / 100,
    orcamento: s.budgetCents != null ? s.budgetCents / 100 : 0,
    proximoPagamento: { valor: 0, diasRestantes: 0 },
    etapaAtual: "—",
    proximaEtapa: "—",
    tarefas: [],
    gastos: [],
    horasContratadas: s.hoursContracted ?? 0,
    horasRealizadas: 0,
    trackFinancial: true,
    trackActivities: true,
    myRole: s.myRole ?? null,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ProjectsContextValue {
  obras: ObraDetalhe[];
  isLoading: boolean;
  isRefreshing: boolean;
  /** Adiciona projeto recém-criado à lista local sem re-fetch */
  addObra: (obra: ObraDetalhe) => void;
  /** Mescla campos parciais na obra correspondente da lista */
  updateObra: (id: string, partial: Partial<ObraDetalhe>) => void;
  /** Remove projeto da lista local (após deleção) */
  deleteObra: (id: string) => void;
  /** Só busca da API se ainda não carregou; caso contrário, é no-op */
  loadInitial: () => Promise<void>;
  /** Força re-fetch da API (pull-to-refresh) */
  refresh: () => Promise<void>;
  reset: () => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProjectsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [obras, setObras] = useState<ObraDetalhe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoaded = useRef(false);

  const fetchFromApi = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!user) {
        setObras([]);
        setIsLoading(false);
        setIsRefreshing(false);
        hasLoaded.current = false;
        return;
      }

      try {
        if (mode === "initial") setIsLoading(true);
        if (mode === "refresh") setIsRefreshing(true);

        const summaries = await projectsService.listMineSummary();
        setObras(summaries.map(mapSummaryToObra));
        hasLoaded.current = true;
      } catch {
        // Carregamento inicial pode falhar durante bootstrap de auth/rede.
        // Evita mostrar erro na abertura do app.
        if (mode === "refresh") {
          showToast({
            title: "Erro ao carregar projetos",
            message: "Nao foi possivel carregar seus projetos.",
            tone: "error",
          });
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [showToast, user],
  );

  const loadInitial = useCallback(async () => {
    if (!user) return;
    if (hasLoaded.current) return;
    await fetchFromApi("initial");
  }, [fetchFromApi, user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    await fetchFromApi("refresh");
  }, [fetchFromApi, user]);
  const addObra = useCallback((obra: ObraDetalhe) => {
    setObras((prev) => [obra, ...prev]);
  }, []);

  const updateObra = useCallback(
    (id: string, partial: Partial<ObraDetalhe>) => {
      setObras((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...partial } : o)),
      );
    },
    [],
  );

  const deleteObra = useCallback((id: string) => {
    setObras((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const reset = useCallback(() => {
    setObras([]);
    setIsLoading(Boolean(user));
    setIsRefreshing(false);
    hasLoaded.current = false;
  }, [user]);

  useEffect(() => {
    reset();
  }, [user?.uid, reset]);

  return (
    <ProjectsContext.Provider
      value={{
        obras,
        isLoading,
        isRefreshing,
        addObra,
        updateObra,
        deleteObra,
        loadInitial,
        refresh,
        reset,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return ctx;
}

