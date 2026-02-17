import { Message, useMessageStore } from "@/stores/messageStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatTimestamp } from "@/utils/formatters";
import { Avatar } from "@/components/common/Avatar";
import { UserPopover } from "@/components/common/UserPopover";
import { MessageContent } from "./MessageContent";
import { ReactionBar } from "./ReactionBar";
import { EmojiPicker } from "./EmojiPicker";
import { getMatrixClient } from "@/lib/matrix";
import { useState, useRef, useEffect } from "react";

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
}

const QUICK_EMOJIS = ["\u{1F44D}", "\u{2764}\uFE0F", "\u{1F602}", "\u{1F622}", "\u{1F440}", "\u{1F389}"];

function EncryptedPlaceholder() {
  return (
    <div className="flex items-center gap-1.5 text-sm italic text-text-muted">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      <span>Unable to decrypt — message was sent before this device logged in</span>
    </div>
  );
}

function RedactedPlaceholder() {
  return (
    <div className="flex items-center gap-1.5 text-sm italic text-text-muted">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
      <span>This message was deleted.</span>
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

function MessageBody({ message }: { message: Message }) {
  if (message.isRedacted) return <RedactedPlaceholder />;
  if (message.isDecryptionFailure) return <EncryptedPlaceholder />;
  return (
    <div className="flex items-baseline gap-1">
      <MessageContent
        body={message.body}
        formattedBody={message.formattedBody}
        msgtype={message.type}
        url={message.url ?? undefined}
        info={message.info ?? undefined}
      />
      {message.isEdited && (
        <span className="text-[10px] text-text-muted">(edited)</span>
      )}
    </div>
  );
}

export function MessageItem({ message, showHeader }: MessageItemProps) {
  const [showQuickPicker, setShowQuickPicker] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const setReplyingTo = useMessageStore((s) => s.setReplyingTo);
  const setEditingMessage = useMessageStore((s) => s.setEditingMessage);
  const myUserId = useAuthStore((s) => s.userId);
  const isOwnMessage = message.senderId === myUserId;
  const messageDisplay = useSettingsStore((s) => s.messageDisplay);

  // Close full picker on click outside
  useEffect(() => {
    if (!showFullPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowFullPicker(false);
        setShowQuickPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFullPicker]);

  const handleReply = () => {
    setReplyingTo(message);
  };

  const handleEdit = () => {
    setEditingMessage(message);
  };

  const handleDelete = async () => {
    const client = getMatrixClient();
    if (!client) return;
    try {
      await client.redactEvent(message.roomId, message.eventId);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const sendReaction = async (emoji: string) => {
    const client = getMatrixClient();
    if (!client) return;
    setShowQuickPicker(false);
    setShowFullPicker(false);
    try {
      await client.sendEvent(message.roomId, "m.reaction" as any, {
        "m.relates_to": {
          rel_type: "m.annotation",
          event_id: message.eventId,
          key: emoji,
        },
      });
    } catch (err) {
      console.error("Failed to send reaction:", err);
    }
  };

  const handlePin = async () => {
    const client = getMatrixClient();
    if (!client) return;
    try {
      const room = client.getRoom(message.roomId);
      if (!room) return;
      const pinned: string[] =
        room.currentState.getStateEvents("m.room.pinned_events", "")?.getContent()?.pinned ?? [];
      const isPinned = pinned.includes(message.eventId);
      const newPinned = isPinned
        ? pinned.filter((id) => id !== message.eventId)
        : [...pinned, message.eventId];
      await client.sendStateEvent(message.roomId, "m.room.pinned_events" as any, { pinned: newPinned }, "");
    } catch (err) {
      console.error("Failed to pin/unpin message:", err);
    }
  };

  const actionButtons = !message.isRedacted && (
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
      <button
        onClick={handlePin}
        className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-yellow"
        title="Pin/Unpin"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7l3-7z" />
        </svg>
      </button>
      {isOwnMessage && !message.isRedacted && (
        <button
          onClick={handleEdit}
          className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          title="Edit"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
      {isOwnMessage && !message.isRedacted && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-red"
          title="Delete"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      )}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => {
            setShowQuickPicker(!showQuickPicker);
            setShowFullPicker(false);
          }}
          className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          title="Add reaction"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
          </svg>
        </button>
        {showQuickPicker && !showFullPicker && (
          <div className="absolute bottom-full right-0 z-10 mb-1">
            <div className="flex items-center gap-1 rounded-lg bg-bg-floating p-1.5 shadow-lg">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="rounded p-1 text-lg hover:bg-bg-hover"
                >
                  {emoji}
                </button>
              ))}
              <div className="mx-0.5 h-6 w-px bg-bg-active" />
              <button
                onClick={() => setShowFullPicker(true)}
                className="rounded p-1 text-sm text-text-muted hover:bg-bg-hover hover:text-text-primary"
                title="More emojis"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {showFullPicker && (
          <div className="absolute bottom-full right-0 z-10 mb-1">
            <EmojiPicker
              onSelect={sendReaction}
              onClose={() => {
                setShowFullPicker(false);
                setShowQuickPicker(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );

  const deleteConfirmPopover = showDeleteConfirm && (
    <div className="absolute -top-16 right-4 z-20 rounded-lg bg-bg-floating p-3 shadow-lg">
      <p className="mb-2 text-xs text-text-secondary">Delete this message?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowDeleteConfirm(false)}
          className="rounded px-2 py-1 text-xs text-text-muted hover:bg-bg-hover"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className="rounded bg-red px-2 py-1 text-xs text-white hover:bg-red/80"
        >
          Delete
        </button>
      </div>
    </div>
  );

  // Compact mode: every message inline with timestamp + sender
  if (messageDisplay === "compact") {
    return (
      <div className="group relative flex items-start gap-0 py-0.5 pl-2 hover:bg-bg-hover/50">
        {actionButtons}
        {deleteConfirmPopover}
        <span className="mr-2 mt-0.5 flex-shrink-0 text-[11px] leading-5 text-text-muted">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <div className="min-w-0 flex-1">
          {message.replyToEvent && <ReplyContext reply={message.replyToEvent} />}
          <div className="flex items-baseline gap-1">
            <button
              className="flex-shrink-0 text-sm font-medium text-text-primary hover:underline"
              onClick={(e) => setPopoverAnchor(e.currentTarget)}
            >
              {message.senderName}
            </button>
            <MessageBody message={message} />
          </div>
          <ReactionBar reactions={message.reactions} eventId={message.eventId} roomId={message.roomId} />
        </div>
        {popoverAnchor && (
          <UserPopover
            userId={message.senderId}
            displayName={message.senderName}
            avatarUrl={message.senderAvatar}
            anchorEl={popoverAnchor}
            onClose={() => setPopoverAnchor(null)}
          />
        )}
      </div>
    );
  }

  // Cozy mode (default)
  if (showHeader) {
    return (
      <div className="group relative mt-4 flex gap-3 py-0.5 hover:bg-bg-hover/50">
        {actionButtons}
        {deleteConfirmPopover}
        <button
          className="flex-shrink-0 cursor-pointer"
          onClick={(e) => setPopoverAnchor(e.currentTarget)}
        >
          <Avatar
            name={message.senderName}
            url={message.senderAvatar}
            size={40}
          />
        </button>
        <div className="flex-1 overflow-hidden">
          {message.replyToEvent && <ReplyContext reply={message.replyToEvent} />}
          <div className="flex items-baseline gap-2">
            <button
              className="font-medium text-text-primary hover:underline"
              onClick={(e) => setPopoverAnchor(e.currentTarget)}
            >
              {message.senderName}
            </button>
            <span className="text-xs text-text-muted">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          <MessageBody message={message} />
          <ReactionBar reactions={message.reactions} eventId={message.eventId} roomId={message.roomId} />
        </div>
        {popoverAnchor && (
          <UserPopover
            userId={message.senderId}
            displayName={message.senderName}
            avatarUrl={message.senderAvatar}
            anchorEl={popoverAnchor}
            onClose={() => setPopoverAnchor(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="group relative flex gap-3 py-0.5 hover:bg-bg-hover/50">
      {actionButtons}
      {deleteConfirmPopover}
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
        <MessageBody message={message} />
        <ReactionBar reactions={message.reactions} eventId={message.eventId} roomId={message.roomId} />
      </div>
    </div>
  );
}
