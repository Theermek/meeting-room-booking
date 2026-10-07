import { buildSlots } from "@/domain/time";

/** Mirrors the real timeline's shape, so the layout does not jump when data lands. */
export function TimelineSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      {buildSlots().map((slot) => (
        <div key={slot} className="flex items-center gap-2">
          <span className="w-12 text-xs text-foreground-muted/50">{slot}</span>
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}
