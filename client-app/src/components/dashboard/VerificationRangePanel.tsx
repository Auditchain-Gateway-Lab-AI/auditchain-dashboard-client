import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useVerifyRange } from "@/hooks/useDashboard";
import { VerifyRangeLimitError } from "@/services/dashboard/api-dashboard.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import type { VerificationRangeInput, VerificationRangeResult } from "@/types/dashboard";

const metricTone = {
  total: { icon: Clock3, value: "text-info" },
  valid: { icon: ShieldCheck, value: "text-success" },
  invalid: { icon: ShieldAlert, value: "text-danger" },
  pending: { icon: Clock3, value: "text-warning" },
} as const;

export function VerificationRangePanel() {
  const { session } = useAuth();
  const verifyRange = useVerifyRange();
  const [from, setFrom] = useState(() => getDateInputValue(-6));
  const [to, setTo] = useState(() => getDateInputValue(0));
  const [result, setResult] = useState<VerificationRangeResult | null>(null);
  const [completedInputRange, setCompletedInputRange] = useState<VerificationRangeInput | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationMessage(null);

    if (!from || !to) {
      setValidationMessage("Select a start and end date.");
      return;
    }
    if (from > to) {
      setValidationMessage("The end date must be on or after the start date.");
      return;
    }

    const range = {
      from: toISOString(from, false),
      to: toISOString(to, true),
    };

    try {
      const nextResult = await verifyRange.mutateAsync({ token: session?.token, range });
      setResult(nextResult);
      setCompletedInputRange({ from, to });
    } catch (error) {
      setResult(null);
      setCompletedInputRange(null);
      if (error instanceof VerifyRangeLimitError) {
        setValidationMessage(`${error.message} ${formatNumber(error.estimatedItems)} logs found; limit ${formatNumber(error.syncLimit)}.`);
      } else {
        setValidationMessage(error instanceof Error ? error.message : "Range verification failed.");
      }
    }
  };

  const summary = result?.summary;
  const isPending = verifyRange.isPending;
  const status = isPending ? "Running" : result ? "Completed" : "Ready";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-wrap items-start">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-info/20 bg-info/10 text-info">
            <CalendarDays className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle>Range Verification</CardTitle>
            <p className="mt-1 text-[10px] text-ink-faint">All audit logs in the selected range</p>
          </div>
        </div>
        <Badge tone={isPending ? "info" : result ? "success" : "neutral"}>
          {isPending && <LoaderCircle className="size-3 animate-spin" />}
          {!isPending && result && <CheckCircle2 className="size-3" />}
          {status}
        </Badge>
      </CardHeader>

      <CardContent className="p-3.5">
        <form className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
          <label className="min-w-0">
            <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">From date</span>
            <input
              className="field-control h-9"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              disabled={isPending}
            />
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">To date</span>
            <input
              className="field-control h-9"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              disabled={isPending}
            />
          </label>
          <Button type="submit" className="h-9 md:min-w-36" disabled={isPending || !session?.token}>
            {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            {isPending ? "Verifying..." : "Verify Range"}
          </Button>
        </form>

        {validationMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[11px] text-danger" role="alert">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{validationMessage}</span>
          </div>
        )}

        {summary && (
          <div className="mt-4 border-t border-line pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Verification summary</span>
              {completedInputRange && <span className="font-mono text-[10px] text-ink-dim">{formatDateRange(completedInputRange)}</span>}
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
              <SummaryMetric label="Checked" value={summary.total} tone="total" />
              <SummaryMetric label="Valid" value={summary.valid} tone="valid" />
              <SummaryMetric label="Invalid" value={summary.invalid} tone="invalid" />
              <SummaryMetric label="Pending" value={summary.pending} tone="pending" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryMetric({ label, value, tone }: { label: string; value: number; tone: keyof typeof metricTone }) {
  const Icon = metricTone[tone].icon;
  return (
    <div className="min-w-0 bg-panel px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
        <Icon className={cn("size-3", metricTone[tone].value)} />
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("mt-1.5 font-mono text-lg font-semibold", metricTone[tone].value)}>{formatNumber(value)}</div>
    </div>
  );
}

function getDateInputValue(offsetDays: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return formatDateInputValue(date);
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toISOString(value: string, endOfDay: boolean) {
  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart ?? 0);
  const month = Number(monthPart ?? 0);
  const day = Number(dayPart ?? 0);
  const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.toISOString();
}

function formatDateRange(range: VerificationRangeInput) {
  const format = (value: string) => new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
  return `${format(range.from)} - ${format(range.to)}`;
}
