import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [showWakeHint, setShowWakeHint] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowWakeHint(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowWakeHint(true);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050510] px-6 text-center text-white">
        <div className="space-y-3">
          <p className="text-lg font-semibold">Cargando sesion...</p>
          <p className="text-sm text-white/65">
            Trend Flow esta validando tu acceso.
          </p>
          {showWakeHint ? (
            <p className="mx-auto max-w-md text-sm text-cyan-200/85">
              El backend puede estar despertando en Render. La primera carga en
              produccion puede tardar entre 30 y 60 segundos.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
