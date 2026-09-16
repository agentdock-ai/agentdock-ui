import { LoaderCircle } from "lucide-react";
import { cn } from "../ui/class-names.js";

export interface AgentTypingIndicatorProps {
  className?: string;
  label?: string;
}

export function AgentTypingIndicator({
  className,
  label = "Agent is working",
}: AgentTypingIndicatorProps) {
  return (
    <div className={cn("ad-typing", className)} data-slot="typing-indicator">
      <LoaderCircle aria-hidden="true" className="ad-icon-spin" /><span>{label}</span>
    </div>
  );
}
