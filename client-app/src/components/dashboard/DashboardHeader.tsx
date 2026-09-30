import { LogOut, RotateCw, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatTime } from "@/lib/utils";

interface DashboardHeaderProps {
  tenant: string;
  organization: string;
  updatedAt: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ tenant, organization, updatedAt, isRefreshing, onRefresh }: DashboardHeaderProps) {
  const { session, logout } = useAuth();
  const avatarLabel = getInitials(session?.user.displayName);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur-xl">
      <div className="flex min-h-16 items-center gap-3 px-3 lg:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-ground p-1.5 shadow-inner">
            <img src="/logo-ag-new.png" alt="AuditChain" className="size-full object-contain" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold tracking-tight text-ink">
              Audit<span className="text-brand-bright">Chain</span> Client Portal
            </div>
            <div className="truncate text-[9px] uppercase tracking-[0.14em] text-ink-faint">Integrity monitoring</div>
          </div>
        </div>

        <div className="hidden h-7 w-px bg-line-strong sm:block" />
        <div className="hidden min-w-0 sm:block">
          <div className="truncate font-mono text-[12px] font-semibold text-ink">{tenant}</div>
          <div className="truncate text-[10px] text-ink-faint">{organization}</div>
        </div>

        <nav className="ml-auto hidden items-center gap-1 rounded-xl border border-line bg-ground p-1 sm:flex" aria-label="Client portal sections">
          <PortalNavLink to="/monitor">Monitor</PortalNavLink>
          <PortalNavLink to="/recovery">Recovery</PortalNavLink>
        </nav>

        <div className="flex items-center gap-1.5">
          <div className="mr-1 hidden text-right leading-tight md:block">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
              Updated <span className="font-semibold text-ink-dim">{formatTime(updatedAt)}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[9px] uppercase tracking-[0.09em] text-ink-faint">
              <span className="size-1.5 rounded-full bg-success" /> Live sync
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh dashboard">
            <RotateCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
            <span className="hidden lg:inline">Refresh</span>
          </Button>

          <div className="mx-1 hidden h-7 w-px bg-line sm:block" />
          <div className="hidden items-center gap-2 sm:flex">
            <div className="text-right leading-tight">
              <div className="text-[11px] font-semibold text-ink">{session?.user.displayName}</div>
              <div className="text-[9px] text-ink-faint">{session?.user.role}</div>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">{avatarLabel}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto border-t border-line px-3 py-1.5 text-[9px] uppercase tracking-[0.12em] text-ink-faint sm:hidden">
        <div className="flex shrink-0 items-center gap-1.5"><ShieldCheck className="size-3 text-success" /> {tenant} · Updated {formatTime(updatedAt)}</div>
        <div className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-line bg-ground p-0.5 normal-case tracking-normal">
          <PortalNavLink to="/monitor" compact>Monitor</PortalNavLink>
          <PortalNavLink to="/recovery" compact>Recovery</PortalNavLink>
        </div>
      </div>
    </header>
  );
}

function getInitials(displayName?: string) {
  const initials = displayName
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "AC";
}

function PortalNavLink({ to, children, compact = false }: { to: string; children: ReactNode; compact?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        "rounded-lg px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors",
        compact && "px-2 py-1 text-[9px]",
        isActive ? "bg-navy-bright/25 text-ink" : "text-ink-dim hover:bg-elevated hover:text-ink",
      )}
    >
      {children}
    </NavLink>
  );
}
