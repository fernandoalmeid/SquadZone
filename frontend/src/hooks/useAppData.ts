import { useOutletContext } from "react-router-dom";
import type { ServerSummary } from "../types/app.ts";

export interface AppOutletContext {
  servers: ServerSummary[];
  refreshServers: () => Promise<void>;
}

export function useAppData() {
  return useOutletContext<AppOutletContext>();
}
