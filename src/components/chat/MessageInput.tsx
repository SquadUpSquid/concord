import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { getMatrixClient } from "@/lib/matrix";
import { useMessageStore } from "@/stores/messageStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { EmojiPicker } from "./EmojiPicker";
import { searchEmojis, type EmojiEntry } from "@/lib/emojiData";
import { Emoji } from "@/components/common/Emoji";

interface MessageInputProps {
  roomId: string;
}

interface PendingFile {
  file: File;
  previewUrl: string | null;
}

export function MessageInput({ roomId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);
  const [emojiAutocomplete, setEmojiAutocomplete] = useState<EmojiEntry[]>([]);
  const [emojiSelectedIdx, setEmojiSelectedIdx] = useState(0);
  const replyingTo = useMessageStore((s) => s.replyingTo);
  const setReplyingTo = useMessageStore((s) => s.setReplyingTo);
  const editingMessage = useMessageStore((s) => s.editingMessage);
  const setEditingMessage = useMessageStore((s) => s.setEditingMessage);

  // Emoji autocomplete: detect ":text" at end of input
  const emojiQuery = useMemo(() => {
    const match = message.match(/:([a-z0-9_]{2,})$/i);
    return match ? match[1] : null;
  }, [message]);

  useEffect(() => {
    if (emojiQuery) {
      const results = searchEmojis(emojiQuery);
      setEmojiAutocomplete(results);
      setEmojiSelectedIdx(0);
    } else {
      setEmojiAutocomplete([]);
    }
  }, [emojiQuery]);

  const applyEmoji = (emoji: string) => {
    setMessage((prev) => prev.replace(/:([a-z0-9_]{2,})$/i, emoji));
    setEmojiAutocomplete([]);
    inputRef.current?.focus();
  };

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

  const typingEnabled = useSettingsStore((s) => s.sendTypingIndicators);

  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!typingEnabled) return;
      const client = getMatrixClient();
      if (!client || isTyping.current === typing) return;
      isTyping.current = typing;
      client.sendTyping(roomId, typing, typing ? 30000 : 0).catch(() => {});
    },
    [roomId, typingEnabled]
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

  const addPendingFiles = (files: File[]) => {
    const newPending: PendingFile[] = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const item = prev[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadSingleFile = async (file: File): Promise<void> => {
    const client = getMatrixClient();
    if (!client) return;

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
  };

  const handleSendPending = async () => {
    if (pendingFiles.length === 0) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${pendingFiles.length}...`);
        await uploadSingleFile(pendingFiles[i].file);
      }
      pendingFiles.forEach((pf) => {
        if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
      });
      setPendingFiles([]);
    } catch (err) {
      console.error("Failed to upload files:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const handleFileUpload = async (file: File) => {
    addPendingFiles([file]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addPendingFiles(Array.from(files));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      addPendingFiles(Array.from(files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleFileUpload(file);
        return;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Emoji autocomplete navigation
    if (emojiAutocomplete.length > 0) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setEmojiSelectedIdx((i) => (i > 0 ? i - 1 : emojiAutocomplete.length - 1));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setEmojiSelectedIdx((i) => (i < emojiAutocomplete.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        applyEmoji(emojiAutocomplete[emojiSelectedIdx].emoji);
        return;
      }
      if (e.key === "Escape") {
        setEmojiAutocomplete([]);
        return;
      }
    }

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
    <div
      className="relative px-4 pb-6 pt-2"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-accent bg-accent/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-accent">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <span className="text-sm font-medium">Drop files to upload</span>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        multiple
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

      {/* Emoji autocomplete dropdown */}
      {emojiAutocomplete.length > 0 && (
        <div className={`mb-1 overflow-hidden bg-bg-floating shadow-lg ${hasContext ? "" : "rounded-t-lg"}`}>
          {emojiAutocomplete.map((entry, i) => (
            <button
              key={entry.name}
              onClick={() => applyEmoji(entry.emoji)}
              className={`flex w-full items-center gap-3 px-4 py-1.5 text-left text-sm ${
                i === emojiSelectedIdx ? "bg-accent/20 text-text-primary" : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <Emoji emoji={entry.emoji} size={20} />
              <span>:{entry.name}:</span>
            </button>
          ))}
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className={`flex flex-wrap gap-2 bg-bg-secondary p-3 ${hasContext || emojiAutocomplete.length > 0 ? "" : "rounded-t-lg"}`}>
          {pendingFiles.map((pf, i) => (
            <div key={i} className="group relative">
              {pf.previewUrl ? (
                <img
                  src={pf.previewUrl}
                  alt={pf.file.name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg bg-bg-active">
                  <svg className="h-6 w-6 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="max-w-[72px] truncate px-1 text-[10px] text-text-muted">{pf.file.name}</span>
                </div>
              )}
              <button
                onClick={() => removePendingFile(i)}
                className="absolute -right-1.5 -top-1.5 hidden rounded-full bg-red p-0.5 text-white shadow-md group-hover:block"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={handleSendPending}
            disabled={isUploading}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg bg-accent/20 text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
                <span className="text-[10px]">{uploadProgress}</span>
              </>
            ) : (
              <>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                <span className="text-[10px]">Send</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className={`flex items-center bg-bg-input px-4 ${hasContext || emojiAutocomplete.length > 0 || pendingFiles.length > 0 ? "rounded-b-lg" : "rounded-lg"}`}>
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
          onPaste={handlePaste}
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
                roomId={roomId}
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
