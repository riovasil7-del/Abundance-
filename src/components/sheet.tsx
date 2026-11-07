"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cycleFocusIndex } from "@/lib/focus-trap";

const FOCUSABLE = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
    if (element.hasAttribute("disabled")) return false;
    if (element.getAttribute("aria-hidden") === "true") return false;
    return true;
  });
}

/** Traps Tab, closes on Escape, and returns focus. The page behind is marked inert. */
export function useDialogA11y(container: React.RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sky = document.querySelector(".sky");
    sky?.setAttribute("inert", "");
    const root = container.current;
    focusableIn(root ?? document.body)[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const items = focusableIn(root);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = cycleFocusIndex(index, items.length, event.shiftKey);
      event.preventDefault();
      items[next]?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      sky?.removeAttribute("inert");
      opener?.focus();
    };
  }, [active, container]);
}

export function Sheet({
  title,
  onClose,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(ref, onClose);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="sheet-back" onClick={onClose}>
      <div
        ref={ref}
        className={className ? `sheet ${className}` : "sheet"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
