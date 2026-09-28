import { Camera, CheckCircle2, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/panel-state";
import { cn } from "@/lib/utils";
import type { RecoverySnapshot } from "@/types/recovery";

export function SnapshotsGrid({ data }: { data: RecoverySnapshot[] }) {
  return data.length === 0 ? <EmptyState message="No trusted snapshots found." /> : (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map((snapshot) => {
        const available = snapshot.status === "AVAILABLE";
        return (
          <Card key={snapshot.resource} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn("flex size-8 items-center justify-center rounded-lg", available ? "bg-success/10 text-success" : "bg-elevated text-ink-faint")}>
                    {available ? <CheckCircle2 className="size-4" /> : <Camera className="size-4" />}
                  </div>
                  <span className="font-mono text-sm font-semibold text-ink">{snapshot.resource}</span>
                </div>
                <Badge tone={available ? "success" : "neutral"}>{available ? "Trusted" : "None"}</Badge>
              </div>
              <dl className="mt-4 space-y-2 text-[11px]">
                <Line icon={<Database className="size-3" />} label="Table" value={snapshot.table} />
                <Line label="Captured" value={snapshot.capturedAt} />
                <Line label="Evidence anchor" value={snapshot.anchor} mono />
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Line({ label, value, mono, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><dt className="flex items-center gap-1.5 text-ink-faint">{icon}{label}</dt><dd className={cn("text-right text-ink-dim", mono && "font-mono")}>{value}</dd></div>;
}
