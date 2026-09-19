import { useSyncExternalStore } from "react";
import { useAgentStore } from "./agent-provider.js";

export function useAgentState() {
  const store = useAgentStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
