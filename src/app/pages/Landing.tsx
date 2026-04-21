import {
  ArrowRight,
  Bell,
  Bot,
  ChartNoAxesCombined,
  Flame,
  Globe2,
  Map,
  Play,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

const logoUrl = new URL("../../../Tr66nd-removebg-preview.png", import.meta.url)
  .href;

const showcaseCards = [
  {
    title: "Radar multifuente",
    text: "YouTube, Reddit, noticias, Hacker News y Google Trends en una lectura unificada.",
    accent: "from-cyan-300 via-sky-400 to-blue-500",
  },
  {
    title: "Mapa regional",
    text: "Pulso por estado para entender donde se concentra la conversacion.",
    accent: "from-emerald-300 via-lime-300 to-cyan-500",
  },
  {
    title: "Alertas inteligentes",
    text: "Notificaciones cuando aparecen senales nuevas de tendencias activas.",
    accent: "from-orange-300 via-rose-400 to-fuchsia-500",
  },
  {
    title: "Asistente IA",
    text: "Apoyo para interpretar graficas, resumir tendencias e idear contenido.",
    accent: "from-fuchsia-300 via-violet-400 to-indigo-500",
  },
];

const features = [
  {
    icon: TrendingUp,
    title: "Tendencias en tiempo real",
    text: "Monitorea temas que crecen en YouTube, Reddit, noticias, Hacker News y Google Trends.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Analitica visual",
    text: "Graficas de sentimiento, fase, fuentes, rendimiento y comparacion temporal.",
  },
  {
    icon: Bell,
    title: "Notificaciones",
    text: "Recibe senales visuales cuando hay nuevas alertas de tendencias.",
  },
  {
    icon: Bot,
    title: "IA Assist",
    text: "Un chat integrado para explicar datos y convertir hallazgos en acciones.",
  },
  {
    icon: Map,
    title: "Mapa de Mexico",
    text: "Explora el pulso regional con un mapa interactivo y ranking por estado.",
  },
  {
    icon: ShieldCheck,
    title: "Transparencia",
    text: "Distingue datos reales, calculados, estimados y heuristicas del prototipo.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#030611] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_78%_10%,rgba(168,85,247,0.28),transparent_32%),radial-gradient(circle_at_86%_76%,rgba(249,115,22,0.18),transparent_30%),radial-gradient(circle_at_22%_90%,rgba(34,197,94,0.14),transparent_32%),linear-gradient(135deg,#03121c_0%,#060717_44%,#140824_100%)]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="absolute -left-36 top-20 h-[32rem] w-[32rem] rounded-full bg-cyan-400/18 blur-[150px]" />
        <div className="absolute -right-32 top-36 h-[34rem] w-[34rem] rounded-full bg-fuchsia-500/20 blur-[160px]" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-emerald-400/12 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#050817]/62 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link className="flex items-center gap-3" to="/">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] shadow-[0_0_34px_rgba(34,211,238,0.22)]">
              <img
                alt="TrendFlow logo"
                className="h-9 w-auto object-contain drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]"
                src={logoUrl}
              />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">TrendFlow</div>
              <div className="text-[10px] uppercase tracking-[0.36em] text-cyan-100/46">
                Trend intelligence
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm text-white/64 md:flex">
            <a className="transition hover:text-white" href="#funciones">
              Funciones
            </a>
            <a className="transition hover:text-white" href="#demo">
              Demo
            </a>
            <a className="transition hover:text-white" href="#metodologia">
              Metodologia
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              className="rounded-full border border-white/14 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/82 transition hover:bg-white/[0.12] hover:text-white"
              to="/login"
            >
              Iniciar sesion
            </Link>
            <Link
              className="rounded-full bg-gradient-to-r from-[#f472b6] via-[#a78bfa] to-[#22d3ee] px-4 py-2 text-sm font-bold text-white shadow-[0_0_34px_rgba(168,85,247,0.42)] transition hover:scale-[1.03]"
              to="/login?view=register"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-12 px-5 py-14 md:px-8 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="relative">
            <div className="absolute -left-14 -top-12 hidden h-40 w-40 rounded-full border border-cyan-300/10 bg-cyan-300/[0.04] blur-sm lg:block" />
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-200/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
              <Radar className="h-4 w-4" />
              Radar social inteligente
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-light leading-[0.92] tracking-[-0.055em] text-white md:text-7xl xl:text-[88px]">
              Detecta lo viral
              <span className="block bg-gradient-to-r from-[#22d3ee] via-[#a78bfa] to-[#f472b6] bg-clip-text font-semibold text-transparent">
                antes del ruido.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/64">
              Una plataforma visual para monitorear tendencias, explicar senales
              tempranas y convertir datos sociales en decisiones de contenido,
              marketing e investigacion.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#f472b6] via-[#a78bfa] to-[#3b82f6] px-7 py-4 text-sm font-bold text-white shadow-[0_0_40px_rgba(168,85,247,0.42)] transition hover:-translate-y-1"
                to="/login?view=register"
              >
                Crear cuenta gratis
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.07] px-7 py-4 text-sm font-bold text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.12]"
                to="/login"
              >
                <Play className="h-4 w-4" />
                Ya tengo cuenta
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
              {[
                ["5+", "Fuentes"],
                ["24/7", "Monitoreo"],
                ["IA", "Asistente"],
              ].map(([value, label]) => (
                <div
                  className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl"
                  key={label}
                >
                  <div className="text-3xl font-semibold">{value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/44">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative" id="demo">
            <div className="absolute -inset-8 rounded-[58px] bg-gradient-to-br from-cyan-400/18 via-fuchsia-500/20 to-orange-400/16 blur-3xl" />
            <div className="absolute -left-6 top-10 z-20 hidden rounded-3xl border border-white/12 bg-[#071326]/86 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur-xl md:block">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-orange-300 to-rose-500 p-3">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Alerta viral</div>
                  <div className="text-xs text-white/48">+189% crecimiento</div>
                </div>
              </div>
            </div>
            <div className="absolute -right-5 bottom-16 z-20 hidden rounded-3xl border border-white/12 bg-[#071326]/86 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur-xl md:block">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 p-3">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Score 157.6k</div>
                  <div className="text-xs text-white/48">Tendencia lider</div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[42px] border border-white/16 bg-gradient-to-br from-white/[0.17] to-white/[0.055] p-4 shadow-[0_34px_110px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.2),transparent_26%),radial-gradient(circle_at_86%_0%,rgba(244,114,182,0.22),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(74,222,128,0.12),transparent_32%)]" />
              <div className="relative mb-4 flex items-center justify-between rounded-3xl border border-white/10 bg-[#0d1426]/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-300" />
                  <div className="h-3 w-3 rounded-full bg-emerald-300" />
                </div>
                <div className="text-xs text-white/42">trendflow.app/dashboard</div>
              </div>

              <div className="relative grid gap-4">
                <div className="rounded-[30px] border border-cyan-200/10 bg-[#0a1630]/90 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/74">
                        Tendencia lider
                      </div>
                      <div className="mt-3 text-2xl font-semibold">
                        Street Fighter Trailer
                      </div>
                      <div className="mt-2 text-sm text-white/54">
                        YouTube | +189% crecimiento
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-300 px-3 py-2 text-sm font-black text-slate-950">
                      Viral
                    </div>
                  </div>

                  <div className="mt-6 h-36 overflow-hidden rounded-3xl bg-[linear-gradient(120deg,rgba(59,130,246,0.24),rgba(168,85,247,0.2)),repeating-linear-gradient(90deg,transparent_0_44px,rgba(255,255,255,0.06)_45px_46px)]">
                    <div className="h-full rounded-3xl bg-[radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.48),transparent_18%),radial-gradient(circle_at_25%_78%,rgba(244,114,182,0.25),transparent_22%),linear-gradient(162deg,transparent_0_42%,rgba(96,165,250,0.28)_43%,rgba(168,85,247,0.48)_56%,rgba(34,211,238,0.36)_70%,transparent_71%)]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[26px] border border-white/12 bg-white/[0.08] p-4">
                    <Globe2 className="h-6 w-6 text-cyan-200" />
                    <div className="mt-4 text-3xl font-semibold">26.2M</div>
                    <div className="text-xs text-white/46">Menciones totales</div>
                  </div>
                  <div className="rounded-[26px] border border-white/12 bg-white/[0.08] p-4">
                    <Search className="h-6 w-6 text-fuchsia-200" />
                    <div className="mt-4 text-3xl font-semibold">+189%</div>
                    <div className="text-xs text-white/46">Crecimiento promedio</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {["YouTube", "Reddit", "News"].map((source, index) => (
                    <div
                      className="rounded-2xl border border-white/10 bg-[#111a32]/72 px-3 py-3"
                      key={source}
                    >
                      <div className="text-xs text-white/42">{source}</div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400"
                          style={{ width: `${92 - index * 18}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative border-y border-white/10 bg-white/[0.035] py-10">
          <div className="absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-[#03121c] to-transparent" />
          <div className="absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-[#120820] to-transparent" />
          <div className="mx-auto max-w-7xl overflow-hidden px-5 md:px-8">
            <div className="flex min-w-max animate-[landing-scroll_24s_linear_infinite] gap-4">
              {[...showcaseCards, ...showcaseCards].map((card, index) => (
                <div
                  className="w-96 shrink-0 rounded-[30px] border border-white/12 bg-[#0d1426]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
                  key={`${card.title}-${index}`}
                >
                  <div className={`h-2 w-24 rounded-full bg-gradient-to-r ${card.accent}`} />
                  <h3 className="mt-5 text-xl font-semibold">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/58">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 md:px-8" id="funciones">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
                Todo lo que trae
              </div>
              <h2 className="mt-4 text-4xl font-light tracking-[-0.04em] md:text-6xl">
                Una suite completa para que tu demo se vea seria.
              </h2>
            </div>
            <div className="max-w-sm text-sm leading-7 text-white/54">
              La landing vende la idea, pero la app ya trae panel, tendencias,
              analisis, configuracion, notificaciones y asistente.
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                className="group relative overflow-hidden rounded-[34px] border border-white/12 bg-gradient-to-br from-white/[0.09] to-white/[0.035] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/28"
                key={feature.title}
              >
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-300/16 to-fuchsia-400/16 blur-2xl transition group-hover:scale-125" />
                <div className="relative">
                  <div className="inline-flex rounded-2xl bg-gradient-to-br from-[#a78bfa] via-[#60a5fa] to-[#22d3ee] p-3 shadow-[0_0_28px_rgba(96,165,250,0.25)]">
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="mt-6 text-xs uppercase tracking-[0.2em] text-white/34">
                    0{index + 1}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/58">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8" id="metodologia">
          <div className="overflow-hidden rounded-[42px] border border-white/14 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.2),transparent_30%),radial-gradient(circle_at_88%_14%,rgba(244,114,182,0.18),transparent_34%),radial-gradient(circle_at_54%_100%,rgba(74,222,128,0.13),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.045))] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
                  Metodologia
                </div>
                <h2 className="mt-4 text-4xl font-light tracking-[-0.04em] md:text-5xl">
                  Transparente, defendible y academico.
                </h2>
                <p className="mt-5 text-sm leading-7 text-white/60">
                  TrendFlow separa recoleccion real, metricas calculadas y capas
                  estimadas para que el sistema sea honesto y facil de explicar
                  en una presentacion universitaria.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Datos reales", "APIs externas monitoreadas"],
                  ["Heuristicas", "Score, riesgo y ciclo de vida"],
                  ["Estimaciones", "Audiencia y senales de apoyo"],
                ].map(([title, text]) => (
                  <div
                    className="rounded-[28px] border border-white/12 bg-[#0b1324]/66 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    key={title}
                  >
                    <div className="text-lg font-semibold">{title}</div>
                    <div className="mt-3 text-sm leading-6 text-white/54">{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes landing-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
