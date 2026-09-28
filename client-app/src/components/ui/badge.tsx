import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral";

const toneClass: Record<BadgeTone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  danger: "border-danger/25 bg-danger/10 text-danger",
  warning: "border-warning/25 bg-warning/10 text-warning",
  info: "border-info/25 bg-info/10 text-info",
  neutral: "border-line-strong bg-elevated text-ink-dim",
};

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
