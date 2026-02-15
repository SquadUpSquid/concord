import { useEffect, useRef } from "react";
import { useMessageStore } from "@/stores/messageStore";
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleScroll = () => {
    if (!listRef.current || isLoadingHistory) return;
    if (listRef.current.scrollTop === 0) {
      const client = getMatrixClient();
      if (client) {
        loadMoreMessages(client, roomId);
      }
    }
  };

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4"
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
  );
}
