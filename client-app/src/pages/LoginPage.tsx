import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { session, login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = (location.state as { from?: string } | null)?.from;
  const from = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/monitor";
  const gatewayPortalUrl = import.meta.env.VITE_GATEWAY_PORTAL_URL;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (session) return <Navigate to="/monitor" replace />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (error) {
      setError("root", { message: error instanceof Error ? error.message : "Login gagal. Silakan coba lagi." });
    }
  });

  return (
    <main className="login-grid relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_90%_at_10%_0%,rgba(17,58,122,.42),transparent_55%),radial-gradient(80%_75%_at_100%_100%,rgba(22,165,101,.2),transparent_52%)]" />
      <div className="relative grid w-full max-w-5xl gap-10 md:grid-cols-[1.05fr_.95fr] md:items-center">
        <section className="hidden md:block">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-line-strong bg-panel/70 p-2.5 shadow-2xl">
              <img src="/logo-ag-new.png" alt="AuditChain" className="size-full object-contain" />
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight text-ink">Audit<span className="text-brand-bright">Chain</span></div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-faint">Client Portal</div>
            </div>
          </div>
          <h1 className="mt-10 max-w-lg text-[42px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink">
            Integrity monitoring for every <span className="text-brand-bright">critical record.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-dim">
            A compact, read-only view of audit health, verification status, and incidents across your monitored data sources.
          </p>
          <div className="mt-8 flex flex-wrap gap-5 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3 text-success" /> Tamper-evident</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3 text-success" /> Server verified</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3 text-success" /> Read only</span>
          </div>
        </section>

        <section className="rounded-xl border border-line-strong bg-panel/95 p-6 shadow-2xl backdrop-blur md:p-8">
          <div className="mb-7 flex items-center gap-3 md:hidden">
            <img src="/logo-ag-new.png" alt="AuditChain" className="size-10 object-contain" />
            <div className="text-lg font-semibold text-ink">Audit<span className="text-brand-bright">Chain</span></div>
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">Client Portal</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Sign in to your workspace</h2>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-dim">
            Use the credentials issued by your organization. Your workspace is assigned securely after sign-in.
          </p>

          <form className="mt-7 space-y-4" onSubmit={(event) => void onSubmit(event)} noValidate>
            <Field label="Username" htmlFor="username" error={errors.username?.message}>
              <input
                {...register("username")}
                id="username"
                autoComplete="username"
                className={cn("field-control", errors.username && "border-danger/70 focus:border-danger")}
                placeholder="Enter username"
              />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <div className="relative">
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={cn("field-control pr-10", errors.password && "border-danger/70 focus:border-danger")}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-ink-faint hover:bg-elevated hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {errors.root?.message && (
              <div role="alert" className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-[11px] text-danger">{errors.root.message}</div>
            )}
            <Button type="submit" className="mt-1 w-full" disabled={isLoggingIn}>
              <LockKeyhole className="size-4" /> {isLoggingIn ? "Signing in…" : "Sign in securely"}
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[9px] text-ink-faint">
            <span>Credentials are issued by your organization.</span>
            {gatewayPortalUrl && (
              <a href={gatewayPortalUrl} className="font-semibold text-brand-bright hover:text-ink" target="_blank" rel="noreferrer">
                Gateway Admin Portal
              </a>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
  return (
    <div className="block">
      <label htmlFor={htmlFor} className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-dim">{label}</label>
      {children}
      {error && <span className="mt-1.5 block text-[10px] text-danger">{error}</span>}
    </div>
  );
}
