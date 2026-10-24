import { ArrowDown } from "lucide-react";
import { ChatIcon } from "./icon.js";
import { Button } from "../ui/button.js";
export function ScrollToLatest({
  onClick,
  visible = true,
}: {
  onClick: () => void;
  visible?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`absolute bottom-4 left-1/2 z-20 size-9 -translate-x-1/2 text-muted-foreground shadow-lg shadow-black/5 transition-[opacity,transform,background-color,color,box-shadow] duration-200 ease-out hover:scale-[1.04] hover:text-foreground active:scale-[0.96] motion-reduce:transition-none ${visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-2 scale-95 opacity-0"}`}
      aria-label="Scroll to latest message"
    >
      <ChatIcon icon={ArrowDown} aria-hidden="true" size={16} />
      <span className="sr-only">Latest</span>
    </Button>
  );
}
