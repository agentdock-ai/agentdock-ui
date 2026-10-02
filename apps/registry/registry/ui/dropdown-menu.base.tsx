"use client";
import type { ComponentProps } from "react";
import { Menu as Primitive } from "@base-ui/react/menu";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuItem = Primitive.Item;
export function DropdownMenuContent(
  props: ComponentProps<typeof Primitive.Popup>,
) {
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="z-50"
      >
        <Primitive.Popup {...props} />
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
