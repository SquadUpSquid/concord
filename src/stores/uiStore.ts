import { create } from "zustand";

interface UiState {
  showMemberSidebar: boolean;
  toggleMemberSidebar: () => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  showMemberSidebar: false,
  toggleMemberSidebar: () => set({ showMemberSidebar: !get().showMemberSidebar }),
}));
