import { create } from "zustand";

export interface Reaction {
  key: string;
  count: number;
  userIds: string[];
}

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
  isDecryptionFailure: boolean;
  isEdited: boolean;
  isRedacted: boolean;
  replyToEvent: { senderId: string; senderName: string; body: string } | null;
  reactions: Reaction[];
  url: string | null;
  info: { mimetype?: string; size?: number; w?: number; h?: number } | null;
  threadRootId: string | null;
  threadReplyCount: number;
  threadLastReplyTs: number | null;
}

interface MessageState {
  messagesByRoom: Map<string, Message[]>;
  threadMessages: Map<string, Message[]>; // threadRootId -> messages
  activeThreadId: string | null;
  activeThreadRoomId: string | null;
  isLoadingHistory: boolean;
  replyingTo: Message | null;
  editingMessage: Message | null;

  addMessage: (roomId: string, message: Message) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  prependMessages: (roomId: string, messages: Message[]) => void;
  setLoadingHistory: (loading: boolean) => void;
  setReplyingTo: (message: Message | null) => void;
  setEditingMessage: (message: Message | null) => void;
  updateMessage: (roomId: string, eventId: string, partial: Partial<Message>) => void;
  removeMessage: (roomId: string, eventId: string) => void;
  updateReactions: (roomId: string, eventId: string, reactions: Reaction[]) => void;
  openThread: (roomId: string, threadRootId: string) => void;
  closeThread: () => void;
  setThreadMessages: (threadRootId: string, messages: Message[]) => void;
  addThreadMessage: (threadRootId: string, message: Message) => void;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  messagesByRoom: new Map(),
  threadMessages: new Map(),
  activeThreadId: null,
  activeThreadRoomId: null,
  isLoadingHistory: false,
  replyingTo: null,
  editingMessage: null,

  addMessage: (roomId, message) => {
    // If this message belongs to a thread, route it to thread messages and update the root
    if (message.threadRootId) {
      const threadMap = new Map(get().threadMessages);
      const existing = threadMap.get(message.threadRootId) ?? [];
      threadMap.set(message.threadRootId, [...existing, message]);

      // Update the thread root's reply count in the main room messages
      const roomMap = new Map(get().messagesByRoom);
      const roomMsgs = roomMap.get(roomId);
      if (roomMsgs) {
        const updated = roomMsgs.map((m) =>
          m.eventId === message.threadRootId
            ? {
                ...m,
                threadReplyCount: m.threadReplyCount + 1,
                threadLastReplyTs: message.timestamp,
              }
            : m
        );
        roomMap.set(roomId, updated);
      }
      set({ threadMessages: threadMap, messagesByRoom: roomMap });
      return;
    }

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

  setReplyingTo: (replyingTo) => set({ replyingTo, editingMessage: null }),

  setEditingMessage: (editingMessage) => set({ editingMessage, replyingTo: null }),

  updateMessage: (roomId, eventId, partial) => {
    const map = new Map(get().messagesByRoom);
    const messages = map.get(roomId);
    if (!messages) return;
    const updated = messages.map((m) =>
      m.eventId === eventId ? { ...m, ...partial } : m
    );
    map.set(roomId, updated);
    set({ messagesByRoom: map });
  },

  removeMessage: (roomId, eventId) => {
    const map = new Map(get().messagesByRoom);
    const messages = map.get(roomId);
    if (!messages) return;
    map.set(roomId, messages.filter((m) => m.eventId !== eventId));
    set({ messagesByRoom: map });
  },

  updateReactions: (roomId, eventId, reactions) => {
    const map = new Map(get().messagesByRoom);
    const messages = map.get(roomId);
    if (!messages) return;
    const updated = messages.map((m) =>
      m.eventId === eventId ? { ...m, reactions } : m
    );
    map.set(roomId, updated);
    set({ messagesByRoom: map });
  },

  openThread: (roomId, threadRootId) =>
    set({ activeThreadId: threadRootId, activeThreadRoomId: roomId }),

  closeThread: () =>
    set({ activeThreadId: null, activeThreadRoomId: null }),

  setThreadMessages: (threadRootId, messages) => {
    const map = new Map(get().threadMessages);
    map.set(threadRootId, messages);
    set({ threadMessages: map });
  },

  addThreadMessage: (threadRootId, message) => {
    const map = new Map(get().threadMessages);
    const existing = map.get(threadRootId) ?? [];
    if (existing.some((m) => m.eventId === message.eventId)) return;
    map.set(threadRootId, [...existing, message]);
    set({ threadMessages: map });
  },
}));
