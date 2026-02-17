import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChannelPrefs {
  isFavorite: boolean;
  isMuted: boolean;
}

interface ChannelPrefsState {
  prefs: Record<string, ChannelPrefs>;
  toggleFavorite: (roomId: string) => void;
  toggleMuted: (roomId: string) => void;
  isFavorite: (roomId: string) => boolean;
  isMuted: (roomId: string) => boolean;
}

export const useChannelPrefsStore = create<ChannelPrefsState>()(
  persist(
    (set, get) => ({
      prefs: {},

      toggleFavorite: (roomId) =>
        set((s) => {
          const existing = s.prefs[roomId] ?? { isFavorite: false, isMuted: false };
          return { prefs: { ...s.prefs, [roomId]: { ...existing, isFavorite: !existing.isFavorite } } };
        }),

      toggleMuted: (roomId) =>
        set((s) => {
          const existing = s.prefs[roomId] ?? { isFavorite: false, isMuted: false };
          return { prefs: { ...s.prefs, [roomId]: { ...existing, isMuted: !existing.isMuted } } };
        }),

      isFavorite: (roomId) => get().prefs[roomId]?.isFavorite ?? false,

      isMuted: (roomId) => get().prefs[roomId]?.isMuted ?? false,
    }),
    { name: "concord-channel-prefs" }
  )
);
