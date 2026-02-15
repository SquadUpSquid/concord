import { create } from "zustand";

export type PresenceStatus = "online" | "unavailable" | "offline";

export interface UserPresence {
  userId: string;
  presence: PresenceStatus;
  lastActiveAgo: number | null;
  statusMsg: string | null;
}

interface PresenceState {
  presenceByUser: Map<string, UserPresence>;
  setPresence: (userId: string, presence: UserPresence) => void;
}

export const usePresenceStore = create<PresenceState>()((set, get) => ({
  presenceByUser: new Map(),

  setPresence: (userId, presence) => {
    const map = new Map(get().presenceByUser);
    map.set(userId, presence);
    set({ presenceByUser: map });
  },
}));
