import type { ComponentPropsWithRef } from "react";

/**
 * A native select on purpose: it is keyboard-accessible, announced correctly, and uses the
 * platform's own picker on a phone. A custom listbox would be more code and less reliable.
 *
 * Typed with `ComponentPropsWithRef` so react-hook-form can attach its ref — in React 19 a
 * function component takes `ref` as an ordinary prop.
 */
export function Select({
  invalid,
  className = "",
  ...props
}: ComponentPropsWithRef<"select"> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={`min-h-11 rounded-lg border bg-surface px-3 text-sm text-foreground ${
        invalid ? "border-danger" : "border-edge-strong"
      } ${className}`}
      {...props}
    />
  );
}
