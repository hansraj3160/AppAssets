import { createContext, useContext } from "react";

export interface StudioActions {
  refresh: () => Promise<void>;
  toast: (message: string) => void;
}

export const StudioActionsContext = createContext<StudioActions | null>(null);

export function useStudioActions(): StudioActions | null {
  return useContext(StudioActionsContext);
}
