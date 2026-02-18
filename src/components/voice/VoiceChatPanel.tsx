import { useState, useCallback, useRef, useEffect } from "react";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 320;

interface VoiceChatPanelProps {
  roomId: string;
  onClose: () => void;
}

export function VoiceChatPanel({ roomId, onClose }: VoiceChatPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className="relative flex flex-col border-l border-bg-tertiary bg-bg-primary" style={{ width }}>
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute inset-y-0 left-0 z-20 w-1 cursor-col-resize hover:bg-accent/40 active:bg-accent/60"
      />

      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-bg-tertiary px-4">
        <h3 className="text-sm font-semibold text-text-primary">Chat</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          title="Close chat"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <MessageList roomId={roomId} />

      {/* Typing indicator */}
      <TypingIndicator roomId={roomId} />

      {/* Input */}
      <MessageInput roomId={roomId} />
    </div>
  );
}
