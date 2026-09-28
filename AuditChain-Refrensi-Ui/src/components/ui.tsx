import type { ReactNode } from "react";
import markUrl from "../assets/auditchain-mark.png";
import iconUrl from "../assets/auditchain-icon.png";

export function LogoIcon({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={iconUrl}
      alt="AuditChain"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", borderRadius: size * 0.22 }}
    />
  );
}

export function LogoLockup({ width = 200 }: { width?: number }) {
  return <img src={markUrl} alt="AuditChain Gateway" style={{ width, height: "auto", display: "block" }} />;
}

export function Panel({
  title,
  right,
  children,
  className = "",
  bodyClassName = "",
  scroll = false,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  scroll?: boolean;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-panel)] ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-hairline)] px-3.5 py-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-dim)]">
            {title}
          </h2>
          {right}
        </header>
      )}
      <div className={`min-h-0 flex-1 ${scroll ? "overflow-y-auto" : ""} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Delta({ pct }: { pct: number }) {
  if (pct === 0) return <span className="tnum text-[var(--color-ink-faint)]">—</span>;
  const up = pct > 0;
  return (
    <span className="tnum" style={{ color: up ? "var(--color-up)" : "var(--color-down)" }}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function Pill({
  children,
  color,
  subtle = true,
}: {
  children: ReactNode;
  color: string;
  subtle?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center rounded-[5px] px-1.5 py-[2px] text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={
        subtle
          ? { color, backgroundColor: colorMix(color, 0.14), border: `1px solid ${colorMix(color, 0.28)}` }
          : { color: "#04121e", backgroundColor: color }
      }
    >
      {children}
    </span>
  );
}

export function colorMix(varColor: string, alpha: number): string {
  return `color-mix(in srgb, ${varColor} ${Math.round(alpha * 100)}%, transparent)`;
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-[8px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy-bright)]";
  const sizes = size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-2 text-[12px]";
  const variants: Record<string, string> = {
    primary: "bg-[var(--color-brand-green)] text-[#04121e] hover:bg-[var(--color-brand-green-bright)]",
    danger: "bg-[var(--color-down)] text-white hover:brightness-110",
    outline:
      "border border-[var(--color-hairline-strong)] text-[var(--color-ink)] hover:bg-[var(--color-elevated)]",
    ghost: "text-[var(--color-ink-dim)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-ink)]",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
