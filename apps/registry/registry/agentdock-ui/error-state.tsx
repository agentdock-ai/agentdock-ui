import { CircleAlert } from "lucide-react";
import { ChatIcon } from "./icon.js";
import { errorDetail } from "./utils.js";
export function ErrorState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div
      role="alert"
      className="flex min-w-0 items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-[13px] leading-5"
    >
      <ChatIcon
        icon={CircleAlert}
        size={16}
        aria-hidden="true"
        className="mt-0.5 text-destructive"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-destructive">{title}</p>
        {detail !== title && (
          <p className="mt-0.5 text-muted-foreground [overflow-wrap:anywhere]">
            {errorDetail(detail)}
          </p>
        )}
      </div>
    </div>
  );
}
