import { create } from "zustand";

export interface Message {
  eventId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  body: string;
  formattedBody: string | null;
  timestamp: number;
  type: string;
  isEncrypted: boolean;
}

interface MessageState {
  messagesByRoom: Map<string, Message[]>;
  isLoadingHistory: boolean;

  addMessage: (roomId: string, message: Message) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  prependMessages: (roomId: string, messages: Message[]) => void;
  setLoadingHistory: (loading: boolean) => void;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  messagesByRoom: new Map(),
  isLoadingHistory: false,

  addMessage: (roomId, message) => {
    const map = new Map(get().messagesByRoom);
    const existing = map.get(roomId) ?? [];
    map.set(roomId, [...existing, message]);
    set({ messagesByRoom: map });
  },

  setMessages: (roomId, messages) => {
    const map = new Map(get().messagesByRoom);
    map.set(roomId, messages);
    set({ messagesByRoom: map });
  },

  prependMessages: (roomId, messages) => {
    const map = new Map(get().messagesByRoom);
    const existing = map.get(roomId) ?? [];
    map.set(roomId, [...messages, ...existing]);
    set({ messagesByRoom: map });
  },

  setLoadingHistory: (isLoadingHistory) => set({ isLoadingHistory }),
}));
