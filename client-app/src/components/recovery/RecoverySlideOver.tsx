import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface RecoverySlideOverProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  iconTone?: "danger" | "info";
  children: ReactNode;
  footer?: ReactNode | ((requestClose: () => void) => ReactNode);
  onClose: () => void;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function RecoverySlideOver({ title, subtitle, icon, iconTone = "danger", children, footer, onClose }: RecoverySlideOverProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const [visible, setVisible] = useState(false);

  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      setVisible(true);
      panelRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });

    function requestClose() {
      if (closingRef.current) return;
      closingRef.current = true;
      setVisible(false);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), reduceMotion ? 0 : 260);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), reduceMotion ? 0 : 260);
  }

  const content = (
    <div
      className={`fixed inset-0 z-[60] flex justify-end bg-black/65 backdrop-blur-[2px] transition-opacity duration-[250ms] motion-reduce:duration-0 ${visible ? "opacity-100" : "opacity-0"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        ref={panelRef}
        className={`flex h-full w-full max-w-4xl flex-col border-l border-line-strong bg-panel shadow-2xl transition-transform duration-[250ms] ease-out motion-reduce:duration-0 ${visible ? "translate-x-0" : "translate-x-full"} sm:my-3 sm:mr-3 sm:h-[calc(100%-1.5rem)] sm:rounded-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconTone === "danger" ? "bg-danger/10 text-danger" : "bg-info/10 text-info"}`}>{icon}</span>}
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold leading-tight tracking-tight text-ink sm:text-xl">{title}</h2>
              {subtitle && <div className="mt-1 text-sm text-ink-dim">{subtitle}</div>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={requestClose} aria-label="Close details" title="Close details">
            <X className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 text-sm sm:px-6">{children}</div>
        {footer && <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-ground px-5 py-3 sm:px-6">{typeof footer === "function" ? footer(requestClose) : footer}</footer>}
      </section>
    </div>
  );

  return createPortal(content, document.body);
}
