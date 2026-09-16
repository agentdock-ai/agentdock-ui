import { cn } from "../ui/class-names.js";

export interface AgentChatHeaderProps {
  title: string;
  subtitle: string;
  status: string;
  busy: boolean;
  error: boolean;
  className?: string;
  avatarClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  statusClassName?: string;
}

export function AgentChatHeader({
  title,
  subtitle,
  status,
  busy,
  error,
  className,
  avatarClassName,
  contentClassName,
  titleClassName,
  subtitleClassName,
  statusClassName,
}: AgentChatHeaderProps) {
  return (
    <header className={cn("ad-chat-header", className)} data-slot="chat-header">
      <div className={cn("ad-avatar", avatarClassName)} aria-hidden="true">A</div>
      <div className={cn("ad-chat-heading", contentClassName)}>
        <strong className={titleClassName}>{title}</strong>
        <span className={subtitleClassName}>{subtitle}</span>
      </div>
      <span className={cn("ad-status ad-status-" + (error ? "error" : busy ? "busy" : "ready"), statusClassName)}>
        <i />{status}
      </span>
    </header>
  );
}
