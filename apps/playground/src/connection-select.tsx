import { useRef, useState } from "react";
import { Select } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { ChatIcon } from "./components/agentdock-ui/icon";

export function ConnectionSelect({
  label,
  value,
  onValueChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { id: string; label: string }[];
  disabled?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement>();
  return (
    <label>
      {label}
      <Select.Root
        value={value}
        onValueChange={(next) => {
          // Ignore hidden form-control echoes and empty values as options change.
          if (next !== value && options.some((option) => option.id === next))
            onValueChange(next);
        }}
        disabled={disabled}
        onOpenChange={(open) => {
          // Keep the popup in the native modal's top layer and focus boundary.
          if (open)
            setContainer(trigger.current?.closest("dialog") ?? undefined);
        }}
      >
        <Select.Trigger
          ref={trigger}
          aria-label={label}
          className="flex h-9 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-2.5 text-left text-xs text-foreground outline-none hover:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span:first-child]:truncate"
        >
          <Select.Value />
          <Select.Icon asChild>
            <ChatIcon
              icon={ChevronDown}
              size={15}
              className="text-muted-foreground"
            />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal container={container}>
          <Select.Content
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 max-h-[min(18rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-md"
          >
            <Select.Viewport className="p-1">
              {options.map((option) => (
                <Select.Item
                  key={option.id}
                  value={option.id}
                  className="relative flex min-h-9 cursor-pointer items-center rounded-md py-2 pl-3 pr-9 text-xs outline-none data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute right-3 flex items-center">
                    <ChatIcon icon={Check} size={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}
