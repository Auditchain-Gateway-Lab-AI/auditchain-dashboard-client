import { ChevronRight, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditIssue } from "@/types/dashboard";

export function NeedsAttention({ data }: { data: AuditIssue[] }) {
  const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null);

  return (
    <>
      <Card className="h-full overflow-hidden">
        <CardHeader>
          <CardTitle>Needs Attention</CardTitle>
          <span className="font-mono text-[9px] font-semibold text-danger">{data.length} open</span>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-xs text-ink-dim">
              <ShieldCheck className="size-5 text-success" /> No open incidents.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {data.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => setSelectedIssue(issue)}
                  className="group flex w-full items-start gap-2 px-3.5 py-3 text-left transition-colors hover:bg-elevated/60"
                >
                  <span className={`mt-1 size-1.5 shrink-0 rounded-full ${issue.status === "TAMPERED" ? "bg-danger" : "bg-warning"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-ink">{issue.table}:{issue.record}</span>
                      <Badge tone={issue.status === "TAMPERED" ? "danger" : "warning"}>{issue.status}</Badge>
                    </span>
                    <span className="mt-1 block text-[10px] leading-snug text-ink-dim">{issue.description}</span>
                    <span className="mt-1.5 block text-[8px] uppercase tracking-[0.08em] text-ink-faint">{issue.detectedAt} · ACTOR {issue.actor}</span>
                  </span>
                  <ChevronRight className="mt-1 size-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {selectedIssue && <IssueDialog issue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
    </>
  );
}

function IssueDialog({ issue, onClose }: { issue: AuditIssue; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="issue-title">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-label="Close incident detail" />
      <div className="relative w-full max-w-md rounded-xl border border-line-strong bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="text-[9px] uppercase tracking-[0.12em] text-ink-faint">Incident detail</div>
            <h2 id="issue-title" className="mt-1 font-mono text-base font-semibold text-ink">{issue.table}:{issue.record}</h2>
          </div>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="space-y-px bg-line">
          <DetailRow label="Status"><Badge tone={issue.status === "TAMPERED" ? "danger" : "warning"}>{issue.status}</Badge></DetailRow>
          <DetailRow label="Detected">{issue.detectedAt}</DetailRow>
          <DetailRow label="Actor">{issue.actor}</DetailRow>
        </div>
        <div className="px-5 py-4">
          <div className="text-[9px] uppercase tracking-[0.1em] text-ink-faint">Evidence note</div>
          <p className="mt-2 text-xs leading-relaxed text-ink-dim">{issue.description}</p>
          <p className="mt-4 rounded-lg border border-line bg-ground px-3 py-2.5 text-[10px] leading-relaxed text-ink-faint">
            Read-only monitoring view. No recovery action is available in this client dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-panel px-5 py-3">
      <span className="text-[9px] uppercase tracking-[0.1em] text-ink-faint">{label}</span>
      <span className="font-mono text-[10px] font-semibold text-ink">{children}</span>
    </div>
  );
}
