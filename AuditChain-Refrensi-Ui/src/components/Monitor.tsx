import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Flame,
  ShieldAlert,
  Trash2,
  X,
  FileSearch,
  LifeBuoy,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { Panel, Delta, Pill, Btn, colorMix } from "./ui";
import RecoveryDrawer from "./RecoveryDrawer";
import {
  TABLES,
  INCIDENTS,
  CLIENT,
  buildSeries,
  buildIntegritySeries,
  makeEvent,
  seedFeed,
  fmt,
  pct,
  levelColor,
  actionColor,
  statusColor,
  globalStats,
  type FeedEvent,
  type Period,
  type Metric,
  type Incident,
} from "../lib/data";

const PERIODS: Period[] = ["8H", "24H", "7D", "30D"];
const ACTIVITY_METRICS: Metric[] = ["Insert", "Update", "Delete"];
type ChartTab = "INTEGRITY" | "ACTIVITY";

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Monitor() {
  const [selected, setSelected] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("8H");
  const [chartTab, setChartTab] = useState<ChartTab>("INTEGRITY");
  const [metric, setMetric] = useState<Metric>("Update");
  const [feed, setFeed] = useState<FeedEvent[]>(() => seedFeed(10));
  const [updatedAt, setUpdatedAt] = useState<string>(() => nowHHMM());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [incident, setIncident] = useState<Incident | null>(null);
  const [recoverIds, setRecoverIds] = useState<string[] | null>(null);

  const g = globalStats();
  const sel = selected ? TABLES.find((t) => t.name === selected) ?? null : null;

  // Periodic refresh (not a continuous stream): pull the latest ~10 events every 60s.
  useEffect(() => {
    const iv = setInterval(() => refresh(), 60000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    setFeed(seedFeed(10));
    setUpdatedAt(nowHHMM());
  }

  const integritySeries = useMemo(() => buildIntegritySeries(period, selected), [period, selected]);
  const activitySeries = useMemo(() => buildSeries(period, selected), [period, selected]);
  const metricKey = metric.toLowerCase() as "insert" | "update" | "delete";

  const visibleFeed = (selected ? feed.filter((e) => e.table === selected) : feed).slice(0, 10);
  const relevantIncidents = selected ? INCIDENTS.filter((i) => i.table === selected) : INCIDENTS;

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3 px-3 pb-28 pt-3 lg:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-ink-faint)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-green-bright)]" />
          <span className="uppercase tracking-[0.1em]">
            Updated <span className="tnum font-semibold text-[var(--color-ink-dim)]">{updatedAt}</span>
          </span>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-[7px] border border-[var(--color-hairline)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ink-dim)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-ink)]"
        >
          <RotateCw size={12} /> Refresh
        </button>
      </div>

      <StatStrip g={g} sel={sel} selected={selected} onClear={() => setSelected(null)} />

      {/* Row: Watchlist · Integrity/Activity chart · Latest scan */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <Watchlist selected={selected} onSelect={setSelected} />
        </div>
        <div className="xl:col-span-4">
          <TrendPanel
            scope={selected}
            tab={chartTab}
            setTab={setChartTab}
            integritySeries={integritySeries}
            activitySeries={activitySeries}
            metric={metric}
            setMetric={setMetric}
            metricKey={metricKey}
            period={period}
            setPeriod={setPeriod}
          />
        </div>
        <div className="xl:col-span-3">
          <AuditStatus sel={sel} g={g} />
        </div>
      </div>

      {/* Row: Table insights · Recent activity · Needs attention */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <TableInsights onSelect={setSelected} selected={selected} />
        </div>
        <div className="xl:col-span-6">
          <RecentActivity events={visibleFeed} scope={selected} updatedAt={updatedAt} />
        </div>
        <div className="xl:col-span-3">
          <NeedsAttention
            incidents={relevantIncidents}
            picked={picked}
            onOpen={setIncident}
            onToggle={togglePick}
          />
        </div>
      </div>

      {incident && (
        <IncidentDrawer
          incident={incident}
          onClose={() => setIncident(null)}
          onPrepare={() => {
            setRecoverIds([incident.id]);
            setIncident(null);
          }}
        />
      )}

      {picked.size > 0 && (
        <SelectionBar
          ids={[...picked]}
          onClear={() => setPicked(new Set())}
          onPrepare={() => setRecoverIds([...picked])}
        />
      )}

      {recoverIds && (
        <RecoveryDrawer
          ids={recoverIds}
          onClose={() => {
            setRecoverIds(null);
            setPicked(new Set());
          }}
        />
      )}
    </div>
  );
}

