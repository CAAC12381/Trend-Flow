import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  CheckCircle2,
  Database,
  FileText,
  KeyRound,
  Radio,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { Navigate } from "react-router";
import { AsyncStateCard } from "../components/AsyncStateCard";
import { getAdminSummary, type AdminSummary } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useAppPreferences } from "../context/AppPreferences";

const statCards = [
  {
    key: "users",
    label: "Usuarios",
    icon: Users,
    gradient: "from-[#38bdf8] to-[#6366f1]",
  },
  {
    key: "activeSessions",
    label: "Sesiones activas",
    icon: Activity,
    gradient: "from-[#34d399] to-[#06b6d4]",
  },
  {
    key: "trendItems",
    label: "Tendencias guardadas",
    icon: Radio,
    gradient: "from-[#a78bfa] to-[#ec4899]",
  },
  {
    key: "unreadNotifications",
    label: "Alertas pendientes",
    icon: Bell,
    gradient: "from-[#fb923c] to-[#ef4444]",
  },
] as const;

function formatDate(value: string | null, locale: string) {
  if (!value) {
    return "Sin registro";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

export default function Admin() {
  const { user } = useAuth();
  const { preferences } = useAppPreferences();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const locale = preferences.language === "en" ? "en-US" : "es-MX";

  function loadSummary() {
    setLoading(true);
    setError("");
    getAdminSummary()
      .then((data) => setSummary(data))
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el panel administrativo",
        );
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSummary();
  }, []);

  if (user?.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  if (loading) {
    return (
      <AsyncStateCard
        title="Cargando panel admin"
        message="Reuniendo usuarios, sesiones, fuentes y actividad reciente."
      />
    );
  }

  if (error || !summary) {
    return (
      <AsyncStateCard
        title="No se pudo cargar Admin"
        message={error || "El servidor no devolvio informacion administrativa."}
        actionLabel="Reintentar"
        onAction={loadSummary}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-white/[0.14] via-white/[0.08] to-white/[0.04] p-7 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
              <ShieldCheck className="h-4 w-4" />
              Acceso administrador
            </div>
            <h1 className="text-4xl font-light tracking-tight text-white">
              Centro de control de TrendFlow
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
              Vista privada de monitoreo para revisar usuarios, actividad,
              fuentes externas y salud de datos sin exponer controles riesgosos.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/15 bg-[#080d1c]/70 p-5">
            <div className="text-xs uppercase tracking-[0.24em] text-white/35">
              Ultimo snapshot
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">
              {summary.latestSnapshot
                ? formatNumber(summary.latestSnapshot.totalMentions, locale)
                : "Sin datos"}
            </div>
            <div className="mt-1 text-xs text-white/45">
              {summary.latestSnapshot
                ? `${summary.latestSnapshot.sourceCount} fuentes | ${formatDate(
                    summary.latestSnapshot.capturedAt,
                    locale,
                  )}`
                : "Aun no hay capturas de tendencias."}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = summary.totals[card.key];
          return (
            <div
              className="rounded-[26px] border border-white/15 bg-gradient-to-br from-white/[0.12] to-white/[0.05] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
              key={card.key}
            >
              <div className="mb-5 flex items-center justify-between">
                <div
                  className={`rounded-2xl bg-gradient-to-br ${card.gradient} p-3 shadow-[0_0_20px_rgba(96,165,250,0.35)]`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs text-white/40">Live</span>
              </div>
              <div className="text-sm font-medium text-white/55">{card.label}</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {formatNumber(value, locale)}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.05] p-6 backdrop-blur-2xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#3b82f6] p-3">
              <UserRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Usuarios recientes</h2>
              <p className="text-sm text-white/45">
                Cuentas registradas y rol asignado por administrador.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {summary.recentUsers.map((account) => (
              <div
                className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/75 md:grid-cols-[1fr_auto_auto]"
                key={account.id}
              >
                <div>
                  <div className="font-semibold text-white">{account.username}</div>
                  <div className="text-xs text-white/45">{account.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      account.role === "admin"
                        ? "bg-cyan-300/15 text-cyan-100"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {account.role}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
                    {account.plan}
                  </span>
                </div>
                <div className="text-xs text-white/40">
                  {formatDate(account.createdAt, locale)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.05] p-6 backdrop-blur-2xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#06b6d4] p-3">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Estado de APIs</h2>
              <p className="text-sm text-white/45">
                Proveedores configurados para la demo.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {summary.providers.map((provider) => (
              <div
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
                key={provider.label}
              >
                <div>
                  <div className="text-sm font-semibold text-white">
                    {provider.label}
                  </div>
                  <div className="text-xs text-white/45">{provider.detail}</div>
                </div>
                {provider.configured ? (
                  <CheckCircle2 className="h-5 w-5 text-[#4ade80]" />
                ) : (
                  <XCircle className="h-5 w-5 text-[#fb7185]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.05] p-6 backdrop-blur-2xl">
          <div className="mb-5 flex items-center gap-3">
            <Database className="h-6 w-6 text-cyan-200" />
            <h2 className="text-xl font-semibold text-white">Datos por fuente</h2>
          </div>
          <div className="space-y-3">
            {summary.sourceTotals.map((source) => (
              <div key={source.source}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold capitalize text-white">{source.source}</span>
                  <span className="text-white/55">
                    {formatNumber(source.mentions, locale)} menciones
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] via-[#a78bfa] to-[#ec4899]"
                    style={{
                      width: `${Math.min(100, Math.max(8, source.totalItems * 8))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {summary.sourceTotals.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
                Aun no hay tendencias almacenadas por fuente.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.05] p-6 backdrop-blur-2xl">
          <div className="mb-5 flex items-center gap-3">
            <Search className="h-6 w-6 text-pink-200" />
            <h2 className="text-xl font-semibold text-white">Actividad reciente</h2>
          </div>
          <div className="space-y-3">
            {summary.recentActivity.map((item, index) => (
              <div
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"
                key={`${item.type}-${item.createdAt}-${index}`}
              >
                <div className="rounded-xl bg-white/10 p-2">
                  {item.type === "report" ? (
                    <FileText className="h-4 w-4 text-white" />
                  ) : (
                    <Search className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    {item.actor} | {formatDate(item.createdAt, locale)}
                  </div>
                </div>
              </div>
            ))}
            {summary.recentActivity.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/55">
                Todavia no hay busquedas o reportes registrados.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
