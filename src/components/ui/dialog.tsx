"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Radix supplies the parts that are easy to get wrong by hand: the focus trap, Escape
 * handling, `aria-modal`, and returning focus to whatever opened the dialog.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** False while a request is in flight, so a submission cannot be abandoned halfway. */
  dismissible?: boolean;
}) {
  // The dialog is mounted only while it is open, so it is gone by the time Radix would
  // hand focus back to whatever opened it. Without this a keyboard user is dropped at the
  // top of the document and has to tab all the way back to the slot they came from.
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    return () => {
      const opener = openerRef.current;
      // The opener may have been replaced by the booking that was just made.
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  const blockWhileBusy = (event: Event | KeyboardEvent) => {
    if (!dismissible) event.preventDefault();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <DialogPrimitive.Content
          onEscapeKeyDown={blockWhileBusy}
          onInteractOutside={blockWhileBusy}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-edge bg-surface p-5 shadow-xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-foreground-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              disabled={!dismissible}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-foreground-muted hover:bg-surface-muted disabled:opacity-40"
            >
              <span aria-hidden="true">&times;</span>
            </DialogPrimitive.Close>
          </div>
          <div className="mt-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
