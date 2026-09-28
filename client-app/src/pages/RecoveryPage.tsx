import { Camera, Database, History } from "lucide-react";
import { useState } from "react";

import { ActiveIncidents } from "@/components/recovery/ActiveIncidents";
import { RecoveryDrawer } from "@/components/recovery/RecoveryDrawer";
import { RecoveryHistory } from "@/components/recovery/RecoveryHistory";
import { SnapshotsGrid } from "@/components/recovery/SnapshotsGrid";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/panel-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecoveryData, useRecoveryRefresh } from "@/hooks/useRecovery";
import { cn } from "@/lib/utils";

type RecoveryTab = "incidents" | "history" | "snapshots";
const tabs: Array<{ id: RecoveryTab; label: string; icon: typeof Database }> = [
  { id: "incidents", label: "Active Incidents", icon: Database },
  { id: "history", label: "Recovery History", icon: History },
  { id: "snapshots", label: "Snapshots", icon: Camera },
];

export function RecoveryPage() {
  const [tab, setTab] = useState<RecoveryTab>("incidents");
  const [drawerIds, setDrawerIds] = useState<string[] | null>(null);
  const recovery = useRecoveryData();
  const refresh = useRecoveryRefresh();

  if (recovery.isInitialLoading) return <RecoverySkeleton />;
  if (recovery.isError || !recovery.incidents.data || !recovery.history.data || !recovery.snapshots.data) return <ErrorState onRetry={() => void refresh()} />;

  return (
    <main className="space-y-3 px-3 pb-8 pt-5 lg:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[27px] font-semibold tracking-tight text-ink">Recovery Workspace</h1>
          <p className="mt-1 text-xs text-ink-dim">Review tampered or missing records and their last trusted snapshot.</p>
        </div>
        <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-line bg-panel p-1 sm:w-auto" role="tablist" aria-label="Recovery sections">
          {tabs.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" size="sm" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("shrink-0", tab === id && "bg-navy-bright/25 text-ink") }><Icon className="size-3.5" /> {label}</Button>)}
        </div>
      </div>

      {tab === "incidents" && <ActiveIncidents data={recovery.incidents.data} onPrepare={setDrawerIds} />}
      {tab === "history" && <RecoveryHistory data={recovery.history.data} />}
      {tab === "snapshots" && <SnapshotsGrid data={recovery.snapshots.data} />}
      {drawerIds && <RecoveryDrawer ids={drawerIds} onClose={() => setDrawerIds(null)} />}
    </main>
  );
}

function RecoverySkeleton() {
  return <main className="space-y-3 px-3 pb-8 pt-5 lg:px-4"><div className="flex items-end justify-between gap-3"><div><Skeleton className="h-8 w-56" /><Skeleton className="mt-2 h-3 w-80" /></div><Skeleton className="h-10 w-80" /></div><Skeleton className="h-[330px] w-full" /></main>;
}
