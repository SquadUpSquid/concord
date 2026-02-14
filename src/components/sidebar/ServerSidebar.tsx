import { useRoomStore } from "@/stores/roomStore";
import { ServerIcon } from "./ServerIcon";

export function ServerSidebar() {
  const rooms = useRoomStore((s) => s.rooms);
  const selectedSpaceId = useRoomStore((s) => s.selectedSpaceId);
  const selectSpace = useRoomStore((s) => s.selectSpace);

  const spaces = Array.from(rooms.values()).filter((r) => r.isSpace);

  return (
    <div className="flex w-[72px] flex-col items-center gap-2 overflow-y-auto bg-bg-tertiary py-3">
      {/* Home button - shows all DMs / ungrouped rooms */}
      <button
        onClick={() => selectSpace(null)}
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all hover:rounded-xl ${
          selectedSpaceId === null
            ? "rounded-xl bg-accent text-white"
            : "bg-bg-primary text-text-primary hover:bg-accent hover:text-white"
        }`}
      >
        <svg
          className="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </button>

      <div className="mx-auto h-px w-8 bg-bg-active" />

      {spaces.map((space) => (
        <ServerIcon
          key={space.roomId}
          name={space.name}
          avatarUrl={space.avatarUrl}
          isSelected={selectedSpaceId === space.roomId}
          unreadCount={space.unreadCount}
          onClick={() => selectSpace(space.roomId)}
        />
      ))}
    </div>
  );
}
