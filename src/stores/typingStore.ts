import { create } from "zustand";

interface TypingState {
  typingByRoom: Map<string, string[]>;
  setTyping: (roomId: string, userIds: string[]) => void;
}

export const useTypingStore = create<TypingState>()((set, get) => ({
  typingByRoom: new Map(),

  setTyping: (roomId, userIds) => {
    const map = new Map(get().typingByRoom);
    if (userIds.length === 0) {
      map.delete(roomId);
    } else {
      map.set(roomId, userIds);
    }
    set({ typingByRoom: map });
  },
}));
