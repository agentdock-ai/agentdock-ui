import type { CSSProperties, ReactNode } from "react";
import { cn } from "./class-names.js";

export type AgentDockThemeMode = "light" | "dark" | "system";

export interface AgentDockThemeTokens {
  background: string;
  foreground: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  primary: string;
  primaryForeground: string;
  mutedForeground: string;
  userMessage: string;
  userMessageForeground: string;
  toolSurface: string;
  error: string;
}

export const defaultAgentDockTheme: AgentDockThemeTokens = {
  background: "#ffffff",
  foreground: "#262833",
  surface: "#ffffff",
  surfaceMuted: "#f7f7fa",
  border: "#e5e7ee",
  primary: "#6e5de4",
  primaryForeground: "#ffffff",
  mutedForeground: "#8a8c96",
  userMessage: "#f1efff",
  userMessageForeground: "#38334f",
  toolSurface: "#fbfaff",
  error: "#bb5157",
};

export const darkAgentDockTheme: AgentDockThemeTokens = {
  background: "#111217",
  foreground: "#f4f4f5",
  surface: "#18191f",
  surfaceMuted: "#22232b",
  border: "#30313a",
  primary: "#9b8cff",
  primaryForeground: "#17151f",
  mutedForeground: "#a2a4b0",
  userMessage: "#302b52",
  userMessageForeground: "#f2efff",
  toolSurface: "#211f2c",
  error: "#ff8d94",
};

export interface AgentDockThemeConfig {
  mode?: AgentDockThemeMode;
  tokens?: Partial<AgentDockThemeTokens>;
}

const tokenVariables: Record<keyof AgentDockThemeTokens, string> = {
  background: "--ad-background",
  foreground: "--ad-foreground",
  surface: "--ad-surface",
  surfaceMuted: "--ad-surface-muted",
  border: "--ad-border",
  primary: "--ad-primary",
  primaryForeground: "--ad-primary-foreground",
  mutedForeground: "--ad-muted-foreground",
  userMessage: "--ad-user-message",
  userMessageForeground: "--ad-user-message-foreground",
  toolSurface: "--ad-tool-surface",
  error: "--ad-error",
};

export function agentDockThemeStyle(
  config: AgentDockThemeConfig = {},
): CSSProperties {
  const base = config.mode === "dark" ? darkAgentDockTheme : defaultAgentDockTheme;
  const tokens = { ...base, ...config.tokens };
  const style: Record<string, string> = {};
  for (const key of Object.keys(tokenVariables) as Array<keyof AgentDockThemeTokens>) {
    if (config.mode === "system" && config.tokens?.[key] === undefined) continue;
    style[tokenVariables[key]] = tokens[key];
  }
  return style as CSSProperties;
}

export interface AgentDockThemeProps extends AgentDockThemeConfig {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function AgentDockTheme({
  children,
  mode = "light",
  tokens,
  className,
  style,
}: AgentDockThemeProps) {
  return (
    <div
      data-agentdock-theme={mode}
      className={cn("ad-theme", className)}
      style={{ ...agentDockThemeStyle({ mode, tokens }), ...style }}
    >
      {children}
    </div>
  );
}
