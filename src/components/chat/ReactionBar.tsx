import { Reaction } from "@/stores/messageStore";
import { getMatrixClient } from "@/lib/matrix";
import { Emoji } from "@/components/common/Emoji";
import { useCustomEmojiStore } from "@/stores/customEmojiStore";
import { useMatrixImage } from "@/utils/useMatrixImage";

function CustomReactionEmoji({ mxcUrl, shortcode }: { mxcUrl: string; shortcode: string }) {
  const { src } = useMatrixImage(mxcUrl, 32, 32);
  return (
    <img
      src={src ?? undefined}
      alt={`:${shortcode}:`}
      title={`:${shortcode}:`}
      className="h-4 w-4 object-contain"
      draggable={false}
    />
  );
}

function ReactionEmoji({ reactionKey, roomId }: { reactionKey: string; roomId: string }) {
  const isCustom = reactionKey.startsWith(":") && reactionKey.endsWith(":") && reactionKey.length > 2;
  if (isCustom) {
    const shortcode = reactionKey.slice(1, -1);
    const mxcUrl = useCustomEmojiStore.getState().resolveShortcode(roomId, shortcode);
    if (mxcUrl) return <CustomReactionEmoji mxcUrl={mxcUrl} shortcode={shortcode} />;
  }
  return <Emoji emoji={reactionKey} size={16} />;
}

interface ReactionBarProps {
  reactions: Reaction[];
  eventId: string;
  roomId: string;
}

export function ReactionBar({ reactions, eventId, roomId }: ReactionBarProps) {
  if (reactions.length === 0) return null;

  const client = getMatrixClient();
  const myUserId = client?.getUserId() ?? "";

  const handleReaction = async (key: string) => {
    if (!client) return;
    const existing = reactions.find(
      (r) => r.key === key && r.userIds.includes(myUserId)
    );
    if (existing) {
      // Remove own reaction by finding and redacting the reaction event
      try {
        const room = client.getRoom(roomId);
        if (!room) return;
        const relationsContainer = room.relations?.getChildEventsForEvent(
          eventId, "m.annotation", "m.reaction"
        );
        if (relationsContainer) {
          const sorted = relationsContainer.getSortedAnnotationsByKey();
          if (sorted) {
            for (const [annotationKey, eventSet] of sorted) {
              if (annotationKey === key) {
                for (const reactionEvent of eventSet) {
                  if (reactionEvent.getSender() === myUserId) {
                    const reactionEventId = reactionEvent.getId();
                    if (reactionEventId) {
                      await client.redactEvent(roomId, reactionEventId);
                    }
                    return;
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to remove reaction:", err);
      }
      return;
    }
    try {
      await client.sendEvent(roomId, "m.reaction" as any, {
        "m.relates_to": {
          rel_type: "m.annotation",
          event_id: eventId,
          key,
        },
      });
    } catch (err) {
      console.error("Failed to send reaction:", err);
    }
  };

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map((r) => {
        const isMine = r.userIds.includes(myUserId);
        return (
          <button
            key={r.key}
            onClick={() => handleReaction(r.key)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              isMine
                ? "border-accent bg-accent/20 text-text-primary"
                : "border-bg-active bg-bg-secondary text-text-muted hover:bg-bg-active"
            }`}
          >
            <ReactionEmoji reactionKey={r.key} roomId={roomId} />
            <span>{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}
