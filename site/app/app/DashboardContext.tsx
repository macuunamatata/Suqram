"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

const DashboardContext = createContext<{ user: User | null }>({ user: null });

export function DashboardProvider({
  user,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  return (
    <DashboardContext.Provider value={{ user }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardUser() {
  return useContext(DashboardContext).user;
}
