import { useState } from "react";
import { LogoLockup } from "./ui";
import { CLIENT } from "../lib/data";

export default function Login({ onEnter }: { onEnter: () => void }) {
  const [email, setEmail] = useState("mbi@morbis.polinema.id");
  const [pw, setPw] = useState("••••••••••");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* ambient ground */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 15% 0%, rgba(17,58,122,0.35) 0%, transparent 55%), radial-gradient(90% 80% at 100% 100%, rgba(22,165,101,0.22) 0%, transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-hairline) 1px, transparent 1px), linear-gradient(90deg, var(--color-hairline) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at 50% 40%, black, transparent 75%)",
        }}
      />

      <div className="relative grid w-full max-w-5xl grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
        <div className="hidden md:block">
          <LogoLockup width={190} />
          <h1 className="mt-8 max-w-md font-serif text-[42px] leading-[1.05] text-[var(--color-ink)]">
            The client cockpit for
            <span className="text-[var(--color-brand-green-bright)]"> continuous audit</span> &amp; data recovery.
          </h1>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-[var(--color-ink-dim)]">
            Watch every table like a market. Trace live activity, catch integrity incidents the moment a scan
            flags them, and restore trusted state — all from one screen.
          </p>
          <div className="mt-8 flex items-center gap-6 text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
            <span>Tamper-evident logs</span>
            <span className="h-3 w-px bg-[var(--color-hairline-strong)]" />
            <span>Anchored evidence</span>
            <span className="h-3 w-px bg-[var(--color-hairline-strong)]" />
            <span>Contextual recovery</span>
          </div>
        </div>

        <div className="rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-panel)] p-7 shadow-2xl md:p-8">
          <div className="mb-6 flex items-center justify-between md:hidden">
            <LogoLockup width={140} />
          </div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-green-bright)]">
              Client Portal
            </span>
          </div>
          <h2 className="font-serif text-[26px] text-[var(--color-ink)]">Sign in to your workspace</h2>
          <p className="mt-1 text-[12px] text-[var(--color-ink-dim)]">
            {CLIENT.tenant} · {CLIENT.org}
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onEnter();
            }}
          >
            <Field label="Work email">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[8px] border border-[var(--color-hairline-strong)] bg-[var(--color-ground)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-navy-bright)]"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full rounded-[8px] border border-[var(--color-hairline-strong)] bg-[var(--color-ground)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-navy-bright)]"
              />
            </Field>

            <button
              type="submit"
              className="w-full rounded-[8px] bg-[var(--color-brand-green)] py-2.5 text-[13px] font-semibold text-[#04121e] transition-colors hover:bg-[var(--color-brand-green-bright)]"
            >
              Enter Audit Monitor →
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-[11px] text-[var(--color-ink-faint)]">
            <span>Last scan {CLIENT.lastScan} · {CLIENT.scanDate}</span>
            <span className="flex items-center gap-1.5">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--color-up)]" /> Gateway online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-dim)]">
        {label}
      </span>
      {children}
    </label>
  );
}
