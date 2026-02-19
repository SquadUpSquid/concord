import { useState, useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { usePresenceStore } from "@/stores/presenceStore";
import { useRoomStore } from "@/stores/roomStore";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";
import { Preset } from "matrix-js-sdk";

interface UserPopoverProps {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  mxcAvatarUrl?: string | null;
  anchorEl: HTMLElement;
  onClose: () => void;
}

export function UserPopover({ userId, displayName, avatarUrl, mxcAvatarUrl, anchorEl, onClose }: UserPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [starting, setStarting] = useState(false);
  const presence = usePresenceStore((s) => s.presenceByUser.get(userId));
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const selectSpace = useRoomStore((s) => s.selectSpace);

  const client = getMatrixClient();
  const hsUrl = client?.getHomeserverUrl() ?? "";
  const user = client?.getUser(userId);
  const liveAvatarUrl = mxcToHttp(user?.avatarUrl, hsUrl);
  const liveMxcAvatarUrl = user?.avatarUrl ?? mxcAvatarUrl ?? null;
  const liveName = user?.displayName ?? displayName;

  useEffect(() => {
    const rect = anchorEl.getBoundingClientRect();
    const popoverWidth = 280;
    const popoverHeight = 200;

    let top = rect.bottom + 4;
    let left = rect.left;

    if (top + popoverHeight > window.innerHeight) top = rect.top - popoverHeight - 4;
    if (left + popoverWidth > window.innerWidth) left = window.innerWidth - popoverWidth - 8;

    setPos({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [anchorEl, onClose]);

  const handleMessage = async () => {
    if (!client || starting) return;
    setStarting(true);

    try {
      // Check for existing DM
      for (const room of client.getRooms()) {
        const members = room.getJoinedMembers();
        if (members.length === 2 && members.some((m) => m.userId === userId) && !room.isSpaceRoom()) {
          selectSpace(null);
          selectRoom(room.roomId);
          onClose();
          return;
        }
      }

      const { room_id } = await client.createRoom({
        preset: Preset.TrustedPrivateChat,
        invite: [userId],
        is_direct: true,
      });

      const dmMap: Record<string, string[]> =
        ((client as any).getAccountData("m.direct")?.getContent() as Record<string, string[]>) ?? {};
      dmMap[userId] = [...(dmMap[userId] ?? []), room_id];
      await (client as any).setAccountData("m.direct", dmMap);

      selectSpace(null);
      selectRoom(room_id);
      onClose();
    } catch (err) {
      console.error("Failed to open DM:", err);
    } finally {
      setStarting(false);
    }
  };

  const presenceLabel = presence?.presence === "online"
    ? "Online"
    : presence?.presence === "unavailable"
      ? "Away"
      : "Offline";

  const presenceColor = presence?.presence === "online"
    ? "bg-green"
    : presence?.presence === "unavailable"
      ? "bg-yellow"
      : "bg-text-muted";

  return (
    <div
      ref={ref}
      className="fixed z-50 w-[280px] overflow-hidden rounded-lg bg-bg-floating shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
      {/* Banner */}
      <div className="h-16 bg-accent" />

      {/* Avatar */}
      <div className="-mt-8 px-4">
        <div className="rounded-full border-4 border-bg-floating">
          <Avatar
            name={liveName}
            url={liveAvatarUrl ?? avatarUrl}
            mxcUrl={liveMxcAvatarUrl}
            size={64}
            presence={presence?.presence ?? null}
          />
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pb-4 pt-2">
        <p className="text-base font-bold text-text-primary">{liveName}</p>
        <p className="text-xs text-text-muted">{userId}</p>

        <div className="mt-2 flex items-center gap-1.5">
          <div className={`h-2.5 w-2.5 rounded-full ${presenceColor}`} />
          <span className="text-xs text-text-secondary">{presenceLabel}</span>
          {presence?.statusMsg && (
            <span className="truncate text-xs text-text-muted">— {presence.statusMsg}</span>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleMessage}
            disabled={starting}
            className="flex-1 rounded-sm bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {starting ? "Opening..." : "Message"}
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(userId);
              onClose();
            }}
            className="rounded-sm bg-bg-active px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
          >
            Copy ID
          </button>
        </div>
      </div>
    </div>
  );
}
