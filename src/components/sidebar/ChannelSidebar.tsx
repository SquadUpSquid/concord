import { useRoomStore } from "@/stores/roomStore";
import { ChannelItem } from "./ChannelItem";
import { useAuthStore } from "@/stores/authStore";
import { destroyMatrixClient } from "@/lib/matrix";

export function ChannelSidebar() {
  const rooms = useRoomStore((s) => s.rooms);
  const selectedSpaceId = useRoomStore((s) => s.selectedSpaceId);
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const selectRoom = useRoomStore((s) => s.selectRoom);

  const channels = Array.from(rooms.values()).filter((r) => {
    if (r.isSpace) return false;
    if (selectedSpaceId === null) return r.parentSpaceId === null;
    return r.parentSpaceId === selectedSpaceId;
  });

  channels.sort((a, b) => a.name.localeCompare(b.name));

  const spaceName = selectedSpaceId
    ? rooms.get(selectedSpaceId)?.name ?? "Space"
    : "Direct Messages";

  const handleLogout = async () => {
    await destroyMatrixClient();
    useAuthStore.getState().logout();
  };

  return (
    <div className="flex w-60 flex-col bg-bg-secondary">
      {/* Header */}
      <div className="flex h-12 items-center border-b border-bg-tertiary px-4 shadow-sm">
        <h2 className="truncate text-sm font-semibold text-text-primary">
          {spaceName}
        </h2>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {channels.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-text-muted">
            No channels
          </p>
        )}
        {channels.map((ch) => (
          <ChannelItem
            key={ch.roomId}
            name={ch.name}
            unreadCount={ch.unreadCount}
            isSelected={selectedRoomId === ch.roomId}
            onClick={() => selectRoom(ch.roomId)}
          />
        ))}
      </div>

      {/* User section */}
      <div className="flex items-center gap-2 border-t border-bg-tertiary bg-bg-floating/50 px-2 py-2">
        <div className="h-8 w-8 rounded-full bg-accent" />
        <div className="flex-1 truncate text-xs text-text-secondary">
          {useAuthStore.getState().userId}
        </div>
        <button
          onClick={handleLogout}
          className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          title="Log out"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
