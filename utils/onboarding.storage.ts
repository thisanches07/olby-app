import AsyncStorage from "@react-native-async-storage/async-storage";

export type OnboardingRole = "manager" | "viewer";

export interface ManagerTourState {
  completed: boolean;
  lastStep: number;
}

function key(name: string, uid: string): string {
  return `@obra:onboarding:${name}:${uid}`;
}

export const onboardingStorage = {
  isRoleSelected: async (uid: string): Promise<boolean> => {
    try {
      return (await AsyncStorage.getItem(key("role_selected", uid))) === "true";
    } catch {
      return false;
    }
  },

  setRoleSelected: (uid: string): Promise<void> =>
    AsyncStorage.setItem(key("role_selected", uid), "true"),

  getRole: async (uid: string): Promise<OnboardingRole | null> => {
    try {
      const v = await AsyncStorage.getItem(key("role", uid));
      return v === "manager" || v === "viewer" ? v : null;
    } catch {
      return null;
    }
  },

  setRole: (uid: string, role: OnboardingRole): Promise<void> =>
    AsyncStorage.setItem(key("role", uid), role),

  getManagerTour: async (uid: string): Promise<ManagerTourState | null> => {
    try {
      const raw = await AsyncStorage.getItem(key("manager_tour", uid));
      return raw ? (JSON.parse(raw) as ManagerTourState) : null;
    } catch {
      return null;
    }
  },

  setManagerTour: (uid: string, state: ManagerTourState): Promise<void> =>
    AsyncStorage.setItem(key("manager_tour", uid), JSON.stringify(state)),

  isViewerTourDone: async (uid: string): Promise<boolean> => {
    try {
      return (await AsyncStorage.getItem(key("viewer_tour", uid))) === "true";
    } catch {
      return false;
    }
  },

  setViewerTourDone: (uid: string): Promise<void> =>
    AsyncStorage.setItem(key("viewer_tour", uid), "true"),

  clearTours: async (uid: string): Promise<void> => {
    await Promise.all([
      AsyncStorage.removeItem(key("manager_tour", uid)),
      AsyncStorage.removeItem(key("viewer_tour", uid)),
    ]);
  },

  clearAll: async (uid: string): Promise<void> => {
    await Promise.all([
      AsyncStorage.removeItem(key("role_selected", uid)),
      AsyncStorage.removeItem(key("role", uid)),
      AsyncStorage.removeItem(key("manager_tour", uid)),
      AsyncStorage.removeItem(key("viewer_tour", uid)),
    ]);
  },
};
