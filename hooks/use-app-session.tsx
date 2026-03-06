import React, { createContext, useContext, useMemo, useState } from "react";

export type AppRole = "cliente" | "engenheiro";
export type AppDataState = "filled" | "empty" | "loading" | "error";

type AppSessionContextValue = {
  role: AppRole;
  setRole: (r: AppRole) => void;
  dataState: AppDataState;
  setDataState: (s: AppDataState) => void;
};

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export function AppSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<AppRole>("cliente");
  const [dataState, setDataState] = useState<AppDataState>("filled");

  const value = useMemo(
    () => ({ role, setRole, dataState, setDataState }),
    [role, dataState],
  );

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  const ctx = useContext(AppSessionContext);
  if (!ctx) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }
  return ctx;
}
