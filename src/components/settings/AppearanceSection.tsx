import { useSettingsStore, type ThemeMode, type FontSize, type MessageDisplay } from "@/stores/settingsStore";

const THEMES: { id: ThemeMode; label: string; colors: { bg: string; sidebar: string; accent: string } }[] = [
  { id: "dark", label: "Dark", colors: { bg: "#313338", sidebar: "#2b2d31", accent: "#5865f2" } },
  { id: "midnight", label: "Midnight", colors: { bg: "#0e0e12", sidebar: "#0a0a0e", accent: "#5865f2" } },
  { id: "grape", label: "Grape", colors: { bg: "#2a1e35", sidebar: "#231a2e", accent: "#9b59b6" } },
  { id: "light", label: "Light", colors: { bg: "#ffffff", sidebar: "#f2f3f5", accent: "#5865f2" } },
];

const FONT_SIZES: { id: FontSize; label: string; px: number }[] = [
  { id: "small", label: "Small", px: 13 },
  { id: "normal", label: "Normal", px: 15 },
  { id: "large", label: "Large", px: 18 },
];

export function AppearanceSection() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const messageDisplay = useSettingsStore((s) => s.messageDisplay);
  const setMessageDisplay = useSettingsStore((s) => s.setMessageDisplay);

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">Appearance</h2>
      <p className="mb-6 text-sm text-text-muted">
        Customize the look and feel of Concord.
      </p>

      {/* Theme */}
      <div className="mb-6 rounded-lg bg-bg-secondary p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-text-secondary">Theme</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                theme === t.id
                  ? "border-accent bg-accent/10"
                  : "border-bg-active hover:border-text-muted/40"
              }`}
            >
              {/* Theme preview */}
              <div
                className="flex h-16 w-full overflow-hidden rounded-md"
                style={{ backgroundColor: t.colors.bg }}
              >
                <div className="w-1/4" style={{ backgroundColor: t.colors.sidebar }} />
                <div className="flex flex-1 flex-col justify-center gap-1 px-2">
                  <div className="h-1.5 w-3/4 rounded" style={{ backgroundColor: t.colors.accent, opacity: 0.6 }} />
                  <div className="h-1 w-1/2 rounded" style={{ backgroundColor: "#ffffff", opacity: 0.2 }} />
                  <div className="h-1 w-2/3 rounded" style={{ backgroundColor: "#ffffff", opacity: 0.15 }} />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-3.5 w-3.5 rounded-full border-2 ${
                    theme === t.id ? "border-accent bg-accent" : "border-text-muted"
                  }`}
                >
                  {theme === t.id && (
                    <svg className="h-full w-full text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium text-text-primary">{t.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message Display */}
      <div className="mb-6 rounded-lg bg-bg-secondary p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-text-secondary">Message Display</h3>
        <div className="flex gap-3">
          {(["cozy", "compact"] as MessageDisplay[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setMessageDisplay(mode)}
              className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
                messageDisplay === mode
                  ? "border-accent bg-accent/10"
                  : "border-bg-active hover:border-text-muted/40"
              }`}
            >
              <p className="mb-1 text-sm font-bold capitalize text-text-primary">{mode}</p>
              <p className="text-xs text-text-muted">
                {mode === "cozy"
                  ? "Avatars beside messages, more spacing for readability."
                  : "Smaller text, no avatars inline, fits more messages."}
              </p>
              {/* Preview */}
              <div className={`mt-3 flex flex-col rounded-md bg-bg-primary p-2 ${mode === "cozy" ? "gap-2" : "gap-0.5"}`}>
                {mode === "cozy" ? (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="h-6 w-6 rounded-full bg-accent/40" />
                      <div className="flex flex-col gap-0.5">
                        <div className="h-1.5 w-12 rounded bg-text-muted/30" />
                        <div className="h-1 w-24 rounded bg-text-muted/20" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-6 w-6 rounded-full bg-green/40" />
                      <div className="flex flex-col gap-0.5">
                        <div className="h-1.5 w-16 rounded bg-text-muted/30" />
                        <div className="h-1 w-20 rounded bg-text-muted/20" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-8 rounded bg-text-muted/30" />
                      <div className="h-1 w-16 rounded bg-text-muted/20" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-10 rounded bg-text-muted/30" />
                      <div className="h-1 w-12 rounded bg-text-muted/20" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-6 rounded bg-text-muted/30" />
                      <div className="h-1 w-20 rounded bg-text-muted/20" />
                    </div>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="rounded-lg bg-bg-secondary p-5">
        <h3 className="mb-4 text-sm font-bold uppercase text-text-secondary">Chat Font Size</h3>
        <div className="flex items-center gap-3">
          {FONT_SIZES.map((fs) => (
            <button
              key={fs.id}
              onClick={() => setFontSize(fs.id)}
              className={`flex-1 rounded-lg border-2 py-3 text-center transition-colors ${
                fontSize === fs.id
                  ? "border-accent bg-accent/10"
                  : "border-bg-active hover:border-text-muted/40"
              }`}
            >
              <span style={{ fontSize: fs.px }} className="font-medium text-text-primary">
                Aa
              </span>
              <p className="mt-1 text-[10px] text-text-muted">{fs.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
