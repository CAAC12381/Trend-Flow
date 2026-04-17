import { useEffect, useState, type ChangeEvent } from "react";
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Save,
  Upload,
  PauseCircle,
  RotateCcw,
} from "lucide-react";
import { useAppPreferences } from "../context/AppPreferences";
import { useCopy } from "../lib/copy";
import { patchPreferencesAuth, patchProfileAuth } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className={`relative h-6 w-12 rounded-full transition-all ${
        checked
          ? "bg-gradient-to-r from-[#a78bfa] to-[#3b82f6] shadow-[0_0_12px_rgba(147,51,234,0.4)]"
          : "bg-white/[0.1]"
      }`}
      onClick={onChange}
      type="button"
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-all ${
          checked ? "left-[26px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { preferences, updatePreferences, updateSection, resetPreferences } =
    useAppPreferences();
  const { refresh } = useAuth();
  const copy = useCopy();
  const [draftProfile, setDraftProfile] = useState(preferences.profile);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftProfile(preferences.profile);
  }, [preferences.profile]);

  function showSavedMessage() {
    setErrorMessage("");
    setSavedMessage(copy.dataSaved);
    window.setTimeout(() => setSavedMessage(""), 2500);
  }

  function showErrorMessage(message: string) {
    setSavedMessage("");
    setErrorMessage(message);
    window.setTimeout(() => setErrorMessage(""), 3500);
  }

  async function persistPreferences(
    payload: Parameters<typeof patchPreferencesAuth>[0],
    rollback?: () => void,
  ) {
    try {
      await patchPreferencesAuth(payload);
      await refresh();
      showSavedMessage();
      return true;
    } catch (error) {
      rollback?.();
      showErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios",
      );
      return false;
    }
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const avatar = typeof reader.result === "string" ? reader.result : null;
      setDraftProfile((current) => ({
        ...current,
        avatar,
      }));
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    setIsSaving(true);
    setErrorMessage("");

    try {
      await patchProfileAuth({
        username: draftProfile.username,
        email: draftProfile.email,
        bio: draftProfile.bio,
        avatar: draftProfile.avatar,
      });
      updateSection("profile", draftProfile);
      await refresh();
      showSavedMessage();
    } catch (error) {
      showErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el perfil",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20">
              <div className="h-20 w-20 rounded-full border-4 border-white/20 bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] shadow-[0_0_24px_rgba(236,72,153,0.4)]" />
              {draftProfile.avatar && (
                <img
                  alt="Avatar"
                  className="absolute inset-0 h-20 w-20 rounded-full border-4 border-white/20 object-cover shadow-[0_0_24px_rgba(236,72,153,0.4)]"
                  src={draftProfile.avatar}
                />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white/95">
                {preferences.profile.username}
              </h2>
              <p className="mt-1 text-sm text-white/50">
                {preferences.profile.email}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {preferences.account.plan} |{" "}
                {preferences.account.status === "active"
                  ? copy.activeState
                  : copy.pausedState}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#3b82f6] px-6 py-3 text-sm font-medium text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-70"
              disabled={isSaving}
              onClick={() => {
                void saveProfile();
              }}
              type="button"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : copy.saveProfile}
            </button>
            {savedMessage && (
              <span className="text-xs text-[#4ade80]">{savedMessage}</span>
            )}
            {errorMessage && (
              <span className="text-xs text-red-300">{errorMessage}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#3b82f6] p-2.5 shadow-[0_0_20px_rgba(147,51,234,0.4)]">
              <User className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white/95">{copy.profile}</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <div>
                <div className="text-sm font-medium text-white/90">
                  {copy.editPhoto}
                </div>
                <div className="mt-1 text-xs text-white/50">PNG, JPG o WEBP</div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/85">
                <Upload className="h-4 w-4" />
                {copy.editPhoto}
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  type="file"
                />
              </label>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/90">
                {copy.username}
              </label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none"
                onChange={(event) =>
                  setDraftProfile((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                value={draftProfile.username}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/90">
                {copy.email}
              </label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none"
                onChange={(event) =>
                  setDraftProfile((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                value={draftProfile.email}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/90">
                {copy.bio}
              </label>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none"
                onChange={(event) =>
                  setDraftProfile((current) => ({
                    ...current,
                    bio: event.target.value,
                  }))
                }
                value={draftProfile.bio}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] p-2.5 shadow-[0_0_20px_rgba(236,72,153,0.4)]">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white/95">
                {copy.appearance}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { id: "night", label: "Night" },
                { id: "aurora", label: "Aurora" },
                { id: "daylight", label: "Daylight" },
              ].map((theme) => (
                <button
                  key={theme.id}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    preferences.theme === theme.id
                      ? "border-[#a78bfa]/40 bg-gradient-to-r from-[#a78bfa]/20 to-[#3b82f6]/20 text-white"
                      : "border-white/10 bg-white/[0.04] text-white/65"
                  }`}
                  onClick={() => {
                    const nextTheme = theme.id as "night" | "aurora" | "daylight";
                    const previousTheme = preferences.theme;
                    updatePreferences({ theme: nextTheme });
                    void persistPreferences(
                      { theme: nextTheme },
                      () => updatePreferences({ theme: previousTheme }),
                    );
                  }}
                  type="button"
                >
                  {theme.label}
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-white" />
                <span className="text-sm text-white/90">{copy.language}</span>
              </div>
              <select
                className="rounded-xl border border-white/10 bg-[#131522] px-3 py-2 text-sm text-white outline-none"
                onChange={(event) => {
                  const nextLanguage = event.target.value as "es" | "en";
                  const previousLanguage = preferences.language;
                  updatePreferences({ language: nextLanguage });
                  void persistPreferences(
                    { language: nextLanguage },
                    () => updatePreferences({ language: previousLanguage }),
                  );
                }}
                value={preferences.language}
              >
                <option value="es">Espanol</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#f97316] to-[#ef4444] p-2.5 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white/95">
                {copy.notifications}
              </h2>
            </div>

            <div className="space-y-4">
              {[
                ["trendAlerts", copy.trendAlerts],
                ["weeklyReports", copy.weeklyReports],
                ["mentions", copy.mentions],
                ["appUpdates", copy.appUpdates],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="text-sm text-white/90">{label}</span>
                  <Toggle
                    checked={
                      preferences.notifications[
                        key as keyof typeof preferences.notifications
                      ]
                    }
                    onChange={() => {
                      const nextValue =
                        !preferences.notifications[
                          key as keyof typeof preferences.notifications
                        ];
                      const nextNotifications = {
                        ...preferences.notifications,
                        [key]: nextValue,
                      };
                      const previousNotifications = preferences.notifications;

                      updateSection("notifications", { [key]: nextValue });
                      void persistPreferences({
                        notifications: nextNotifications,
                      }, () => updateSection("notifications", previousNotifications));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#84cc16] p-2.5 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white/95">{copy.privacy}</h2>
          </div>

          <div className="space-y-4">
            {[
              ["publicProfile", copy.publicProfile],
              ["showStats", copy.showStats],
              ["allowMessages", copy.allowMessages],
            ].map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.04] p-4"
              >
                <span className="text-sm text-white/90">{label}</span>
                <Toggle
                  checked={preferences.privacy[key as keyof typeof preferences.privacy]}
                  onChange={() => {
                    const nextValue =
                      !preferences.privacy[key as keyof typeof preferences.privacy];
                    const nextPrivacy = {
                      ...preferences.privacy,
                      [key]: nextValue,
                    };
                    const previousPrivacy = preferences.privacy;
                    updateSection("privacy", { [key]: nextValue });
                    void persistPreferences(
                      { privacy: nextPrivacy },
                      () => updateSection("privacy", previousPrivacy),
                    );
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#f97316] to-[#ef4444] p-2.5 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white/95">{copy.account}</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm text-white/90">{copy.subscription}</div>
              <div className="mt-1 text-xs text-white/50">
                {preferences.account.plan} |{" "}
                {preferences.account.status === "active"
                  ? copy.activeState
                  : copy.pausedState}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-sm text-white/90"
                onClick={() => {
                  const nextStatus =
                    preferences.account.status === "active"
                      ? "paused"
                      : "active";
                  const previousStatus = preferences.account.status;
                  updateSection("account", {
                    status: nextStatus,
                  });
                  void persistPreferences(
                    { accountStatus: nextStatus },
                    () =>
                      updateSection("account", {
                        status: previousStatus,
                      }),
                  );
                }}
                type="button"
              >
                <PauseCircle className="h-4 w-4" />
                {preferences.account.status === "active"
                  ? copy.deactivateAccount
                  : copy.restoreAccount}
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-red-500/20 bg-red-500/[0.08] p-4 text-sm text-red-300"
                onClick={() => {
                  const defaultProfile = {
                    username: "@trendflow_user",
                    email: "user@trendflow.com",
                    bio: "Analista de redes sociales apasionado",
                    avatar: null,
                  };
                  const previousPreferences = preferences;
                  const previousDraftProfile = draftProfile;

                  resetPreferences();
                  setDraftProfile(defaultProfile);

                  void patchProfileAuth(defaultProfile)
                    .then(() =>
                      patchPreferencesAuth({
                        language: "es",
                        theme: "night",
                        notifications: {
                          trendAlerts: true,
                          weeklyReports: true,
                          mentions: false,
                          appUpdates: true,
                        },
                        privacy: {
                          publicProfile: true,
                          showStats: true,
                          allowMessages: true,
                        },
                        accountStatus: "active",
                        plan: "Premium",
                      }),
                    )
                    .then(() => refresh())
                    .then(() => showSavedMessage())
                    .catch((error) => {
                      updatePreferences(previousPreferences);
                      setDraftProfile(previousDraftProfile);
                      showErrorMessage(
                        error instanceof Error
                          ? error.message
                          : "No se pudo restaurar la cuenta",
                      );
                    });
                }}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                {copy.resetAccount}
              </button>
            </div>
            <div className="rounded-[20px] border border-red-500/20 bg-red-500/[0.08] p-4 text-sm text-red-300">
              {copy.accountLocalNote}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
