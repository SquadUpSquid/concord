import { useEffect, useRef } from "react";
import { useUiStore } from "@/stores/uiStore";

export function RoomContextMenu() {
  const contextMenu = useUiStore((s) => s.contextMenu);
  const closeContextMenu = useUiStore((s) => s.closeContextMenu);
  const openModal = useUiStore((s) => s.openModal);
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

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-md bg-bg-floating py-1.5 shadow-xl"
      style={{ top: contextMenu.y, left: contextMenu.x }}
    >
      <button
        onClick={() => openModal("leaveRoom")}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red hover:bg-bg-hover"
      >
        Leave Channel
      </button>
    </div>
  );
}
