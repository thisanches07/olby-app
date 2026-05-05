import React, { useEffect, useRef, useState } from "react";
import type { ViewerTourRefs } from "@/components/obra/obra-view-cliente";
import { SpotlightOverlay, type TargetLayout } from "./spotlight-overlay";

interface StepConfig {
  title: string;
  body: string;
  stepLabel: string;
  refKey: keyof ViewerTourRefs | null;
  tabToActivate?: string;
  nextLabel: string;
  showSkip: boolean;
}

const STEPS: StepConfig[] = [
  {
    title: "Acompanhe a obra",
    body: "Aqui você vê o resumo do projeto, status, horas e andamento da obra.",
    stepLabel: "PASSO 1 DE 7",
    refKey: "overviewRef",
    tabToActivate: "visao_geral",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Diário de Obra",
    body: "Entre no diário para acompanhar registros, fotos e anotações feitas pelo responsável.",
    stepLabel: "PASSO 2 DE 7",
    refKey: "diaryButtonRef",
    tabToActivate: "visao_geral",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Fotos da obra",
    body: "A galeria reúne os registros fotográficos organizados para você consultar quando quiser.",
    stepLabel: "PASSO 3 DE 7",
    refKey: "galleryTabRef",
    tabToActivate: "galeria",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Documentos da obra",
    body: "Na aba Docs ficam contratos, plantas, comprovantes e arquivos importantes compartilhados com você.",
    stepLabel: "PASSO 4 DE 7",
    refKey: "documentsTabRef",
    tabToActivate: "documentos",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Gastos e comprovantes",
    body: "Veja as despesas registradas e os comprovantes compartilhados no projeto.",
    stepLabel: "PASSO 5 DE 7",
    refKey: "expensesTabRef",
    tabToActivate: "gastos",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Tarefas da obra",
    body: "Acompanhe as etapas planejadas, o que já foi concluído e o que ainda está em andamento.",
    stepLabel: "PASSO 6 DE 7",
    refKey: "tasksTabRef",
    tabToActivate: "tarefas",
    nextLabel: "Próximo",
    showSkip: true,
  },
  {
    title: "Tudo pronto",
    body: "Use as abas inferiores para navegar entre fotos, documentos, gastos e tarefas da obra.",
    stepLabel: "PASSO 7 DE 7",
    refKey: "bottomTabsRef",
    tabToActivate: "visao_geral",
    nextLabel: "Entendido",
    showSkip: false,
  },
];

interface ViewerTourProps {
  currentStep: number;
  refs: ViewerTourRefs;
  onAdvance: () => void;
  onSkip: () => void;
  onSwitchTab?: (tabId: string) => void;
}

export function ViewerTour({
  currentStep,
  refs,
  onAdvance,
  onSkip,
  onSwitchTab,
}: ViewerTourProps) {
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
    }, 120);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentStep, isVisible, onSwitchTab, refs, step]);

  if (!isVisible || !step) return null;

  return (
    <SpotlightOverlay
      visible={isVisible}
      targetLayout={targetLayout}
      title={step.title}
      body={step.body}
      stepLabel={step.stepLabel}
      onNext={onAdvance}
      onSkip={onSkip}
      nextLabel={step.nextLabel}
      showSkip={step.showSkip}
    />
  );
}

export const VIEWER_TOUR_TOTAL_STEPS = STEPS.length;
