import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChannelListType = "text" | "voice";

export interface SpaceChannelOrder {
  text: string[];
  voice: string[];
}

interface ChannelOrderState {
  /** spaceId -> ordered room IDs for text and voice */
  orderBySpace: Record<string, SpaceChannelOrder>;

  getOrder: (spaceId: string, type: ChannelListType) => string[];
  setOrder: (spaceId: string, type: ChannelListType, roomIds: string[]) => void;
  reorderChannel: (
    spaceId: string,
    type: ChannelListType,
    roomId: string,
    insertIndex: number,
    currentOrder?: string[]
  ) => void;
}

function sortByOrder<T extends { roomId: string; name: string }>(
  channels: T[],
  orderIds: string[]
): T[] {
  if (orderIds.length === 0) return [...channels].sort((a, b) => a.name.localeCompare(b.name));
  const orderMap = new Map(orderIds.map((id, i) => [id, i]));
  return [...channels].sort((a, b) => {
    const ai = orderMap.get(a.roomId) ?? 1e9;
    const bi = orderMap.get(b.roomId) ?? 1e9;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

export function sortChannelsByOrder<T extends { roomId: string; name: string }>(
  channels: T[],
  orderIds: string[]
): T[] {
  return sortByOrder(channels, orderIds);
}

export const useChannelOrderStore = create<ChannelOrderState>()(
  persist(
    (set, get) => ({
      orderBySpace: {},

      getOrder(spaceId: string, type: ChannelListType): string[] {
        return get().orderBySpace[spaceId]?.[type] ?? [];
      },

      setOrder(spaceId: string, type: ChannelListType, roomIds: string[]) {
        set((state) => {
          const next = { ...state.orderBySpace };
          const space = next[spaceId] ?? { text: [], voice: [] };
          next[spaceId] = { ...space, [type]: roomIds };
          return { orderBySpace: next };
        });
      },

      reorderChannel(spaceId: string, type: ChannelListType, roomId: string, insertIndex: number, currentOrder?: string[]) {
        const order = get().getOrder(spaceId, type);
        const base = order.length > 0 ? order : currentOrder ?? [];
        const without = base.filter((id) => id !== roomId);
        const next = [...without.slice(0, insertIndex), roomId, ...without.slice(insertIndex)];
        get().setOrder(spaceId, type, next);
      },
    }),
    { name: "concord-channel-order" }
  )
);
