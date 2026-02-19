import { create } from "zustand";

export interface Member {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  mxcAvatarUrl: string | null;
  membership: string;
  powerLevel: number;
}

interface MemberState {
  membersByRoom: Map<string, Member[]>;
  setMembers: (roomId: string, members: Member[]) => void;
  updateMemberPowerLevel: (roomId: string, userId: string, powerLevel: number) => void;
}

export const useMemberStore = create<MemberState>()((set, get) => ({
  membersByRoom: new Map(),

  setMembers: (roomId, members) => {
    const map = new Map(get().membersByRoom);
    map.set(roomId, members);
    set({ membersByRoom: map });
  },

  updateMemberPowerLevel: (roomId, userId, powerLevel) => {
    const map = new Map(get().membersByRoom);
    const members = map.get(roomId);
    if (!members) return;
    const updated = members.map((m) =>
      m.userId === userId ? { ...m, powerLevel } : m
    );
    map.set(roomId, updated);
    set({ membersByRoom: map });
  },
}));
