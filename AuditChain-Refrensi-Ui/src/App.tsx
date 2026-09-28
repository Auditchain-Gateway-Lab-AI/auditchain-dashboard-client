import { useState } from "react";
import { Bell, Settings, LogOut, RotateCw } from "lucide-react";
import Login from "./components/Login";
import Monitor from "./components/Monitor";
import Recovery from "./components/Recovery";
import { LogoIcon, colorMix } from "./components/ui";
import { CLIENT } from "./lib/data";

type Workspace = "monitor" | "recovery";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [ws, setWs] = useState<Workspace>("monitor");

  if (!authed) return <Login onEnter={() => setAuthed(true)} />;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ground)]">
      <TopBar ws={ws} setWs={setWs} onLogout={() => setAuthed(false)} />
      <main className="flex-1">{ws === "monitor" ? <Monitor /> : <Recovery />}</main>
    </div>
  );
}

function TopBar({
  ws,
  setWs,
  onLogout,
}: {
  ws: Workspace;
  setWs: (w: Workspace) => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-hairline)] bg-[var(--color-panel)]/95 backdrop-blur">
      <div className="flex items-center gap-4 px-3 py-2.5 lg:px-4">
        <div className="flex items-center gap-2.5">
          <LogoIcon size={30} />
          <div className="leading-none">
            <div className="text-[14px] font-semibold tracking-tight text-[var(--color-ink)]">
              Audit<span className="text-[var(--color-brand-green-bright)]">Chain</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">Client Portal</div>
          </div>
        </div>

        <div className="mx-2 hidden h-6 w-px bg-[var(--color-hairline-strong)] sm:block" />

        <div className="hidden min-w-0 sm:block">
          <div className="tnum text-[13px] font-semibold text-[var(--color-ink)]">{CLIENT.tenant}</div>
          <div className="truncate text-[10px] text-[var(--color-ink-faint)]">{CLIENT.org}</div>
        </div>

        {/* Workspace switch */}
        <nav className="ml-auto flex items-center gap-1 rounded-[9px] border border-[var(--color-hairline)] bg-[var(--color-ground)] p-1">
          {(["monitor", "recovery"] as Workspace[]).map((w) => (
            <button
              key={w}
              onClick={() => setWs(w)}
              className="rounded-[7px] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors"
              style={
                ws === w
                  ? { backgroundColor: colorMix("var(--color-navy-bright)", 0.24), color: "var(--color-ink)" }
                  : { color: "var(--color-ink-dim)" }
              }
            >
              {w === "monitor" ? "Monitor" : "Recovery"}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <span className="mr-1 hidden items-center gap-2 rounded-full border border-[var(--color-hairline-strong)] bg-[var(--color-ground)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-dim)] md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-green-bright)]" />
            Auto refresh 60s
            <RotateCw size={11} className="text-[var(--color-ink-faint)]" />
          </span>
          <IconBtn label="Notifications">
            <Bell size={16} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-down)]" />
          </IconBtn>
          <IconBtn label="Settings">
            <Settings size={16} />
          </IconBtn>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-[8px] py-1 pl-2 pr-1 transition-colors hover:bg-[var(--color-elevated)]"
          >
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-[11px] font-semibold text-[var(--color-ink)]">mbi</span>
              <span className="block text-[9px] text-[var(--color-ink-faint)]">Auditor</span>
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-navy)] text-[11px] font-semibold text-white">
              MB
            </span>
            <LogOut size={13} className="text-[var(--color-ink-faint)]" />
          </button>
        </div>
      </div>
    </header>
  );
}

function IconBtn({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="relative flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-ink-dim)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-ink)]"
    >
      {children}
    </button>
  );
}
