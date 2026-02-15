import { Message } from "@/stores/messageStore";
import { formatTimestamp } from "@/utils/formatters";
import { Avatar } from "@/components/common/Avatar";
import { MessageContent } from "./MessageContent";

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
}

export function MessageItem({ message, showHeader }: MessageItemProps) {
  if (showHeader) {
    return (
      <div className="mt-4 flex gap-3 py-0.5 hover:bg-bg-hover/50">
        <Avatar
          name={message.senderName}
          url={message.senderAvatar}
          size={40}
        />
        <div className="flex-1 overflow-hidden">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-text-primary">
              {message.senderName}
            </span>
            <span className="text-xs text-text-muted">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          <MessageContent body={message.body} formattedBody={message.formattedBody} />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 py-0.5 hover:bg-bg-hover/50">
      <div className="w-10 flex-shrink-0">
        <span className="hidden text-xs text-text-muted group-hover:inline">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="flex-1">
        <MessageContent body={message.body} formattedBody={message.formattedBody} />
      </div>
    </div>
  );
}
