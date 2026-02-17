import { create } from "zustand";

export type ModalType =
  | "createRoom"
  | "createSpace"
  | "roomSettings"
  | "leaveRoom"
  | "createDm"
  | null;

interface UiState {
  showMemberSidebar: boolean;
  toggleMemberSidebar: () => void;

  activeModal: ModalType;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;

  contextMenu: { roomId: string; x: number; y: number } | null;
  openContextMenu: (roomId: string, x: number, y: number) => void;
  closeContextMenu: () => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  showMemberSidebar: false,
  toggleMemberSidebar: () => set({ showMemberSidebar: !get().showMemberSidebar }),

  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null, contextMenu: null }),

  contextMenu: null,
  openContextMenu: (roomId, x, y) => set({ contextMenu: { roomId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
}));
