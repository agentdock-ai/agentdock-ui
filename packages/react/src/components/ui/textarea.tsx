import {
  forwardRef,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./class-names.js";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        {...props}
        ref={ref}
        data-slot="textarea"
        className={cn("ad-ui-textarea", className)}
      />
    );
  },
);
