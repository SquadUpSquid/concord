import { Message, useMessageStore } from "@/stores/messageStore";
import { formatTimestamp } from "@/utils/formatters";
import { Avatar } from "@/components/common/Avatar";
import { MessageContent } from "./MessageContent";
import { ReactionBar } from "./ReactionBar";
import { getMatrixClient } from "@/lib/matrix";
import { useState, useRef } from "react";

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
}

const QUICK_EMOJIS = ["\u{1F44D}", "\u{2764}\uFE0F", "\u{1F602}", "\u{1F622}", "\u{1F440}", "\u{1F389}"];

function ReactionPicker({
  eventId,
  roomId,
  onClose,
}: {
  eventId: string;
  roomId: string;
  onClose: () => void;
}) {
  const client = getMatrixClient();

  const handlePick = async (emoji: string) => {
    if (!client) return;
    onClose();
    try {
      await client.sendEvent(roomId, "m.reaction" as any, {
        "m.relates_to": {
          rel_type: "m.annotation",
          event_id: eventId,
          key: emoji,
        },
      });
    } catch (err) {
      console.error("Failed to send reaction:", err);
    }
  };

  return (
    <div className="flex gap-1 rounded-lg bg-bg-floating p-1.5 shadow-lg">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handlePick(emoji)}
          className="rounded p-1 text-lg hover:bg-bg-hover"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ReplyContext({ reply }: { reply: NonNullable<Message["replyToEvent"]> }) {
  return (
    <div className="mb-1 flex items-center gap-1.5 text-xs text-text-muted">
      <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 17l-5-5 5-5M4 12h16" />
      </svg>
      <span className="font-medium text-text-secondary">{reply.senderName}</span>
      <span className="truncate">{reply.body}</span>
    </div>
  );
}

export function MessageItem({ message, showHeader }: MessageItemProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const setReplyingTo = useMessageStore((s) => s.setReplyingTo);

  const handleReply = () => {
    setReplyingTo(message);
  };

  const actionButtons = (
    <div className="absolute -top-3 right-4 hidden gap-0.5 rounded bg-bg-floating shadow group-hover:flex">
      <button
        onClick={handleReply}
        className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        title="Reply"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 17l-5-5 5-5M4 12h16" />
        </svg>
      </button>
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          title="Add reaction"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
          </svg>
        </button>
        {showPicker && (
          <div className="absolute bottom-full right-0 z-10 mb-1">
            <ReactionPicker
              eventId={message.eventId}
              roomId={message.roomId}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (showHeader) {
    return (
      <div className="group relative mt-4 flex gap-3 py-0.5 hover:bg-bg-hover/50">
        {actionButtons}
        <Avatar
          name={message.senderName}
          url={message.senderAvatar}
          size={40}
        />
        <div className="flex-1 overflow-hidden">
          {message.replyToEvent && <ReplyContext reply={message.replyToEvent} />}
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-text-primary">
              {message.senderName}
            </span>
            <span className="text-xs text-text-muted">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          <MessageContent body={message.body} formattedBody={message.formattedBody} />
          <ReactionBar reactions={message.reactions} eventId={message.eventId} roomId={message.roomId} />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex gap-3 py-0.5 hover:bg-bg-hover/50">
      {actionButtons}
      <div className="w-10 flex-shrink-0">
        <span className="hidden text-xs text-text-muted group-hover:inline">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="flex-1">
        {message.replyToEvent && <ReplyContext reply={message.replyToEvent} />}
        <MessageContent body={message.body} formattedBody={message.formattedBody} />
        <ReactionBar reactions={message.reactions} eventId={message.eventId} roomId={message.roomId} />
      </div>
    </div>
  );
}
