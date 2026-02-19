import { useState } from "react";
import { getMatrixClient } from "@/lib/matrix";
import { Avatar } from "@/components/common/Avatar";
import type { RoomSummary } from "@/stores/roomStore";

interface InviteItemProps {
  room: RoomSummary;
}

export function InviteItem({ room }: InviteItemProps) {
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  const handleAccept = async () => {
    const client = getMatrixClient();
    if (!client || loading) return;
    setLoading("accept");
    try {
      await client.joinRoom(room.roomId);
    } catch (err) {
      console.error("Failed to accept invite:", err);
      setLoading(null);
    }
  };

  const handleDecline = async () => {
    const client = getMatrixClient();
    if (!client || loading) return;
    setLoading("decline");
    try {
      await client.leave(room.roomId);
    } catch (err) {
      console.error("Failed to decline invite:", err);
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1">
      <Avatar name={room.name} url={room.avatarUrl} mxcUrl={room.mxcAvatarUrl} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">{room.name}</p>
        {room.inviteSender && (
          <p className="truncate text-[10px] text-text-muted">
            from {room.inviteSender}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <button
          onClick={handleAccept}
          disabled={!!loading}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-green/20 text-green transition-colors hover:bg-green/30 disabled:opacity-50"
          title="Accept"
        >
          {loading === "accept" ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-green/30 border-t-green" />
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
        <button
          onClick={handleDecline}
          disabled={!!loading}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-red/20 text-red transition-colors hover:bg-red/30 disabled:opacity-50"
          title="Decline"
        >
          {loading === "decline" ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-red/30 border-t-red" />
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
