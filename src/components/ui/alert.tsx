import type { ReactNode } from "react";

type Tone = "error" | "warning" | "info";

const TONES: Record<Tone, string> = {
  error: "border-danger/40 bg-danger-soft text-danger",
  warning: "border-warning/40 bg-warning-soft text-warning",
  info: "border-edge bg-surface-muted text-foreground-muted",
};

type AlertProps = {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  /**
   * Announce the content when it appears. Used for server errors and conflicts, which
   * arrive without the user doing anything that would move focus.
   */
  live?: "polite" | "assertive";
  className?: string;
};

export function Alert({ tone = "info", title, children, live, className = "" }: AlertProps) {
  return (
    <div
      role={tone === "info" ? "status" : "alert"}
      aria-live={live}
      className={`rounded-lg border px-3 py-2.5 text-sm ${TONES[tone]} ${className}`}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : ""}>{children}</div> : null}
    </div>
  );
}
