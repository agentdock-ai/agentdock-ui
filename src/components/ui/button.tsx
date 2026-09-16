import { Slot } from "@radix-ui/react-slot";
import {
  forwardRef,
  type ButtonHTMLAttributes,
} from "react";
import { cn } from "./class-names.js";

export type ButtonVariant = "primary" | "ghost" | "outline";
export type ButtonSize = "default" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(function Button(
  {
    asChild = false,
    variant = "primary",
    size = "default",
    className,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      {...props}
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(
        "ad-ui-button",
        "ad-ui-button-" + variant,
        "ad-ui-button-" + size,
        className,
      )}
    />
  );
});
