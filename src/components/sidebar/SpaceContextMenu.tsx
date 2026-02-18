import { useEffect, useRef } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";

export function SpaceContextMenu() {
  const spaceContextMenu = useUiStore((s) => s.spaceContextMenu);
  const closeSpaceContextMenu = useUiStore((s) => s.closeSpaceContextMenu);
  const openModal = useUiStore((s) => s.openModal);
  const selectSpace = useRoomStore((s) => s.selectSpace);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!spaceContextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeSpaceContextMenu();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [spaceContextMenu, closeSpaceContextMenu]);

  useEffect(() => {
    if (!spaceContextMenu) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSpaceContextMenu();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [spaceContextMenu, closeSpaceContextMenu]);

  if (!spaceContextMenu) return null;

  const spaceId = spaceContextMenu.spaceId;

  const handleSettings = () => {
    selectSpace(spaceId);
    closeSpaceContextMenu();
    openModal("spaceSettings");
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(spaceId);
    closeSpaceContextMenu();
  };

  const handleInvite = () => {
    selectSpace(spaceId);
    closeSpaceContextMenu();
    openModal("spaceSettings");
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md bg-bg-floating py-1.5 shadow-xl"
      style={{ top: spaceContextMenu.y, left: spaceContextMenu.x }}
    >
      <button
        onClick={handleInvite}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <path d="M20 8v6M23 11h-6" />
        </svg>
        Invite People
      </button>

      <button
        onClick={handleSettings}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        Space Settings
      </button>

      <button
        onClick={handleCopyId}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        Copy Space ID
      </button>
    </div>
  );
}
