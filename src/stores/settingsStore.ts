import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light" | "midnight";
export type FontSize = "small" | "normal" | "large";
export type MessageDisplay = "cozy" | "compact";

interface SettingsState {
  // Privacy
  sendReadReceipts: boolean;
  sendTypingIndicators: boolean;
  allowDmFromAnyone: boolean;

  // Appearance
  theme: ThemeMode;
  fontSize: FontSize;
  messageDisplay: MessageDisplay;

  // Notifications
  enableNotifications: boolean;
  enableNotificationSounds: boolean;
  notifyOnMentionsOnly: boolean;

  // Actions
  setSendReadReceipts: (v: boolean) => void;
  setSendTypingIndicators: (v: boolean) => void;
  setAllowDmFromAnyone: (v: boolean) => void;
  setTheme: (v: ThemeMode) => void;
  setFontSize: (v: FontSize) => void;
  setMessageDisplay: (v: MessageDisplay) => void;
  setEnableNotifications: (v: boolean) => void;
  setEnableNotificationSounds: (v: boolean) => void;
  setNotifyOnMentionsOnly: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Privacy defaults
      sendReadReceipts: true,
      sendTypingIndicators: true,
      allowDmFromAnyone: true,

      // Appearance defaults
      theme: "dark",
      fontSize: "normal",
      messageDisplay: "cozy",

      // Notification defaults
      enableNotifications: true,
      enableNotificationSounds: true,
      notifyOnMentionsOnly: false,

      // Actions
      setSendReadReceipts: (v) => set({ sendReadReceipts: v }),
      setSendTypingIndicators: (v) => set({ sendTypingIndicators: v }),
      setAllowDmFromAnyone: (v) => set({ allowDmFromAnyone: v }),
      setTheme: (v) => set({ theme: v }),
      setFontSize: (v) => set({ fontSize: v }),
      setMessageDisplay: (v) => set({ messageDisplay: v }),
      setEnableNotifications: (v) => set({ enableNotifications: v }),
      setEnableNotificationSounds: (v) => set({ enableNotificationSounds: v }),
      setNotifyOnMentionsOnly: (v) => set({ notifyOnMentionsOnly: v }),
    }),
    { name: "concord-settings" }
  )
);
