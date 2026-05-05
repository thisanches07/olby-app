import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  onboardingStorage,
  type ManagerTourState,
  type OnboardingRole,
} from "@/utils/onboarding.storage";

export const MANAGER_TOUR_TOTAL_STEPS = 8; // steps 0..7

interface OnboardingContextValue {
  isReady: boolean;

  // Role selection
  role: OnboardingRole | null;
  isRoleSelected: boolean;
  selectRole: (role: OnboardingRole) => Promise<void>;
  dismissRolePicker: () => Promise<void>;

  // Manager tour  (step -1 = not started, 0-5 = active, 99 = done)
  managerTourStep: number;
  managerTourCompleted: boolean;
  startManagerTour: () => Promise<void>;
  advanceManagerTour: () => Promise<void>;
  skipManagerTour: () => Promise<void>;

  // Viewer tour
  isViewerTourDone: boolean;
  completeViewerTour: () => Promise<void>;

  // Dev
  resetTours: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [isReady, setIsReady] = useState(false);
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [isRoleSelected, setIsRoleSelected] = useState(false);
  const [managerTourStep, setManagerTourStep] = useState(-1);
  const [managerTourCompleted, setManagerTourCompleted] = useState(false);
  const [isViewerTourDone, setIsViewerTourDone] = useState(false);

  // Load state whenever the UID changes (login / logout / account switch)
  useEffect(() => {
    if (!uid) {
      setIsReady(false);
      setRole(null);
      setIsRoleSelected(false);
      setManagerTourStep(-1);
      setManagerTourCompleted(false);
      setIsViewerTourDone(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const [selected, savedRole, managerTour, viewerDone] = await Promise.all([
        onboardingStorage.isRoleSelected(uid!),
        onboardingStorage.getRole(uid!),
        onboardingStorage.getManagerTour(uid!),
        onboardingStorage.isViewerTourDone(uid!),
      ]);

      if (cancelled) return;

      setIsRoleSelected(selected);
      setRole(savedRole);
      setManagerTourStep(
        managerTour?.completed ? 99 : managerTour?.lastStep ?? -1,
      );
      setManagerTourCompleted(managerTour?.completed ?? false);
      setIsViewerTourDone(viewerDone);
      setIsReady(true);
    }

    setIsReady(false);
    load();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const selectRole = useCallback(
    async (r: OnboardingRole) => {
      if (!uid) return;
      await Promise.all([
        onboardingStorage.setRole(uid, r),
        onboardingStorage.setRoleSelected(uid),
      ]);
      setRole(r);
      setIsRoleSelected(true);
    },
    [uid],
  );

  const dismissRolePicker = useCallback(async () => {
    if (!uid) return;
    await onboardingStorage.setRoleSelected(uid);
    setIsRoleSelected(true);
  }, [uid]);

  const startManagerTour = useCallback(async () => {
    if (!uid) return;
    const state: ManagerTourState = { completed: false, lastStep: 0 };
    await onboardingStorage.setManagerTour(uid, state);
    setManagerTourStep(0);
    setManagerTourCompleted(false);
  }, [uid]);

  const advanceManagerTour = useCallback(async () => {
    if (!uid) return;
    setManagerTourStep((prev) => {
      const next = prev + 1;
      const completed = next >= MANAGER_TOUR_TOTAL_STEPS;
      const state: ManagerTourState = {
        completed,
        lastStep: completed ? 99 : next,
      };
      onboardingStorage.setManagerTour(uid, state);
      if (completed) setManagerTourCompleted(true);
      return completed ? 99 : next;
    });
  }, [uid]);

  const skipManagerTour = useCallback(async () => {
    if (!uid) return;
    await onboardingStorage.setManagerTour(uid, { completed: true, lastStep: 99 });
    setManagerTourStep(99);
    setManagerTourCompleted(true);
  }, [uid]);

  const completeViewerTour = useCallback(async () => {
    if (!uid) return;
    await onboardingStorage.setViewerTourDone(uid);
    setIsViewerTourDone(true);
  }, [uid]);

  const resetTours = useCallback(async () => {
    if (!uid) return;
    await onboardingStorage.clearTours(uid);
    setManagerTourStep(-1);
    setManagerTourCompleted(false);
    setIsViewerTourDone(false);
  }, [uid]);

  const resetOnboarding = useCallback(async () => {
    if (!uid) return;
    await onboardingStorage.clearAll(uid);
    setRole(null);
    setIsRoleSelected(false);
    setManagerTourStep(-1);
    setManagerTourCompleted(false);
    setIsViewerTourDone(false);
  }, [uid]);

  return (
    <OnboardingContext.Provider
      value={{
        isReady,
        role,
        isRoleSelected,
        selectRole,
        dismissRolePicker,
        managerTourStep,
        managerTourCompleted,
        startManagerTour,
        advanceManagerTour,
        skipManagerTour,
        isViewerTourDone,
        completeViewerTour,
        resetTours,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}
