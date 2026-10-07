"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 border border-transparent",
  secondary:
    "bg-surface text-foreground border border-edge-strong hover:bg-surface-muted disabled:opacity-50",
  ghost:
    "bg-transparent text-foreground-muted border border-transparent hover:bg-surface-muted hover:text-foreground disabled:opacity-50",
  danger:
    "bg-transparent text-danger border border-edge-strong hover:bg-danger-soft disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  // 44px tall, so it is a comfortable touch target on a phone.
  md: "min-h-11 px-4 text-sm",
  sm: "min-h-9 px-3 text-sm",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner, disables the button, and sets `aria-busy`. */
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // Always an explicit type: a bare button inside a form submits it.
      type={props.type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-opacity disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
