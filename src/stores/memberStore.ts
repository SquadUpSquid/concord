import { create } from "zustand";

export interface Member {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  membership: string;
  powerLevel: number;
}

interface MemberState {
  membersByRoom: Map<string, Member[]>;
  setMembers: (roomId: string, members: Member[]) => void;
}

export const useMemberStore = create<MemberState>()((set, get) => ({
  membersByRoom: new Map(),

  setMembers: (roomId, members) => {
    const map = new Map(get().membersByRoom);
    map.set(roomId, members);
    set({ membersByRoom: map });
  },
}));
