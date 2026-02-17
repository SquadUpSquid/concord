import { useState, useRef, useCallback, useEffect } from "react";
import { getMatrixClient } from "@/lib/matrix";
import { useMessageStore } from "@/stores/messageStore";
import { EmojiPicker } from "./EmojiPicker";

interface MessageInputProps {
  roomId: string;
}

export function MessageInput({ roomId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const replyingTo = useMessageStore((s) => s.replyingTo);
  const setReplyingTo = useMessageStore((s) => s.setReplyingTo);
  const editingMessage = useMessageStore((s) => s.editingMessage);
  const setEditingMessage = useMessageStore((s) => s.setEditingMessage);

  // Populate input when entering edit mode
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.body);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // Close emoji picker on click outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  const sendTyping = useCallback(
    (typing: boolean) => {
      const client = getMatrixClient();
      if (!client || isTyping.current === typing) return;
      isTyping.current = typing;
      client.sendTyping(roomId, typing, typing ? 30000 : 0).catch(() => {});
    },
    [roomId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    if (!editingMessage && e.target.value.length > 0) {
      sendTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => sendTyping(false), 5000);
    } else if (!editingMessage) {
      sendTyping(false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    }
  };

  const handleSend = async () => {
    const body = message.trim();
    if (!body) return;

    const client = getMatrixClient();
    if (!client) return;

    setMessage("");
    sendTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    try {
      if (editingMessage) {
        // Send edit via m.replace relation
        await client.sendEvent(roomId, "m.room.message" as any, {
          msgtype: "m.text",
          body: `* ${body}`,
          "m.new_content": {
            msgtype: "m.text",
            body,
          },
          "m.relates_to": {
            rel_type: "m.replace",
            event_id: editingMessage.eventId,
          },
        });
        setEditingMessage(null);
      } else if (replyingTo) {
        const replyBody = `> <${replyingTo.senderId}> ${replyingTo.body}\n\n${body}`;
        const formattedReply = `<mx-reply><blockquote><a href="https://matrix.to/#/${replyingTo.roomId}/${replyingTo.eventId}">In reply to</a> <a href="https://matrix.to/#/${replyingTo.senderId}">${replyingTo.senderName}</a><br/>${replyingTo.body}</blockquote></mx-reply>${body}`;

        await client.sendEvent(roomId, "m.room.message" as any, {
          msgtype: "m.text",
          body: replyBody,
          format: "org.matrix.custom.html",
          formatted_body: formattedReply,
          "m.relates_to": {
            "m.in_reply_to": {
              event_id: replyingTo.eventId,
            },
          },
        });
        setReplyingTo(null);
      } else {
        await client.sendTextMessage(roomId, body);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessage(body);
    }
  };

  const handleFileUpload = async (file: File) => {
    const client = getMatrixClient();
    if (!client) return;

    setIsUploading(true);
    try {
      const uploadResp = await client.uploadContent(file, { type: file.type });
      const mxcUrl = uploadResp.content_uri;

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");

      let msgtype = "m.file";
      if (isImage) msgtype = "m.image";
      else if (isVideo) msgtype = "m.video";
      else if (isAudio) msgtype = "m.audio";

      const content: Record<string, unknown> = {
        msgtype,
        body: file.name,
        url: mxcUrl,
        info: {
          mimetype: file.type,
          size: file.size,
        },
      };

      if (isImage) {
        const img = await loadImageDimensions(file);
        (content.info as Record<string, unknown>).w = img.width;
        (content.info as Record<string, unknown>).h = img.height;
      }

      await client.sendEvent(roomId, "m.room.message" as any, content);
    } catch (err) {
      console.error("Failed to upload file:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      if (editingMessage) setEditingMessage(null);
      else if (replyingTo) setReplyingTo(null);
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setMessage("");
    inputRef.current?.focus();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const hasContext = !!replyingTo || !!editingMessage;

  return (
    <div className="px-4 pb-6 pt-2" onDrop={handleDrop} onDragOver={handleDragOver}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {replyingTo && (
        <div className="mb-1 flex items-center gap-2 rounded-t-lg bg-bg-secondary px-4 py-2 text-xs">
          <span className="text-text-muted">Replying to</span>
          <span className="font-medium text-text-secondary">
            {replyingTo.senderName}
          </span>
          <span className="flex-1 truncate text-text-muted">
            {replyingTo.body}
          </span>
          <button
            onClick={handleCancelReply}
            className="text-text-muted hover:text-text-primary"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="mb-1 flex items-center gap-2 rounded-t-lg bg-accent/10 px-4 py-2 text-xs">
          <svg className="h-3.5 w-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span className="text-accent">Editing message</span>
          <span className="flex-1 truncate text-text-muted">
            {editingMessage.body}
          </span>
          <button
            onClick={handleCancelEdit}
            className="text-text-muted hover:text-text-primary"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className={`flex items-center bg-bg-input px-4 ${hasContext ? "rounded-b-lg" : "rounded-lg"}`}>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mr-2 rounded p-1 text-text-muted hover:text-text-primary"
          title="Upload file"
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-muted border-t-accent" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={editingMessage ? "Edit your message..." : "Send a message..."}
          className="flex-1 bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
        <div className="relative" ref={emojiRef}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="ml-2 rounded p-1 text-text-muted hover:text-text-primary"
            title="Emoji"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
            </svg>
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 z-10 mb-2">
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}
