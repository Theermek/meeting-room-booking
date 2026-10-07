import type { ComponentPropsWithRef } from "react";

export function Input({
  invalid,
  className = "",
  ...props
}: ComponentPropsWithRef<"input"> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={`min-h-11 rounded-lg border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted ${
        invalid ? "border-danger" : "border-edge-strong"
      } ${className}`}
      {...props}
    />
  );
}
