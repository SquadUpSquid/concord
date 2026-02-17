import { useEffect, useRef } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { getMatrixClient } from "@/lib/matrix";

export function RoomContextMenu() {
  const contextMenu = useUiStore((s) => s.contextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const openModal = useUiStore((s) => s.openModal);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu, closeContextMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const roomId = contextMenu.roomId;

  const handleMarkRead = () => {
    const client = getMatrixClient();
    if (!client) return;
    const room = client.getRoom(roomId);
    if (!room) return;
    const lastEvent = room.timeline[room.timeline.length - 1];
    if (lastEvent) {
      client.sendReadReceipt(lastEvent).catch(console.error);
    }
    useRoomStore.getState().updateRoom(roomId, { unreadCount: 0 });
    closeContextMenu();
  };

  const handleSettings = () => {
    selectRoom(roomId);
    closeContextMenu();
    openModal("roomSettings");
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(roomId);
    closeContextMenu();
  };

  const handleLeave = () => {
    selectRoom(roomId);
    closeContextMenu();
    openModal("leaveRoom");
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md bg-bg-floating py-1.5 shadow-xl"
      style={{ top: contextMenu.y, left: contextMenu.x }}
    >
      <button
        onClick={handleMarkRead}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        Mark as Read
      </button>

      <button
        onClick={handleSettings}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        Channel Settings
      </button>

      <button
        onClick={handleCopyId}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        Copy Room ID
      </button>

      <div className="mx-2 my-1 h-px bg-bg-active" />

      <button
        onClick={handleLeave}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red hover:bg-bg-hover"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Leave Channel
      </button>
    </div>
  );
}
