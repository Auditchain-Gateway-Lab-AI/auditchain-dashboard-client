import { LoaderCircle } from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Outlet, createBrowserRouter, useLocation } from "react-router-dom";

import { ClientLayout } from "@/components/ClientLayout";
import { useAuth } from "@/hooks/useAuth";

const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const MonitorPage = lazy(() => import("@/pages/MonitorPage").then((module) => ({ default: module.MonitorPage })));
const RecoveryDemo = lazy(() => import("@/components/recovery/RecoveryDemo").then((module) => ({ default: module.RecoveryDemo })));

function ProtectedRoute() {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AppLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function RootRedirect() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <AppLoader />;
  return <Navigate to={session ? "/monitor" : "/login"} replace />;
}

function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ground text-ink-dim">
      <div className="flex items-center gap-2 text-xs"><LoaderCircle className="size-4 animate-spin text-brand-bright" /> Loading client portal…</div>
    </div>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AppLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  { path: "/login", element: <LazyPage><LoginPage /></LazyPage> },
  // Keep a public preview path, while the protected Recovery menu also uses this local prototype until Gateway Recovery is available.
  { path: "/recovery-demo", element: <LazyPage><RecoveryDemo /></LazyPage> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <ClientLayout />,
      children: [
        { path: "/monitor", element: <LazyPage><MonitorPage /></LazyPage> },
        { path: "/recovery", element: <LazyPage><RecoveryDemo /></LazyPage> },
      ],
    }],
  },
  { path: "*", element: <RootRedirect /> },
]);
