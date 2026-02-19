import { useEffect, useRef, useState } from "react";
import { useMessageStore, Message } from "@/stores/messageStore";
import { getMatrixClient } from "@/lib/matrix";
import { loadThreadMessages } from "@/lib/matrixEventHandlers";
import { Avatar } from "@/components/common/Avatar";
import { MessageContent } from "./MessageContent";
import { formatTimestamp } from "@/utils/formatters";

const EMPTY_MESSAGES: Message[] = [];

export function ThreadPanel() {
  const activeThreadId = useMessageStore((s) => s.activeThreadId);
  const activeThreadRoomId = useMessageStore((s) => s.activeThreadRoomId);
  const closeThread = useMessageStore((s) => s.closeThread);
  const threadMessages = useMessageStore(
    (s) => (activeThreadId ? s.threadMessages.get(activeThreadId) : undefined) ?? EMPTY_MESSAGES
  );

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load thread messages when thread opens
  useEffect(() => {
    if (!activeThreadId || !activeThreadRoomId) return;
    const client = getMatrixClient();
    if (!client) return;
    loadThreadMessages(client, activeThreadRoomId, activeThreadId);
  }, [activeThreadId, activeThreadRoomId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length]);

  // Focus input when thread opens
  useEffect(() => {
    if (activeThreadId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeThreadId]);

  if (!activeThreadId || !activeThreadRoomId) return null;

  const rootMessage = threadMessages[0];

  const handleSend = async () => {
    const body = message.trim();
    if (!body) return;

    const client = getMatrixClient();
    if (!client) return;

    setSending(true);
    setMessage("");
    try {
      await client.sendEvent(activeThreadRoomId, "m.room.message" as any, {
        msgtype: "m.text",
        body,
        "m.relates_to": {
          rel_type: "m.thread",
          event_id: activeThreadId,
          is_falling_back: true,
          "m.in_reply_to": {
            event_id: threadMessages[threadMessages.length - 1]?.eventId ?? activeThreadId,
          },
        },
      });
    } catch (err) {
      console.error("Failed to send thread message:", err);
      setMessage(body);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      closeThread();
    }
  };

  return (
    <div className="flex w-96 flex-col border-l border-bg-tertiary bg-bg-primary">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-bg-tertiary px-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Thread</h3>
          {rootMessage && (
            <p className="truncate text-[10px] text-text-muted">
              {rootMessage.senderName}
            </p>
          )}
        </div>
        <button
          onClick={closeThread}
          className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          title="Close thread"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Thread messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {threadMessages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          </div>
        ) : (
          threadMessages.map((msg, i) => {
            const prev = threadMessages[i - 1];
            const showHeader =
              !prev ||
              prev.senderId !== msg.senderId ||
              msg.timestamp - prev.timestamp > 5 * 60 * 1000;
            const isRoot = i === 0;

            return (
              <div key={msg.eventId}>
                {isRoot && (
                  <div className="mb-3 rounded-lg bg-bg-secondary p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Avatar name={msg.senderName} url={msg.senderAvatar} mxcUrl={msg.senderMxcAvatar} size={24} />
                      <span className="text-sm font-medium text-text-primary">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                    <div className="message-content">
                      <MessageContent
                        body={msg.body}
                        formattedBody={msg.formattedBody}
                        msgtype={msg.type}
                        url={msg.url ?? undefined}
                        info={msg.info ?? undefined}
                      />
                    </div>
                    {threadMessages.length > 1 && (
                      <div className="mt-2 border-t border-bg-active pt-2">
                        <p className="text-[10px] text-text-muted">
                          {threadMessages.length - 1} {threadMessages.length - 1 === 1 ? "reply" : "replies"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!isRoot && showHeader && (
                  <div className="mt-3 flex gap-2 py-0.5">
                    <Avatar name={msg.senderName} url={msg.senderAvatar} mxcUrl={msg.senderMxcAvatar} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {msg.senderName}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                      <div className="message-content">
                        <MessageContent
                          body={msg.body}
                          formattedBody={msg.formattedBody}
                          msgtype={msg.type}
                          url={msg.url ?? undefined}
                          info={msg.info ?? undefined}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!isRoot && !showHeader && (
                  <div className="flex gap-2 py-0.5 pl-10">
                    <div className="message-content">
                      <MessageContent
                        body={msg.body}
                        formattedBody={msg.formattedBody}
                        msgtype={msg.type}
                        url={msg.url ?? undefined}
                        info={msg.info ?? undefined}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Thread input */}
      <div className="border-t border-bg-tertiary px-4 py-3">
        <div className="flex items-center rounded-lg bg-bg-input px-3">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply in thread..."
            disabled={sending}
            className="flex-1 bg-transparent py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="ml-2 rounded p-1 text-text-muted hover:text-accent disabled:opacity-30"
            title="Send"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
