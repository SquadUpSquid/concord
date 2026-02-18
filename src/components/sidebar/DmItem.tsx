import { useMemo } from "react";
import { useUiStore } from "@/stores/uiStore";
import { usePresenceStore, PresenceStatus } from "@/stores/presenceStore";
import { useAuthStore } from "@/stores/authStore";
import { useMessageStore } from "@/stores/messageStore";
import { Avatar } from "@/components/common/Avatar";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";

interface DmItemProps {
  roomId: string;
  name: string;
  unreadCount: number;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Resolve the "other user" in a 1-on-1 DM room.
 * Returns their userId, displayName, and avatarUrl.
 */
function useOtherDmUser(roomId: string) {
  const myUserId = useAuthStore((s) => s.userId);
  const client = getMatrixClient();

  return useMemo(() => {
    if (!client) return { userId: null, displayName: null, avatarUrl: null };
    const room = client.getRoom(roomId);
    if (!room) return { userId: null, displayName: null, avatarUrl: null };

    const members = room.getJoinedMembers();
    const other = members.find((m) => m.userId !== myUserId) ?? members[0];
    if (!other) return { userId: null, displayName: null, avatarUrl: null };

    const hs = client.getHomeserverUrl();
    return {
      userId: other.userId,
      displayName: other.name || other.userId,
      avatarUrl: mxcToHttp(other.getMxcAvatarUrl(), hs),
    };
  }, [roomId, myUserId, client]);
}

export function DmItem({ roomId, name, unreadCount, isSelected, onClick }: DmItemProps) {
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const { userId: otherUserId, displayName, avatarUrl } = useOtherDmUser(roomId);

  const presence: PresenceStatus = usePresenceStore(
    (s) => s.presenceByUser.get(otherUserId ?? "")?.presence ?? "offline"
  );

  // Get last message preview from the message store
  const lastMessage = useMessageStore((s) => {
    const msgs = s.messagesByRoom.get(roomId);
    if (!msgs || msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  });

  const hasUnread = unreadCount > 0;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(roomId, e.clientX, e.clientY);
  };

  // Build a short preview string
  let preview = "";
  if (lastMessage) {
    if (lastMessage.type === "m.room.message") {
      preview = lastMessage.body;
    } else if (lastMessage.isRedacted) {
      preview = "Message deleted";
    } else {
      preview = lastMessage.body || "";
    }
  }

  const shownName = displayName || name;

  return (
    <button
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
        isSelected
          ? "bg-bg-active text-text-primary"
          : hasUnread
            ? "text-text-primary hover:bg-bg-hover"
            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      {/* Avatar with presence dot */}
      <Avatar
        name={shownName}
        url={avatarUrl}
        size={32}
        presence={presence}
      />

      {/* Name + preview */}
      <div className="flex-1 overflow-hidden">
        <p className={`truncate text-sm ${hasUnread && !isSelected ? "font-semibold text-text-primary" : ""}`}>
          {shownName}
        </p>
        {preview && (
          <p className="truncate text-xs text-text-muted">
            {preview}
          </p>
        )}
      </div>

      {/* Unread badge */}
      {hasUnread && (
        <span className="min-w-[18px] flex-shrink-0 rounded-full bg-red px-1.5 py-0.5 text-center text-xs font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
