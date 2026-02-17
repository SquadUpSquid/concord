import { useEffect, useRef, useState, useCallback } from "react";
import { useMessageStore } from "@/stores/messageStore";
import { useRoomStore } from "@/stores/roomStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { MessageItem } from "./MessageItem";
import { getMatrixClient } from "@/lib/matrix";
import { loadMoreMessages } from "@/lib/matrixEventHandlers";

interface MessageListProps {
  roomId: string;
}

const EMPTY_MESSAGES: import("@/stores/messageStore").Message[] = [];

export function MessageList({ roomId }: MessageListProps) {
  const messages = useMessageStore((s) => s.messagesByRoom.get(roomId) ?? EMPTY_MESSAGES);
  const isLoadingHistory = useMessageStore((s) => s.isLoadingHistory);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isNearBottomRef = useRef(true);

  // Auto-scroll when new messages arrive (only if already near bottom)
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowScrollBtn(true);
    }
  }, [messages.length]);

  const sendReadReceipts = useSettingsStore((s) => s.sendReadReceipts);

  // Send read receipt when viewing this room and when new messages arrive
  useEffect(() => {
    if (!messages.length) return;
    const client = getMatrixClient();
    if (!client) return;

    const room = client.getRoom(roomId);
    if (!room) return;

    if (sendReadReceipts) {
      const lastEvent = room.timeline[room.timeline.length - 1];
      if (lastEvent) {
        client.sendReadReceipt(lastEvent).catch(() => {});
      }
    }
    useRoomStore.getState().updateRoom(roomId, { unreadCount: 0 });
  }, [roomId, messages.length, sendReadReceipts]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom < 100;
    setShowScrollBtn(distFromBottom > 300);

    if (el.scrollTop === 0 && !isLoadingHistory) {
      const client = getMatrixClient();
      if (client) {
        loadMoreMessages(client, roomId);
      }
    }
  }, [isLoadingHistory, roomId]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-4"
      >
        {isLoadingHistory && (
          <div className="mb-4 text-center text-sm text-text-muted">
            Loading older messages...
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex h-full items-end pb-4">
            <p className="text-text-muted">
              This is the beginning of the conversation.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showHeader =
            !prev ||
            prev.senderId !== msg.senderId ||
            msg.timestamp - prev.timestamp > 5 * 60 * 1000;

          return (
            <MessageItem key={msg.eventId} message={msg} showHeader={showHeader} />
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-bg-floating shadow-lg transition-all hover:bg-bg-hover"
          title="Scroll to bottom"
        >
          <svg className="h-5 w-5 text-text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </button>
      )}
    </div>
  );
}
