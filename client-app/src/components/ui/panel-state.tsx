import { AlertTriangle, DatabaseZap, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({ message = "No data available." }: { message?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-ink-faint">
      <DatabaseZap className="size-5" />
      <span>{message}</span>
    </div>
  );
}

export function ErrorState({ onRetry, message = "Dashboard data could not be loaded." }: { onRetry: () => void; message?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex size-10 items-center justify-center rounded-full border border-danger/25 bg-danger/10 text-danger">
        <AlertTriangle className="size-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">Unable to load monitor</p>
        <p className="mt-1 text-xs text-ink-dim">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw className="size-3.5" /> Retry
      </Button>
    </div>
  );
}
