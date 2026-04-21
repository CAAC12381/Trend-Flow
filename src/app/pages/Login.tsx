import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Apple,
  Facebook,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { forgotPasswordAuth, resetPasswordAuth } from "../lib/api";

type AuthView = "login" | "register" | "forgot" | "reset";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const logoUrl = new URL("../../../Tr66nd-removebg-preview.png", import.meta.url)
  .href;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, googleLogin, socialLogin, isAuthenticated } = useAuth();
  const [view, setView] = useState<AuthView>(() =>
    searchParams.get("view") === "register" ? "register" : "login",
  );
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (searchParams.get("view") === "register") {
      setView("register");
      return;
    }

    if (searchParams.get("view") === "login") {
      setView("login");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!(view === "login" || view === "register")) {
      return;
    }

    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]',
    );

    const renderGoogleButton = () => {
      if (!googleButtonRef.current || !window.google?.accounts?.id) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => {
          void handleGoogleCredential(credential);
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: 320,
        text: view === "register" ? "signup_with" : "signin_with",
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }

    const script =
      existingScript ||
      Object.assign(document.createElement("script"), {
        src: "https://accounts.google.com/gsi/client",
        async: true,
        defer: true,
      });

    script.dataset.googleIdentity = "true";
    script.onload = () => {
      renderGoogleButton();
    };

    if (!existingScript) {
      document.body.appendChild(script);
    }
  }, [view]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      if (view === "register") {
        await register(username, email, password);
        navigate("/app", { replace: true });
        return;
      }

      if (view === "login") {
        await login(email, password);
        navigate("/app", { replace: true });
        return;
      }

      if (view === "forgot") {
        const result = await forgotPasswordAuth({ email });
        setSuccessMessage(
          `Codigo generado: ${result.resetCode}. Luego podemos conectarlo a correo real.`,
        );
        setView("reset");
        return;
      }

      if (view === "reset") {
        await resetPasswordAuth({
          email,
          code: resetCode,
          password: newPassword,
        });
        setSuccessMessage("Contrasena actualizada. Ya puedes iniciar sesion.");
        setView("login");
        setPassword("");
        setNewPassword("");
        setResetCode("");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo completar la operacion",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = view === "register";
  const isForgot = view === "forgot";
  const isReset = view === "reset";
  const title = isRegister
    ? "Crea tu cuenta"
    : view === "login"
      ? "Inicia sesion para continuar"
      : isForgot
        ? "Recupera tu acceso con un codigo"
        : "Ingresa el codigo y tu nueva contrasena";
  const subtitle = isRegister
    ? "Empieza a monitorear tendencias, mapas y oportunidades en tiempo real."
    : view === "login"
      ? "Entra a tu centro de inteligencia social y sigue el pulso de lo viral."
      : isForgot
        ? "Genera un codigo temporal y recupera tu acceso en segundos."
        : "Confirma tu codigo y define una nueva contrasena segura.";

  const socialProviders = [
    {
      id: "apple" as const,
      label: "Apple",
      icon: Apple,
      style:
        "from-white/[0.08] to-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]",
    },
    {
      id: "facebook" as const,
      label: "Facebook",
      icon: Facebook,
      style:
        "from-[#1877f2]/18 to-[#60a5fa]/10 hover:border-[#60a5fa]/30 hover:bg-[#1877f2]/10",
    },
  ];

  async function handleSocialLogin(provider: "google" | "apple" | "facebook") {
    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await socialLogin(provider);
      navigate("/app", { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo iniciar sesion social",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await googleLogin(credential);
      navigate("/app", { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo iniciar sesion con Google",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[#050510] p-2 md:p-3">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.15),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_30%),linear-gradient(180deg,#04050f_0%,#070b1a_100%)]" />
        <div className="absolute left-[-10%] top-[-20%] h-[50%] w-[60%] rounded-[100%] bg-gradient-to-br from-[#2d4663]/30 via-[#1a2744]/20 to-transparent blur-[120px]" />
        <div className="absolute right-[-15%] top-[30%] h-[60%] w-[70%] rounded-[100%] bg-gradient-to-tl from-[#334155]/25 via-[#1e3a5f]/15 to-transparent blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[25%] h-[35%] w-[40%] rounded-[100%] bg-gradient-to-tr from-[#ec4899]/20 via-[#8b5cf6]/10 to-transparent blur-[130px]" />
        <div className="absolute left-[8%] top-[12%] h-28 w-28 rounded-full border border-white/10 bg-white/[0.03] blur-sm" />
        <div className="absolute bottom-[10%] right-[10%] h-36 w-36 rounded-full border border-cyan-400/10 bg-cyan-400/5 blur-sm" />
      </div>

      <div className="relative z-10 grid h-[calc(100vh-16px)] w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/20 bg-gradient-to-br from-white/[0.10] to-white/[0.04] shadow-[0_20px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl lg:grid-cols-[1.02fr_0.98fr] md:h-[calc(100vh-24px)]">
        <div className="relative hidden h-full overflow-hidden border-r border-white/10 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_70%_18%,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(239,68,68,0.16),transparent_30%)]" />
          <div className="absolute left-10 top-7 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-white/45">
            TrendFlow Access
          </div>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[12%] top-[18%] h-2.5 w-2.5 rounded-full bg-cyan-300/35 blur-[1px] animate-pulse" />
            <div className="absolute left-[26%] top-[30%] h-1.5 w-1.5 rounded-full bg-fuchsia-300/40 animate-pulse [animation-delay:0.4s]" />
            <div className="absolute left-[18%] bottom-[24%] h-2 w-2 rounded-full bg-white/25 blur-[1px] animate-pulse [animation-delay:1.1s]" />
            <div className="absolute right-[20%] top-[22%] h-2 w-2 rounded-full bg-sky-300/30 animate-pulse [animation-delay:0.8s]" />
            <div className="absolute right-[15%] top-[40%] h-1.5 w-1.5 rounded-full bg-violet-300/35 animate-pulse [animation-delay:1.6s]" />
            <div className="absolute right-[28%] bottom-[18%] h-2.5 w-2.5 rounded-full bg-red-300/25 blur-[1px] animate-pulse [animation-delay:0.9s]" />
            <div className="absolute left-[9%] top-[42%] h-1.5 w-1.5 rounded-full bg-cyan-200/45 animate-pulse [animation-delay:0.2s]" />
            <div className="absolute left-[33%] top-[14%] h-2 w-2 rounded-full bg-white/20 blur-[1px] animate-pulse [animation-delay:1.8s]" />
            <div className="absolute left-[44%] top-[34%] h-2.5 w-2.5 rounded-full bg-fuchsia-300/25 blur-[1px] animate-pulse [animation-delay:0.7s]" />
            <div className="absolute left-[48%] top-[58%] h-1.5 w-1.5 rounded-full bg-blue-200/45 animate-pulse [animation-delay:1.3s]" />
            <div className="absolute left-[22%] bottom-[12%] h-2 w-2 rounded-full bg-white/20 blur-[1px] animate-pulse [animation-delay:1.9s]" />
            <div className="absolute left-[38%] bottom-[22%] h-2.5 w-2.5 rounded-full bg-red-300/20 blur-[1px] animate-pulse [animation-delay:0.5s]" />
            <div className="absolute right-[36%] top-[16%] h-1.5 w-1.5 rounded-full bg-cyan-300/50 animate-pulse [animation-delay:1.1s]" />
            <div className="absolute right-[24%] top-[28%] h-2 w-2 rounded-full bg-white/15 blur-[1px] animate-pulse [animation-delay:0.6s]" />
            <div className="absolute right-[12%] top-[58%] h-2.5 w-2.5 rounded-full bg-violet-300/25 blur-[1px] animate-pulse [animation-delay:1.4s]" />
            <div className="absolute right-[18%] bottom-[12%] h-2 w-2 rounded-full bg-cyan-200/30 blur-[1px] animate-pulse [animation-delay:0.3s]" />
            <div className="absolute right-[42%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-white/30 animate-pulse [animation-delay:1.7s]" />
            <div className="absolute left-[38%] top-[54%] h-20 w-20 rounded-full border border-white/5 bg-white/[0.02] blur-xl" />
            <div className="absolute right-[32%] bottom-[28%] h-24 w-24 rounded-full border border-cyan-400/5 bg-cyan-400/[0.03] blur-xl" />
          </div>
          <div className="relative flex h-full flex-col justify-between p-7">
            <div>
              <div className="max-w-lg pt-7">
                <h1 className="text-[38px] font-light leading-[1.02] tracking-tight text-white">
                  <span className="block text-white/88">La puerta de entrada</span>
                  <span className="mt-2 block bg-gradient-to-r from-[#a78bfa] via-[#22d3ee] to-[#3b82f6] bg-clip-text font-semibold text-transparent">
                    a tu radar de tendencias
                  </span>
                </h1>
                <p className="mt-4 max-w-md text-[14px] leading-6 text-white/62">
                  Detecta lo que esta creciendo, entiende el contexto y encuentra oportunidades antes que los demas.
                </p>
              </div>

              <div className="relative mt-5 flex items-center justify-center">
                <div className="absolute h-[270px] w-[270px] rounded-full bg-gradient-to-br from-cyan-400/12 via-fuchsia-500/12 to-red-500/12 blur-3xl" />
                <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-6 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/[0.06] to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b1020]/35 to-transparent" />
                  <img
                    alt="TrendFlow logo"
                    className="mx-auto h-[220px] w-auto scale-[0.9] object-contain drop-shadow-[0_0_40px_rgba(168,85,247,0.35)]"
                    src={logoUrl}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Live</div>
                <div className="mt-2 text-[28px] font-semibold leading-none text-white/92">24/7</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Signals</div>
                <div className="mt-2 text-[28px] font-semibold leading-none text-white/92">Multi API</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Insights</div>
                <div className="mt-2 text-[28px] font-semibold leading-none text-white/92">IA Assist</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex h-full items-center overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[10%] top-[16%] h-2 w-2 rounded-full bg-cyan-300/30 blur-[1px] animate-pulse [animation-delay:0.2s]" />
            <div className="absolute left-[18%] top-[34%] h-1.5 w-1.5 rounded-full bg-white/25 animate-pulse [animation-delay:1.4s]" />
            <div className="absolute left-[12%] bottom-[22%] h-2.5 w-2.5 rounded-full bg-fuchsia-300/20 blur-[1px] animate-pulse [animation-delay:0.8s]" />
            <div className="absolute left-[38%] top-[12%] h-2 w-2 rounded-full bg-sky-300/25 animate-pulse [animation-delay:1.7s]" />
            <div className="absolute left-[44%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-white/30 animate-pulse [animation-delay:0.6s]" />
            <div className="absolute right-[14%] top-[14%] h-2.5 w-2.5 rounded-full bg-cyan-300/25 blur-[1px] animate-pulse [animation-delay:1.1s]" />
            <div className="absolute right-[10%] top-[32%] h-1.5 w-1.5 rounded-full bg-violet-300/30 animate-pulse [animation-delay:0.5s]" />
            <div className="absolute right-[18%] top-[54%] h-2 w-2 rounded-full bg-white/20 blur-[1px] animate-pulse [animation-delay:1.9s]" />
            <div className="absolute right-[12%] bottom-[16%] h-2.5 w-2.5 rounded-full bg-fuchsia-300/18 blur-[1px] animate-pulse [animation-delay:0.9s]" />
            <div className="absolute right-[30%] bottom-[26%] h-2 w-2 rounded-full bg-sky-300/22 animate-pulse [animation-delay:1.3s]" />
            <div className="absolute left-[28%] top-[48%] h-20 w-20 rounded-full border border-white/5 bg-white/[0.02] blur-xl" />
            <div className="absolute right-[24%] bottom-[30%] h-24 w-24 rounded-full border border-cyan-400/5 bg-cyan-400/[0.03] blur-xl" />
          </div>
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-4 lg:hidden">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.05] shadow-[0_0_30px_rgba(168,85,247,0.22)]">
                <img
                  alt="TrendFlow logo"
                  className="h-12 w-auto object-contain"
                  src={logoUrl}
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/40">
                  TrendFlow
                </div>
                <div className="mt-1 text-lg font-semibold text-white/92">
                  Social Trend Intelligence
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="inline-flex rounded-full border border-cyan-400/15 bg-cyan-400/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Secure Access
              </div>
              <h1 className="mt-4 text-[38px] font-light tracking-tight text-white">
                <span className="inline-flex flex-wrap items-baseline gap-2 whitespace-nowrap text-white/90">
                  <span>Trend</span>
                  <span className="bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#22d3ee] bg-clip-text font-semibold text-transparent">
                    Flow
                  </span>
                </span>
              </h1>
              <p className="mt-3 max-w-md text-[14px] leading-6 text-white/58">
                {title}
              </p>
              <p className="mt-1.5 max-w-md text-[14px] leading-6 text-white/42">
                {subtitle}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-gradient-to-br from-white/[0.08] to-white/[0.04] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-5">
              {(view === "login" || view === "register") && (
                <div className="mb-5">
                  <div className="space-y-3">
                    <div
                      className="flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
                      ref={googleButtonRef}
                    />
                    {!GOOGLE_CLIENT_ID && (
                      <div className="text-center text-xs text-amber-200/85">
                        Configura <code>VITE_GOOGLE_CLIENT_ID</code> para activar Google OAuth real.
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {socialProviders.map((provider) => (
                      <button
                        key={provider.id}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br px-4 py-3 text-sm font-medium text-white/88 transition-all ${provider.style} disabled:opacity-60`}
                        disabled={submitting}
                        onClick={() => {
                          void handleSocialLogin(provider.id);
                        }}
                        type="button"
                      >
                        <provider.icon className="h-4 w-4" />
                        <span>{provider.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                      o sigue con email
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="block">
              <span className="mb-2 block text-xs text-white/60">Usuario</span>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <User className="h-4 w-4 text-white/60" />
                <input
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@usuario"
                  required
                  value={username}
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-xs text-white/60">Email</span>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
              <Mail className="h-4 w-4 text-white/60" />
              <input
                className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                type="email"
                value={email}
              />
            </div>
          </label>

          {(view === "login" || view === "register") && (
            <label className="block">
              <span className="mb-2 block text-xs text-white/60">Contrasena</span>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <Lock className="h-4 w-4 text-white/60" />
                <input
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="text-white/55 transition hover:text-white/90"
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
          )}

          {isReset && (
            <>
              <label className="block">
                <span className="mb-2 block text-xs text-white/60">
                  Codigo de recuperacion
                </span>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <KeyRound className="h-4 w-4 text-white/60" />
                  <input
                    className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    required
                    value={resetCode}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs text-white/60">
                  Nueva contrasena
                </span>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  <Lock className="h-4 w-4 text-white/60" />
                  <input
                    className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="******"
                    required
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                  />
                  <button
                    className="text-white/55 transition hover:text-white/90"
                    onClick={() => setShowNewPassword((value) => !value)}
                    type="button"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>
            </>
          )}

          {error && <div className="text-sm text-red-300">{error}</div>}
          {successMessage && (
            <div className="text-sm text-emerald-300">{successMessage}</div>
          )}

          <button
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#3b82f6] px-4 py-3 text-sm font-medium text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {isRegister && "Crear cuenta"}
            {view === "login" && "Entrar"}
            {isForgot && "Enviar codigo"}
            {isReset && "Cambiar contrasena"}
            <ArrowRight className="h-4 w-4" />
          </button>
              </form>

              {view === "login" && (
                <button
                  className="mt-4 text-sm text-[#93c5fd] hover:text-white"
                  onClick={() => {
                    setError("");
                    setSuccessMessage("");
                    setView("forgot");
                  }}
                  type="button"
                >
                  Olvidaste tu contrasena?
                </button>
              )}

              {(view === "login" || view === "register") && (
                <button
                  className="mt-5 text-sm text-white/70 hover:text-white"
                  onClick={() => {
                    setError("");
                    setSuccessMessage("");
                    setView(isRegister ? "login" : "register");
                  }}
                  type="button"
                >
                  {isRegister
                    ? "Ya tengo cuenta, quiero iniciar sesion"
                    : "No tengo cuenta, quiero registrarme"}
                </button>
              )}

              {(isForgot || isReset) && (
                <button
                  className="mt-5 text-sm text-white/70 hover:text-white"
                  onClick={() => {
                    setError("");
                    setSuccessMessage("");
                    setView("login");
                  }}
                  type="button"
                >
                  Volver al login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
