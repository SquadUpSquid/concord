import { useState, useEffect, useRef, useMemo } from "react";
import { useRoomStore, type RoomSummary } from "@/stores/roomStore";
import { Avatar } from "./Avatar";

interface QuickSwitcherProps {
  onClose: () => void;
}

export function QuickSwitcher({ onClose }: QuickSwitcherProps) {
  const rooms = useRoomStore((s) => s.rooms);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const selectSpace = useRoomStore((s) => s.selectSpace);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allRooms = useMemo(() => {
    return Array.from(rooms.values()).filter((r) => {
      if (r.isSpace || r.membership !== "join") return false;
      const required = r.minPowerLevelToView ?? 0;
      if (required > 0) {
        const myLevel = r.myPowerLevel ?? 0;
        if (myLevel < required) return false;
      }
      return true;
    });
  }, [rooms]);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return allRooms.sort((a, b) => b.lastMessageTs - a.lastMessageTs).slice(0, 15);
    }
    const q = query.toLowerCase();
    return allRooms
      .filter((r) => r.name.toLowerCase().includes(q) || r.roomId.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return b.lastMessageTs - a.lastMessageTs;
      })
      .slice(0, 15);
  }, [query, allRooms]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const navigate = (room: RoomSummary) => {
    if (room.parentSpaceId) {
      selectSpace(room.parentSpaceId);
    } else {
      selectSpace(null);
    }
    selectRoom(room.roomId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) navigate(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg bg-bg-primary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-4">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Where would you like to go?"
            className="w-full rounded-sm bg-bg-input p-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-text-muted">
              No channels found
            </p>
          )}
          {filtered.map((room, i) => (
            <button
              key={room.roomId}
              onClick={() => navigate(room)}
              className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors ${
                i === selectedIndex ? "bg-accent/20 text-text-primary" : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <Avatar name={room.name} url={room.avatarUrl} mxcUrl={room.mxcAvatarUrl} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    {room.channelType === "voice" ? (
                      <svg className="inline h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      </svg>
                    ) : "#"}
                  </span>
                  <span className="truncate text-sm font-medium">{room.name}</span>
                  {room.unreadCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
                      {room.unreadCount > 99 ? "99+" : room.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              {room.parentSpaceId && (
                <span className="text-[10px] text-text-muted">
                  {rooms.get(room.parentSpaceId)?.name ?? ""}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-bg-active px-4 py-2 text-[10px] text-text-muted">
          <span><kbd className="rounded bg-bg-active px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="rounded bg-bg-active px-1 py-0.5 font-mono">↵</kbd> select</span>
          <span><kbd className="rounded bg-bg-active px-1 py-0.5 font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
