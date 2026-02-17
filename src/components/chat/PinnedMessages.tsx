import { useState, useEffect } from "react";
import { getMatrixClient } from "@/lib/matrix";
import { Avatar } from "@/components/common/Avatar";
import { mxcToHttp } from "@/utils/matrixHelpers";

interface PinnedMessage {
  eventId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  body: string;
  timestamp: number;
}

interface PinnedMessagesProps {
  roomId: string;
  onClose: () => void;
}

export function PinnedMessages({ roomId, onClose }: PinnedMessagesProps) {
  const [pinned, setPinned] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getMatrixClient();
    if (!client) return;

    const room = client.getRoom(roomId);
    if (!room) return;

    const hsUrl = client.getHomeserverUrl();
    const pinnedIds: string[] =
      room.currentState.getStateEvents("m.room.pinned_events", "")?.getContent()?.pinned ?? [];

    if (pinnedIds.length === 0) {
      setPinned([]);
      setLoading(false);
      return;
    }

    const messages: PinnedMessage[] = [];
    for (const eventId of pinnedIds) {
      const event = room.findEventById(eventId);
      if (event) {
        const sender = event.sender;
        messages.push({
          eventId,
          senderId: event.getSender() ?? "",
          senderName: sender?.name ?? event.getSender() ?? "Unknown",
          senderAvatar: sender ? mxcToHttp(sender.getMxcAvatarUrl(), hsUrl) : null,
          body: event.getContent()?.body ?? "(no text)",
          timestamp: event.getTs(),
        });
      }
    }

    setPinned(messages);
    setLoading(false);
  }, [roomId]);

  return (
    <div className="absolute right-0 top-full z-30 mt-1 w-80 rounded-lg bg-bg-floating shadow-xl">
      <div className="flex items-center justify-between border-b border-bg-active px-4 py-3">
        <h3 className="text-sm font-bold text-text-primary">Pinned Messages</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {loading && (
          <p className="py-4 text-center text-xs text-text-muted">Loading...</p>
        )}
        {!loading && pinned.length === 0 && (
          <p className="py-6 text-center text-xs text-text-muted">
            No pinned messages in this channel.
          </p>
        )}
        {pinned.map((msg) => (
          <div key={msg.eventId} className="rounded-sm p-3 hover:bg-bg-hover">
            <div className="mb-1 flex items-center gap-2">
              <Avatar name={msg.senderName} url={msg.senderAvatar} size={20} />
              <span className="text-xs font-medium text-text-primary">{msg.senderName}</span>
              <span className="text-[10px] text-text-muted">
                {new Date(msg.timestamp).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-text-secondary line-clamp-3">{msg.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
