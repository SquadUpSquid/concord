import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

const THEME_VARS: Record<string, Record<string, string>> = {
  dark: {
    "--color-bg-primary": "#313338",
    "--color-bg-secondary": "#2b2d31",
    "--color-bg-tertiary": "#1e1f22",
    "--color-bg-floating": "#111214",
    "--color-bg-input": "#383a40",
    "--color-bg-hover": "#35373c",
    "--color-bg-active": "#404249",
    "--color-text-primary": "#f2f3f5",
    "--color-text-secondary": "#b5bac1",
    "--color-text-muted": "#949ba4",
    "--color-text-link": "#00a8fc",
  },
  midnight: {
    "--color-bg-primary": "#0e0e12",
    "--color-bg-secondary": "#0a0a0e",
    "--color-bg-tertiary": "#060608",
    "--color-bg-floating": "#040405",
    "--color-bg-input": "#1a1a22",
    "--color-bg-hover": "#151519",
    "--color-bg-active": "#1e1e28",
    "--color-text-primary": "#e0e0e8",
    "--color-text-secondary": "#a0a0b0",
    "--color-text-muted": "#70708a",
    "--color-text-link": "#00a8fc",
  },
  light: {
    "--color-bg-primary": "#ffffff",
    "--color-bg-secondary": "#f2f3f5",
    "--color-bg-tertiary": "#e3e5e8",
    "--color-bg-floating": "#ffffff",
    "--color-bg-input": "#e3e5e8",
    "--color-bg-hover": "#ebedef",
    "--color-bg-active": "#d4d7dc",
    "--color-text-primary": "#060607",
    "--color-text-secondary": "#4e5058",
    "--color-text-muted": "#80848e",
    "--color-text-link": "#006ce7",
  },
  grape: {
    "--color-bg-primary": "#2a1e35",
    "--color-bg-secondary": "#231a2e",
    "--color-bg-tertiary": "#1a1224",
    "--color-bg-floating": "#140e1c",
    "--color-bg-input": "#352840",
    "--color-bg-hover": "#32253e",
    "--color-bg-active": "#3d2e4a",
    "--color-text-primary": "#f0eaf5",
    "--color-text-secondary": "#bfb0d0",
    "--color-text-muted": "#8a7a9e",
    "--color-text-link": "#c084fc",
  },
  darkGreen: {
    "--color-bg-primary": "#1e3323",
    "--color-bg-secondary": "#162816",
    "--color-bg-tertiary": "#0f1f0f",
    "--color-bg-floating": "#0a180a",
    "--color-bg-input": "#2a3d2e",
    "--color-bg-hover": "#243828",
    "--color-bg-active": "#2e4534",
    "--color-text-primary": "#e8f5e9",
    "--color-text-secondary": "#a5d6a7",
    "--color-text-muted": "#81c784",
    "--color-text-link": "#4ade80",
  },
  darkOrange: {
    "--color-bg-primary": "#332013",
    "--color-bg-secondary": "#261b12",
    "--color-bg-tertiary": "#1a130c",
    "--color-bg-floating": "#140e08",
    "--color-bg-input": "#3d2e1f",
    "--color-bg-hover": "#382918",
    "--color-bg-active": "#45301a",
    "--color-text-primary": "#fff3e6",
    "--color-text-secondary": "#ffcc99",
    "--color-text-muted": "#e6994d",
    "--color-text-link": "#fb923c",
  },
  darkRed: {
    "--color-bg-primary": "#331e1e",
    "--color-bg-secondary": "#261616",
    "--color-bg-tertiary": "#1a0f0f",
    "--color-bg-floating": "#140a0a",
    "--color-bg-input": "#3d2626",
    "--color-bg-hover": "#382020",
    "--color-bg-active": "#452626",
    "--color-text-primary": "#fce8e8",
    "--color-text-secondary": "#f0a0a0",
    "--color-text-muted": "#d97373",
    "--color-text-link": "#f87171",
  },
  darkBlue: {
    "--color-bg-primary": "#1e2433",
    "--color-bg-secondary": "#161a26",
    "--color-bg-tertiary": "#0f121a",
    "--color-bg-floating": "#0a0d14",
    "--color-bg-input": "#262d3d",
    "--color-bg-hover": "#202633",
    "--color-bg-active": "#2a3140",
    "--color-text-primary": "#e8eaf5",
    "--color-text-secondary": "#a5b4fc",
    "--color-text-muted": "#818cf8",
    "--color-text-link": "#60a5fa",
  },
};

const FONT_SIZE_MAP: Record<string, string> = {
  small: "13px",
  normal: "15px",
  large: "18px",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const messageDisplay = useSettingsStore((s) => s.messageDisplay);

  useEffect(() => {
    const root = document.documentElement;
    const vars = THEME_VARS[theme] ?? THEME_VARS.dark;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    // Tell the browser whether native controls (selects, scrollbars, etc.)
    // should render in light or dark mode.
    root.style.colorScheme = theme === "light" ? "light" : "dark";
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--chat-font-size",
      FONT_SIZE_MAP[fontSize] ?? "15px"
    );
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute("data-display", messageDisplay);
  }, [messageDisplay]);

  return <>{children}</>;
}