/* ---------- Stat strip (integrity-first KPIs) ---------- */
type Kpi = {
  k: string;
  v: string;
  sub?: string;
  accent?: string;
  emphasis?: boolean;
  delta?: number;
};

function StatStrip({
  g,
  sel,
  selected,
  onClear,
}: {
  g: ReturnType<typeof globalStats>;
  sel: (typeof TABLES)[number] | null;
  selected: string | null;
  onClear: () => void;
}) {
  // Integrity is cumulative across all logged rows: everything is valid except tampered records.
  const total = sel ? sel.totalLogs : g.totalLogs;
  const tampered = sel ? sel.tampered : g.tampered;
  const valid = total - tampered;
  const today = sel ? sel.today : g.today;

  const stats: Kpi[] = [
    { k: "Total Logs", v: fmt(total) },
    { k: "Valid", v: fmt(valid), sub: pct(valid, total), accent: "var(--color-up)", emphasis: true },
    {
      k: "Tampered",
      v: fmt(tampered),
      sub: pct(tampered, total),
      accent: "var(--color-down)",
      emphasis: true,
    },
    { k: "Logs Today", v: fmt(today), delta: sel ? sel.deltaPct : 14.2 },
    { k: sel ? "Scope" : "Monitored Tables", v: sel ? sel.name : String(TABLES.length) },
    { k: "Last Scan", v: CLIENT.lastScan },
  ];

  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-panel)]">
      {selected && (
        <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] px-3.5 py-1.5 text-[11px]">
          <span className="font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-green-bright)]">
            Focused
          </span>
          <span className="tnum font-semibold text-[var(--color-ink)]">{selected}</span>
          <button
            onClick={onClear}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[var(--color-ink-dim)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-ink)]"
          >
            <X size={12} /> Clear focus
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-hairline)] sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {stats.map((s) => (
          <div
            key={s.k}
            className="px-4 py-3"
            style={
              s.emphasis
                ? { backgroundColor: colorMix(s.accent as string, 0.06) }
                : undefined
            }
          >
            <div
              className="text-[10px] uppercase tracking-[0.1em]"
              style={{ color: s.emphasis ? s.accent : "var(--color-ink-faint)" }}
            >
              {s.k}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="tnum font-semibold"
                style={{
                  fontSize: s.emphasis ? "22px" : "19px",
                  color: s.accent ?? "var(--color-ink)",
                }}
              >
                {s.v}
              </span>
              {s.sub && (
                <span className="tnum text-[12px] font-semibold" style={{ color: s.accent }}>
                  {s.sub}
                </span>
              )}
              {s.delta !== undefined && (
                <span className="text-[11px]">
                  <Delta pct={s.delta} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Watchlist (integrity-oriented) ---------- */
function Watchlist({ selected, onSelect }: { selected: string | null; onSelect: (t: string | null) => void }) {
  return (
    <Panel
      title="Table Watchlist"
      right={<span className="text-[10px] text-[var(--color-ink-faint)]">{TABLES.length} tracked</span>}
      className="h-full"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-ink-faint)]">
              <Th className="text-left">Table</Th>
              <Th>Logs</Th>
              <Th>Integrity</Th>
              <Th>Issues</Th>
              <Th>Level</Th>
              <Th>Checked</Th>
            </tr>
          </thead>
          <tbody>
            {TABLES.map((t) => {
              const active = t.name === selected;
              const validPct = ((t.totalLogs - t.tampered) / t.totalLogs) * 100;
              const clean = t.issues === 0;
              return (
                <tr
                  key={t.name}
                  onClick={() => onSelect(active ? null : t.name)}
                  className="cursor-pointer border-t border-[var(--color-hairline)] transition-colors hover:bg-[var(--color-elevated)]"
                  style={active ? { backgroundColor: colorMix("var(--color-navy-bright)", 0.14) } : undefined}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-6 w-[3px] rounded-full"
                        style={{
                          backgroundColor: clean
                            ? active
                              ? "var(--color-brand-green-bright)"
                              : "var(--color-up)"
                            : "var(--color-down)",
                        }}
                      />
                      <span className="tnum font-semibold text-[var(--color-ink)]">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tnum text-[var(--color-ink)]">{fmt(t.totalLogs)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className="tnum font-semibold"
                      style={{ color: clean ? "var(--color-up)" : "var(--color-down)" }}
                    >
                      {validPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {t.issues > 0 ? (
                      <span className="tnum inline-flex min-w-[18px] justify-center rounded-[5px] bg-[var(--color-down)]/15 px-1 text-[11px] font-semibold text-[var(--color-down)]">
                        {t.issues}
                      </span>
                    ) : (
                      <span className="text-[var(--color-ink-faint)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-[0.06em]"
                      style={{ color: levelColor(t.level) }}
                    >
                      {t.level}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tnum text-[var(--color-ink-faint)]">
                    {t.lastEventSec < 60 ? `${t.lastEventSec}s` : `${Math.round(t.lastEventSec / 60)}m`} ago
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-right font-semibold ${className}`}>{children}</th>;
}

/* ---------- Trend panel: Integrity / Activity ---------- */
function TrendPanel({
  scope,
  tab,
  setTab,
  integritySeries,
  activitySeries,
  metric,
  setMetric,
  metricKey,
  period,
  setPeriod,
}: {
  scope: string | null;
  tab: ChartTab;
  setTab: (t: ChartTab) => void;
  integritySeries: ReturnType<typeof buildIntegritySeries>;
  activitySeries: ReturnType<typeof buildSeries>;
  metric: Metric;
  setMetric: (m: Metric) => void;
  metricKey: "insert" | "update" | "delete";
  period: Period;
  setPeriod: (p: Period) => void;
}) {
  const activityColor =
    metric === "Insert"
      ? "var(--color-insert)"
      : metric === "Update"
        ? "var(--color-update)"
        : "var(--color-delete)";

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          {scope ? `${scope} Trend` : "Integrity Trend"}
        </span>
      }
      right={
        <div className="flex gap-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold tnum transition-colors"
              style={
                p === period
                  ? { backgroundColor: colorMix("var(--color-navy-bright)", 0.2), color: "var(--color-ink)" }
                  : { color: "var(--color-ink-faint)" }
              }
            >
              {p}
            </button>
          ))}
        </div>
      }
      className="h-full"
      bodyClassName="flex flex-col"
    >
      {/* Tab switch */}
      <div className="flex gap-2 border-b border-[var(--color-hairline)] px-3.5">
        {(["INTEGRITY", "ACTIVITY"] as ChartTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="py-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors"
            style={{
              color: tab === t ? "var(--color-ink)" : "var(--color-ink-faint)",
              borderBottom: tab === t ? "2px solid var(--color-brand-green-bright)" : "2px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "INTEGRITY" ? (
        <>
          <div className="flex items-center gap-4 px-3.5 pt-3 text-[10px] uppercase tracking-[0.08em]">
            <span className="flex items-center gap-1.5 text-[var(--color-ink-dim)]">
              <span className="h-[3px] w-4 rounded-full bg-[var(--color-up)]" /> Valid logs
            </span>
            <span className="flex items-center gap-1.5 text-[var(--color-ink-dim)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-down)]" /> Tampered
            </span>
          </div>
          <div className="min-h-[220px] flex-1 px-1 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={integritySeries} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
                <defs>
                  <linearGradient id="fillValid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-up)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--color-up)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--color-ink-faint)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "var(--color-hairline-strong)" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tickMargin={8}
                />
                <YAxis
                  yAxisId="valid"
                  tick={{ fill: "var(--color-up)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
                />
                <YAxis
                  yAxisId="tampered"
                  orientation="right"
                  domain={[0, 5]}
                  allowDecimals={false}
                  tick={{ fill: "var(--color-down)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-elevated)",
                    border: "1px solid var(--color-hairline-strong)",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                  }}
                  labelStyle={{ color: "var(--color-ink-dim)" }}
                  cursor={{ stroke: "var(--color-hairline-strong)" }}
                />
                <Area
                  yAxisId="valid"
                  type="monotone"
                  dataKey="valid"
                  name="Valid logs"
                  stroke="var(--color-up)"
                  strokeWidth={2}
                  fill="url(#fillValid)"
                  isAnimationActive={false}
                  dot={false}
                />
                <Line
                  yAxisId="tampered"
                  type="monotone"
                  dataKey="tampered"
                  name="Tampered"
                  stroke="var(--color-down)"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  dot={{ r: 3, fill: "var(--color-down)", strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-1 px-3.5 pt-3">
            {ACTIVITY_METRICS.map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className="rounded-[6px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors"
                style={
                  m === metric
                    ? { backgroundColor: colorMix(activityColor, 0.16), color: activityColor }
                    : { color: "var(--color-ink-faint)" }
                }
              >
                {m}
              </button>
            ))}
          </div>
          <div className="min-h-[220px] flex-1 px-1 pb-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activitySeries} margin={{ top: 4, right: 12, bottom: 0, left: -14 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--color-ink-faint)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={18}
                />
                <YAxis
                  tick={{ fill: "var(--color-ink-faint)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-elevated)",
                    border: "1px solid var(--color-hairline-strong)",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                  }}
                  labelStyle={{ color: "var(--color-ink-dim)" }}
                  itemStyle={{ color: activityColor }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar
                  dataKey={metricKey}
                  fill={activityColor}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Panel>
  );
}

/* ---------- Latest audit scan ---------- */
function AuditStatus({ sel, g }: { sel: (typeof TABLES)[number] | null; g: ReturnType<typeof globalStats> }) {
  const checked = sel ? sel.checked : g.checked;
  const valid = sel ? sel.valid : g.valid;
  const tampered = sel ? sel.tampered : g.tampered;
  const unavailable = sel ? sel.unavailable : g.unavailable;
  const pending = sel ? sel.pending : g.pending;
  const rows = [
    { k: "Valid", v: valid, c: "var(--color-up)" },
    { k: "Needs attention", v: tampered, c: "var(--color-down)" },
    { k: "Verification pending", v: pending, c: "var(--color-brand-green)" },
    { k: "Verification unavailable", v: unavailable, c: "var(--color-warn)" },
  ];
  const validPct = (valid / checked) * 100;

  return (
    <Panel title={sel ? `${sel.name} Audit Result` : "Latest Audit Scan"} className="h-full">
      <div className="p-3.5">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat k="Last verified" v={CLIENT.lastScan} />
          <MiniStat k="Next scan" v={CLIENT.nextScan} />
        </div>
        <div className="mt-3 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-ground)] px-3.5 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]">Logs checked</span>
            <span className="tnum text-[18px] font-semibold text-[var(--color-ink)]">{fmt(checked)}</span>
          </div>
          <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-[var(--color-elevated)]">
            <span style={{ width: `${validPct}%`, backgroundColor: "var(--color-up)" }} />
            <span
              style={{ width: `${(tampered / checked) * 100 + 0.4}%`, backgroundColor: "var(--color-down)" }}
            />
            <span
              style={{ width: `${(pending / checked) * 100 + 0.2}%`, backgroundColor: "var(--color-brand-green)" }}
            />
            <span
              style={{
                width: `${(unavailable / checked) * 100 + 0.2}%`,
                backgroundColor: "var(--color-warn)",
              }}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {rows.map((r) => (
              <div key={r.k} className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 text-[var(--color-ink-dim)]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.c }} />
                  {r.k}
                </span>
                <span className="tnum font-semibold" style={{ color: r.v > 0 && r.k !== "Valid" ? r.c : "var(--color-ink)" }}>
                  {fmt(r.v)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-[8px] bg-[var(--color-elevated)] px-3 py-2">
          <span className="text-[11px] font-semibold text-[var(--color-ink)]">Server-side verification</span>
          <span className="tnum text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-brand-green-bright)]">
            2×/day
          </span>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
          Scheduled validator runs twice daily and anchors each result. {sel ? "Scope: " + sel.name : "Scope: all tracked tables"}.
        </p>
      </div>
    </Panel>
  );
}

function MiniStat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-ground)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]">{k}</div>
      <div className="tnum mt-0.5 text-[16px] font-semibold text-[var(--color-ink)]">{v}</div>
    </div>
  );
}

/* ---------- Table insights ---------- */
function TableInsights({ selected, onSelect }: { selected: string | null; onSelect: (t: string) => void }) {
  const mostActive = [...TABLES].sort((a, b) => b.totalLogs - a.totalLogs).slice(0, 4);
  const mostTampered = [...TABLES].filter((t) => t.tampered > 0 || t.issues > 0).sort((a, b) => b.tampered - a.tampered || b.issues - a.issues);
  const mostDeletes = [...TABLES].sort((a, b) => b.deletesToday - a.deletesToday).slice(0, 4);

  const groups = [
    {
      title: "Most Active",
      icon: Flame,
      color: "var(--color-up)",
      rows: mostActive.map((t) => [t.name, fmt(t.totalLogs)] as const),
    },
    {
      title: "Most Tampered",
      icon: ShieldAlert,
      color: "var(--color-down)",
      rows: mostTampered.map((t) => [t.name, `${t.tampered || t.issues} issue${(t.tampered || t.issues) !== 1 ? "s" : ""}`] as const),
    },
    {
      title: "Most Deletes",
      icon: Trash2,
      color: "var(--color-delete)",
      rows: mostDeletes.map((t) => [t.name, fmt(t.deletesToday)] as const),
    },
  ];

  return (
    <Panel title="Table Insights" className="h-full" scroll bodyClassName="divide-y divide-[var(--color-hairline)]">
      {groups.map((grp) => (
        <div key={grp.title} className="px-3.5 py-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: grp.color }}>
            <grp.icon size={12} /> {grp.title}
          </div>
          {grp.rows.length === 0 ? (
            <div className="py-1 text-[11px] text-[var(--color-ink-faint)]">None</div>
          ) : (
            <div className="space-y-0.5">
              {grp.rows.map(([name, val]) => (
                <button
                  key={name}
                  onClick={() => onSelect(name)}
                  className="flex w-full items-center justify-between rounded px-1.5 py-1 text-[12px] transition-colors hover:bg-[var(--color-elevated)]"
                  style={name === selected ? { backgroundColor: colorMix("var(--color-navy-bright)", 0.14) } : undefined}
                >
                  <span className="tnum text-[var(--color-ink)]">{name}</span>
                  <span className="tnum font-semibold" style={{ color: grp.color }}>
                    {val}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </Panel>
  );
}

/* ---------- Recent audit activity (periodic, capped at 10) ---------- */
function RecentActivity({
  events,
  scope,
  updatedAt,
}: {
  events: FeedEvent[];
  scope: string | null;
  updatedAt: string;
}) {
  return (
    <Panel
      className="h-full"
      title={
        <span className="flex items-center gap-2">
          Recent Audit Activity
          {scope && <span className="tnum text-[var(--color-brand-green-bright)]">· {scope}</span>}
        </span>
      }
      right={
        <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-ink-faint)]">
          10 latest · updated <span className="tnum">{updatedAt}</span>
        </span>
      }
      scroll
      bodyClassName="max-h-[360px]"
    >
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-ink-faint)]">
            <th className="px-3 py-2 text-left font-semibold">Time</th>
            <th className="px-2 py-2 text-left font-semibold">Table</th>
            <th className="px-2 py-2 text-left font-semibold">Action</th>
            <th className="px-2 py-2 text-left font-semibold">Record</th>
            <th className="px-2 py-2 text-left font-semibold">Actor</th>
            <th className="px-2 py-2 text-right font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3.5 py-6 text-center text-[12px] text-[var(--color-ink-faint)]">
                No recent activity in scope.
              </td>
            </tr>
          )}
          {events.map((e) => (
            <tr
              key={e.id}
              className={`border-t border-[var(--color-hairline)] ${
                e.status === "TAMPERED" ? "bg-[var(--color-down)]/[0.06]" : ""
              }`}
            >
              <td className="tnum px-3 py-1.5 text-[var(--color-ink-faint)]">{e.time}</td>
              <td className="tnum px-2 py-1.5 font-semibold text-[var(--color-ink)]">{e.table}</td>
              <td className="px-2 py-1.5">
                <span className="tnum text-[10px] font-semibold" style={{ color: actionColor(e.action) }}>
                  {e.action}
                </span>
              </td>
              <td className="tnum px-2 py-1.5 text-[var(--color-ink-dim)]">#{e.record}</td>
              <td className="tnum px-2 py-1.5 text-[var(--color-ink-faint)]">{e.actor}</td>
              <td className="px-2 py-1.5 text-right">
                <Pill color={statusColor(e.status)}>{e.status}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/* ---------- Needs attention ---------- */
function NeedsAttention({
  incidents,
  picked,
  onOpen,
  onToggle,
}: {
  incidents: Incident[];
  picked: Set<string>;
  onOpen: (i: Incident) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <Panel
      title="Needs Attention"
      right={
        incidents.length > 0 ? (
          <span className="tnum text-[10px] font-semibold text-[var(--color-down)]">{incidents.length} open</span>
        ) : undefined
      }
      className="h-full"
      scroll
    >
      {incidents.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
          <ShieldCheck size={22} className="text-[var(--color-up)]" />
          <span className="text-[12px] text-[var(--color-ink-dim)]">No open incidents in scope.</span>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-hairline)]">
          {incidents.map((inc) => {
            const isPicked = picked.has(inc.id);
            const c = inc.status === "TAMPERED" ? "var(--color-down)" : "var(--color-warn)";
            return (
              <div key={inc.id} className="flex items-start gap-2.5 px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={isPicked}
                  onChange={() => onToggle(inc.id)}
                  disabled={inc.snapshot === "NONE"}
                  className="mt-0.5 h-3.5 w-3.5 accent-[var(--color-brand-green)] disabled:opacity-30"
                  title={inc.snapshot === "NONE" ? "No snapshot — cannot recover" : "Select for recovery"}
                />
                <button onClick={() => onOpen(inc)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="tnum text-[12px] font-semibold text-[var(--color-ink)]">{inc.id}</span>
                    <Pill color={c}>{inc.status}</Pill>
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-[var(--color-ink-dim)]">{inc.note}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.06em] text-[var(--color-ink-faint)]">
                    {inc.detected} · actor {inc.actor}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ---------- Incident detail drawer ---------- */
function IncidentDrawer({
  incident,
  onClose,
  onPrepare,
}: {
  incident: Incident;
  onClose: () => void;
  onPrepare: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "history" | "recovery">("overview");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const c = incident.status === "TAMPERED" ? "var(--color-down)" : "var(--color-warn)";
  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[400px] flex-col border-l border-[var(--color-hairline-strong)] bg-[var(--color-panel)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-4">
          <span className="tnum text-[16px] font-semibold text-[var(--color-ink)]">{incident.id}</span>
          <button autoFocus onClick={onClose} className="rounded-md p-1.5 text-[var(--color-ink-dim)] hover:bg-[var(--color-elevated)]">
            <X size={18} />
          </button>
        </header>

        <div className="flex gap-2 border-b border-[var(--color-hairline)] px-5 pt-2" role="tablist">
          {(["overview", "history", "recovery"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="px-2 py-2 text-[12px] font-semibold capitalize tracking-wide transition-colors"
              style={{
                color: tab === t ? "var(--color-ink)" : "var(--color-ink-dim)",
                borderBottom: tab === t ? "2px solid var(--color-brand-green-bright)" : "2px solid transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-px overflow-y-auto bg-[var(--color-hairline)]" role="tabpanel">
          {tab === "overview" && (
            <>
              <Row label="Status" value={<Pill color={c}>{incident.status}</Pill>} />
              <Row label="Detected" value={incident.detected} />
              <Row label="Actor" value={incident.actor} />
              <Row label="Latest Action" value={<span style={{ color: actionColor(incident.latestAction) }}>{incident.latestAction}</span>} />
              <Row label="Trusted Snapshot" value={
                incident.snapshot === "AVAILABLE"
                  ? <span className="text-[var(--color-up)]">Available</span>
                  : <span className="text-[var(--color-ink-faint)]">Unavailable</span>
              } />
              <div className="bg-[var(--color-panel)] px-5 py-4">
                <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]">Evidence note</div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--color-ink-dim)]">{incident.note}</p>
              </div>
            </>
          )}

          {tab === "history" && (
            <div className="bg-[var(--color-panel)] px-5 py-4 min-h-full">
              <div className="text-[12px] text-[var(--color-ink-dim)]">Timeline & Verification</div>
              <div className="mt-4 border-l-2 border-[var(--color-hairline-strong)] pl-4 relative space-y-4">
                <div className="relative">
                  <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-[var(--color-down)] ring-2 ring-[var(--color-panel)]" />
                  <div className="text-[12px] font-semibold text-[var(--color-ink)]">Integrity Failed</div>
                  <div className="text-[10px] text-[var(--color-ink-faint)]">Current state</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-[var(--color-ink-faint)] ring-2 ring-[var(--color-panel)]" />
                  <div className="text-[12px] font-semibold text-[var(--color-ink)]">Client Out of Sync</div>
                  <div className="text-[10px] text-[var(--color-ink-faint)]">{incident.detected}</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-[var(--color-up)] ring-2 ring-[var(--color-panel)]" />
                  <div className="text-[12px] font-semibold text-[var(--color-ink)]">Anchored Valid State</div>
                  <div className="text-[10px] text-[var(--color-ink-faint)]">Prior to {incident.latestAction}</div>
                </div>
              </div>
            </div>
          )}

          {tab === "recovery" && (
            <div className="bg-[var(--color-panel)] px-5 py-4 min-h-full">
              <div className="text-[12px] text-[var(--color-ink-dim)] mb-3">Recovery Options</div>
              {incident.snapshot === "AVAILABLE" ? (
                <div className="rounded-[6px] border border-[var(--color-brand-green-bright)]/30 bg-[var(--color-brand-green-bright)]/10 p-3 text-[11px] text-[var(--color-ink)]">
                  A trusted snapshot is available for this record. You can restore the state anchored prior to the tampering event.
                </div>
              ) : (
                <div className="rounded-[6px] border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 p-3 text-[11px] text-[var(--color-warn)]">
                  No snapshot is available for this record. Recovery requires manual intervention.
                </div>
              )}
            </div>
          )}
        </div>
        <footer className="flex items-center gap-2 border-t border-[var(--color-hairline)] px-5 py-4">
          <Btn variant="outline" className="flex-1">
            <FileSearch size={14} /> View Evidence
          </Btn>
          <Btn
            variant="primary"
            className="flex-1"
            disabled={incident.snapshot === "NONE"}
            onClick={onPrepare}
          >
            <LifeBuoy size={14} /> Prepare Recovery
          </Btn>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between bg-[var(--color-panel)] px-5 py-3">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-ink-faint)]">{label}</span>
      <span className="tnum text-[13px] font-semibold text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

/* ---------- Contextual selection bar ---------- */
function SelectionBar({
  ids,
  onClear,
  onPrepare,
}: {
  ids: string[];
  onClear: () => void;
  onPrepare: () => void;
}) {
  const executable = ids.filter((id) => INCIDENTS.find((i) => i.id === id)?.snapshot === "AVAILABLE").length;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-[10px] border border-[var(--color-hairline-strong)] bg-[var(--color-elevated)] px-4 py-3 shadow-2xl sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-green-bright)]">
            {ids.length} incident{ids.length !== 1 ? "s" : ""} selected for review
          </div>
          <div className="tnum truncate text-[12px] text-[var(--color-ink-dim)]">{ids.join(" · ")}</div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--color-ink-dim)]">
          <span>
            Ready to recover:{" "}
            <span className="tnum font-semibold text-[var(--color-up)]">
              {executable}/{ids.length}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Btn>
          <Btn variant="outline" size="sm">
            <FileSearch size={13} /> Review Evidence
          </Btn>
          <Btn variant="primary" size="sm" onClick={onPrepare} disabled={executable === 0}>
            <LifeBuoy size={13} /> Prepare Recovery ({executable})
          </Btn>
        </div>
      </div>
    </div>
  );
}
