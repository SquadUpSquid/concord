import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

interface VoiceChatPanelProps {
  roomId: string;
  onClose: () => void;
}

export function VoiceChatPanel({ roomId, onClose }: VoiceChatPanelProps) {
  return (
    <div className="flex w-80 flex-col border-l border-bg-tertiary bg-bg-primary">
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
