import { useRoomStore } from "@/stores/roomStore";
import { useUiStore } from "@/stores/uiStore";
import { ServerIcon } from "./ServerIcon";
import { useMemo } from "react";
import { SpaceContextMenu } from "./SpaceContextMenu";

export function ServerSidebar() {
  const rooms = useRoomStore((s) => s.rooms);
  const selectedSpaceId = useRoomStore((s) => s.selectedSpaceId);
  const selectSpace = useRoomStore((s) => s.selectSpace);
  const openModal = useUiStore((s) => s.openModal);

  const spaces = Array.from(rooms.values()).filter((r) => r.isSpace);
  const openSpaceContextMenu = useUiStore((s) => s.openSpaceContextMenu);

  // Aggregate unread counts: for each space, sum unreads of its child rooms
  // For "home" (null space), sum unreads of rooms with no parent
  const unreadCounts = useMemo(() => {
    const counts = new Map<string | null, number>();
    let homeUnread = 0;

    for (const room of rooms.values()) {
      if (room.isSpace) continue;
      if (room.parentSpaceId) {
        counts.set(
          room.parentSpaceId,
          (counts.get(room.parentSpaceId) ?? 0) + room.unreadCount
        );
      } else {
        homeUnread += room.unreadCount;
      }
    }
    counts.set(null, homeUnread);
    return counts;
  }, [rooms]);

  const homeUnread = unreadCounts.get(null) ?? 0;

  return (
    <div className="flex w-[72px] flex-col items-center gap-2 overflow-y-auto scrollbar-none bg-bg-tertiary py-3">
      {/* Home button */}
      <div className="group relative">
        {/* Selection pill */}
        <div
          className={`absolute -left-1 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-text-primary transition-all ${
            selectedSpaceId === null ? "h-10" : homeUnread > 0 ? "h-2" : "h-0 group-hover:h-5"
          }`}
        />
        <button
          onClick={() => selectSpace(null)}
          className={`relative flex h-12 w-12 items-center justify-center transition-all hover:rounded-xl ${
            selectedSpaceId === null
              ? "rounded-xl bg-accent text-white"
              : "rounded-2xl bg-bg-primary text-text-primary hover:bg-accent hover:text-white"
          }`}
        >
          <svg
            className="h-6 w-6"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {homeUnread > 0 && selectedSpaceId !== null && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white ring-2 ring-bg-tertiary">
              {homeUnread > 99 ? "99+" : homeUnread}
            </span>
          )}
        </button>
      </div>

      <div className="mx-auto h-px w-8 bg-bg-active" />

      {spaces.map((space) => (
        <div
          key={space.roomId}
          onContextMenu={(e) => {
            e.preventDefault();
            openSpaceContextMenu(space.roomId, e.clientX, e.clientY);
          }}
        >
          <ServerIcon
            name={space.name}
            avatarUrl={space.avatarUrl}
            mxcAvatarUrl={space.mxcAvatarUrl}
            isSelected={selectedSpaceId === space.roomId}
            unreadCount={unreadCounts.get(space.roomId) ?? 0}
            onClick={() => selectSpace(space.roomId)}
          />
        </div>
      ))}

      {/* Create space button */}
      <button
        onClick={() => openModal("createSpace")}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-primary text-green transition-all hover:rounded-xl hover:bg-green hover:text-white"
        title="Create a space"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <SpaceContextMenu />
    </div>
  );
}
