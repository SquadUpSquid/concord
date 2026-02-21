import { useMemo, useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import type { ThemeMode, FontSize } from "@/stores/settingsStore";

const TOTAL_STEPS = 3;
const ONBOARDING_THEMES: { id: ThemeMode; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "midnight", label: "Midnight" },
];
const ONBOARDING_FONTS: { id: FontSize; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "normal", label: "Normal" },
  { id: "large", label: "Large" },
];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [notiStatus, setNotiStatus] = useState<string | null>(null);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setEnableNotifications = useSettingsStore((s) => s.setEnableNotifications);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);

  const stepTitle = useMemo(() => {
    if (step === 0) return "Welcome to Concord";
    if (step === 1) return "Appearance";
    return "Notifications";
  }, [step]);

  const requestNotifications = async () => {
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setEnableNotifications(true);
        setNotiStatus("Notifications enabled.");
      } else {
        setEnableNotifications(false);
        setNotiStatus("Notifications are disabled. You can change this later in Settings.");
      }
    } catch {
      setNotiStatus("Notification permission request failed on this platform.");
    }
  };

  const finish = () => {
    setOnboardingCompleted(true);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-lg rounded-lg border border-bg-active bg-bg-primary p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">{stepTitle}</h2>
          <span className="text-xs text-text-muted">Step {step + 1}/{TOTAL_STEPS}</span>
        </div>

        {step === 0 && (
          <div className="space-y-3 text-sm text-text-secondary">
            <p>Concord is ready. This quick setup helps you tune the app before you start chatting.</p>
            <ul className="space-y-1 text-text-muted">
              <li>Set your preferred look and text scale.</li>
              <li>Enable notifications.</li>
              <li>You can change everything later in Settings.</li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-text-secondary">Theme</p>
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setTheme(theme.id)}
                    className="rounded border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-text-secondary">Font Size</p>
              <div className="flex gap-2">
                {ONBOARDING_FONTS.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setFontSize(font.id)}
                    className="rounded border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-sm">
            <p className="text-text-secondary">Enable notifications so you can see new messages when Concord is in the background.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={requestNotifications}
                className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
              >
                Enable Notifications
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnableNotifications(false);
                  setNotiStatus("Notifications skipped.");
                }}
                className="rounded border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
              >
                Skip
              </button>
            </div>
            {notiStatus && <p className="text-xs text-text-muted">{notiStatus}</p>}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            Back
          </button>
          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              Finish Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
