import React, { useEffect, useRef, useState } from "react";
import { SpotlightOverlay, type TargetLayout } from "./spotlight-overlay";
import type { EngTourRefs } from "@/components/obra/obra-view-eng";

interface StepConfig {
  title: string;
  body: string;
  stepLabel: string;
  refKey: keyof EngTourRefs | null;
  tabToActivate?: string;
  nextLabel: string;
  showSkip: boolean;
}

const STEPS: StepConfig[] = [
  {
    title: "Visão geral da obra",
    body: "Acompanhe progresso, prazo e endereço do seu projeto em um só lugar.",
    stepLabel: "PASSO 1 DE 8",
    refKey: "heroRef",
    tabToActivate: "projetos",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Diário de Obra",
    body: "Registre visitas com fotos e anotações. Seu cliente acompanha tudo em tempo real.",
    stepLabel: "PASSO 2 DE 8",
    refKey: "diaryButtonRef",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Tarefas da obra",
    body: "Crie e organize as etapas da obra. Marque como concluídas conforme avançar.",
    stepLabel: "PASSO 3 DE 8",
    refKey: "tasksTabRef",
    tabToActivate: "tarefas",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Gastos e financeiro",
    body: "Registre todos os gastos da obra, adicione comprovantes e acompanhe o orçamento.",
    stepLabel: "PASSO 4 DE 8",
    refKey: "gastosTabRef",
    tabToActivate: "gastos",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Documentos da obra",
    body: "Armazene contratos, plantas e comprovantes organizados por projeto.",
    stepLabel: "PASSO 5 DE 8",
    refKey: "documentosTabRef",
    tabToActivate: "documentos",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Compartilhar com cliente",
    body: "Abra o painel de convites para gerar um link e compartilhar a obra com o cliente.",
    stepLabel: "PASSO 6 DE 8",
    refKey: "shareButtonRef",
    tabToActivate: "projetos",
    nextLabel: "Ver compartilhamento",
    showSkip: true,
  },
  {
    title: "Relatório profissional",
    body: "Gere um relatório completo com fotos, tarefas e gastos para enviar ao cliente em PDF.",
    stepLabel: "PASSO 7 DE 8",
    refKey: "reportButtonRef",
    nextLabel: "Ver relatório",
    showSkip: true,
  },
  {
    title: "Você está pronto!",
    body: "Explore as abas, registre o diário e compartilhe com seu cliente. Tudo pronto!",
    stepLabel: "PASSO 8 DE 8",
    refKey: null,
    nextLabel: "Entendido!",
    showSkip: false,
  },
];

interface ManagerTourProps {
  currentStep: number;
  refs: EngTourRefs;
  onAdvance: () => void;
  onSkip: () => void;
  onSwitchTab?: (tabId: string) => void;
  stepSideEffects?: Partial<Record<number, () => void>>;
  stepActivateEffects?: Partial<Record<number, () => void>>;
}

export function ManagerTour({
  currentStep,
  refs,
  onAdvance,
  onSkip,
  onSwitchTab,
  stepSideEffects,
  stepActivateEffects,
}: ManagerTourProps) {
  const [targetLayout, setTargetLayout] = useState<TargetLayout | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = STEPS[currentStep] ?? null;
  const isVisible = currentStep >= 0 && currentStep < STEPS.length && step !== null;

  useEffect(() => {
    if (!isVisible || !step) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (step.tabToActivate && onSwitchTab) {
      onSwitchTab(step.tabToActivate);
    }

    stepActivateEffects?.[currentStep]?.();

    if (step.refKey === null) {
      setTargetLayout(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      const ref = refs[step.refKey!];
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setTargetLayout({ x, y, width, height });
        }
      });
    }, 100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentStep, isVisible, onSwitchTab, refs, step, stepActivateEffects]);

  if (!isVisible || !step) return null;

  const handleNext = () => {
    stepSideEffects?.[currentStep]?.();
    onAdvance();
  };

  return (
    <SpotlightOverlay
      visible={isVisible}
      targetLayout={targetLayout}
      title={step.title}
      body={step.body}
      stepLabel={step.stepLabel}
      onNext={handleNext}
      onSkip={onSkip}
      nextLabel={step.nextLabel}
      showSkip={step.showSkip}
    />
  );
}
