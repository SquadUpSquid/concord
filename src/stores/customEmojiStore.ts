import { create } from "zustand";
import { getMatrixClient } from "@/lib/matrix";

export interface CustomEmoji {
  shortcode: string;
  url: string; // mxc:// URL
  body?: string;
  usage?: ("emoticon" | "sticker")[];
}

export interface EmojiPack {
  displayName?: string;
  avatarUrl?: string;
  emojis: CustomEmoji[];
}

interface CustomEmojiState {
  /** Room-level emoji packs: roomId -> pack name -> EmojiPack */
  roomPacks: Map<string, Map<string, EmojiPack>>;
  /** User-level emojis from account data */
  userPack: EmojiPack | null;

  loadRoomEmojis: (roomId: string) => void;
  loadUserEmojis: () => void;
  getEmojisForRoom: (roomId: string) => CustomEmoji[];
  resolveShortcode: (roomId: string, shortcode: string) => string | null;
  setRoomPack: (roomId: string, packKey: string, pack: EmojiPack) => void;
}

function parseImagePack(content: Record<string, unknown>): EmojiPack {
  const images = (content.images ?? {}) as Record<
    string,
    { url?: string; body?: string; usage?: string[] }
  >;
  const pack = content.pack as
    | { display_name?: string; avatar_url?: string; usage?: string[] }
    | undefined;

  const emojis: CustomEmoji[] = [];
  for (const [shortcode, img] of Object.entries(images)) {
    if (!img.url) continue;
    emojis.push({
      shortcode,
      url: img.url,
      body: img.body,
      usage: img.usage as CustomEmoji["usage"],
    });
  }

  return {
    displayName: pack?.display_name,
    avatarUrl: pack?.avatar_url,
    emojis,
  };
}

export const useCustomEmojiStore = create<CustomEmojiState>()((set, get) => ({
  roomPacks: new Map(),
  userPack: null,

  loadRoomEmojis: (roomId: string) => {
    const client = getMatrixClient();
    if (!client) return;
    const room = client.getRoom(roomId);
    if (!room) return;

    const stateEvents = room.currentState.getStateEvents(
      "im.ponies.room_emotes" as any,
    );

    const packs = new Map<string, EmojiPack>();
    if (Array.isArray(stateEvents)) {
      for (const ev of stateEvents) {
        const key = ev.getStateKey() ?? "";
        const content = ev.getContent();
        if (content && typeof content === "object") {
          const pack = parseImagePack(content as Record<string, unknown>);
          if (pack.emojis.length > 0) {
            packs.set(key, pack);
          }
        }
      }
    }

    const roomPacks = new Map(get().roomPacks);
    roomPacks.set(roomId, packs);
    set({ roomPacks });
  },

  loadUserEmojis: () => {
    const client = getMatrixClient();
    if (!client) return;

    const event = client.getAccountData("im.ponies.user_emotes" as any);
    if (!event) {
      set({ userPack: null });
      return;
    }

    const content = event.getContent();
    if (content && typeof content === "object") {
      set({ userPack: parseImagePack(content as Record<string, unknown>) });
    }
  },

  getEmojisForRoom: (roomId: string): CustomEmoji[] => {
    const { roomPacks, userPack } = get();
    const emojis: CustomEmoji[] = [];
    const seen = new Set<string>();

    const packs = roomPacks.get(roomId);
    if (packs) {
      for (const pack of packs.values()) {
        for (const e of pack.emojis) {
          if (!seen.has(e.shortcode)) {
            seen.add(e.shortcode);
            emojis.push(e);
          }
        }
      }
    }

    if (userPack) {
      for (const e of userPack.emojis) {
        if (!seen.has(e.shortcode)) {
          seen.add(e.shortcode);
          emojis.push(e);
        }
      }
    }

    return emojis;
  },

  resolveShortcode: (roomId: string, shortcode: string): string | null => {
    const { roomPacks, userPack } = get();

    const packs = roomPacks.get(roomId);
    if (packs) {
      for (const pack of packs.values()) {
        for (const e of pack.emojis) {
          if (e.shortcode === shortcode) return e.url;
        }
      }
    }

    if (userPack) {
      for (const e of userPack.emojis) {
        if (e.shortcode === shortcode) return e.url;
      }
    }

    return null;
  },

  setRoomPack: (roomId: string, packKey: string, pack: EmojiPack) => {
    const roomPacks = new Map(get().roomPacks);
    const packs = new Map(roomPacks.get(roomId) ?? new Map());
    packs.set(packKey, pack);
    roomPacks.set(roomId, packs);
    set({ roomPacks });
  },
}));
