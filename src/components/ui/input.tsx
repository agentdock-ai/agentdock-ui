import {
  forwardRef,
  type InputHTMLAttributes,
} from "react";
import { cn } from "./class-names.js";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        data-slot="input"
        className={cn("ad-ui-input", className)}
      />
    );
  },
);
