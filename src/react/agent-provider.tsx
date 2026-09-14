import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AgentStore } from "../core/agent-store.js";

const AgentStoreContext = createContext<AgentStore | null>(null);

export interface AgentProviderProps {
  children: ReactNode;
  /** Supply a store to control its lifetime outside React. */
  store?: AgentStore;
}

export function AgentProvider({ children, store }: AgentProviderProps) {
  const [ownedStore] = useState(() => store ?? new AgentStore());
  return (
    <AgentStoreContext.Provider value={store ?? ownedStore}>
      {children}
    </AgentStoreContext.Provider>
  );
}

export function useAgentStore(): AgentStore {
  const store = useContext(AgentStoreContext);
  if (!store) throw new Error("useAgentStore must be used inside AgentProvider.");
  return store;
}
