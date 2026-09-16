import {
  forwardRef,
  type ButtonHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./class-names.js";

export const NativeButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function NativeButton({ className, ...props }, ref) {
  return (
    <button
      {...props}
      ref={ref}
      data-slot="button"
      className={cn("ad-ui-button", className)}
    />
  );
});

export const NativeTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function NativeTextarea({ className, ...props }, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      data-slot="textarea"
      className={cn("ad-ui-textarea", className)}
    />
  );
});
