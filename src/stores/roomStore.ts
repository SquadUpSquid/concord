import { create } from "zustand";

export type ChannelType = "text" | "voice";
export type RoomMembership = "join" | "invite" | "leave";

export interface RoomSummary {
  roomId: string;
  name: string;
  avatarUrl: string | null;
  mxcAvatarUrl: string | null;
  topic: string | null;
  unreadCount: number;
  isSpace: boolean;
  parentSpaceId: string | null;
  lastMessageTs: number;
  channelType: ChannelType;
  membership: RoomMembership;
  isDm: boolean;
  inviteSender: string | null;
  /** Minimum power level required to view this channel (Discord-style). 0 = everyone. */
  minPowerLevelToView: number;
  /** Current user's power level in this room (for filtering by access). */
  myPowerLevel: number;
}

interface RoomState {
  rooms: Map<string, RoomSummary>;
  selectedSpaceId: string | null;
  selectedRoomId: string | null;
  syncState: "STOPPED" | "SYNCING" | "PREPARED" | "ERROR";

  setRooms: (rooms: Map<string, RoomSummary>) => void;
  updateRoom: (roomId: string, update: Partial<RoomSummary>) => void;
  removeRoom: (roomId: string) => void;
  selectSpace: (spaceId: string | null) => void;
  selectRoom: (roomId: string | null) => void;
  setSyncState: (state: RoomState["syncState"]) => void;
}

export const useRoomStore = create<RoomState>()((set, get) => ({
  rooms: new Map(),
  selectedSpaceId: null,
  selectedRoomId: null,
  syncState: "STOPPED",

  setRooms: (rooms) => set({ rooms }),

  updateRoom: (roomId, update) => {
    const rooms = new Map(get().rooms);
    const existing = rooms.get(roomId);
    if (existing) {
      rooms.set(roomId, { ...existing, ...update });
      set({ rooms });
    }
  },

  removeRoom: (roomId) => {
    const rooms = new Map(get().rooms);
    rooms.delete(roomId);
    const patch: Partial<RoomState> = { rooms };
    if (get().selectedRoomId === roomId) patch.selectedRoomId = null;
    set(patch);
  },

  selectSpace: (spaceId) => set({ selectedSpaceId: spaceId, selectedRoomId: null }),

  selectRoom: (roomId) => set({ selectedRoomId: roomId }),

  setSyncState: (syncState) => set({ syncState }),
}));
