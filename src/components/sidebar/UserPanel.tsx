import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useCallStore } from "@/stores/callStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { useRoomStore } from "@/stores/roomStore";
import { useUiStore } from "@/stores/uiStore";
import { Avatar } from "@/components/common/Avatar";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";

export function UserPanel() {
  const userId = useAuthStore((s) => s.userId);
  const openModal = useUiStore((s) => s.openModal);
  const selectRoom = useRoomStore((s) => s.selectRoom);

  const activeCallRoomId = useCallStore((s) => s.activeCallRoomId);
  const connectionState = useCallStore((s) => s.connectionState);
  const isMicMuted = useCallStore((s) => s.isMicMuted);
  const isVideoMuted = useCallStore((s) => s.isVideoMuted);
  const isDeafened = useCallStore((s) => s.isDeafened);
  const isScreenSharing = useCallStore((s) => s.isScreenSharing);
  const toggleMic = useCallStore((s) => s.toggleMic);
  const toggleVideo = useCallStore((s) => s.toggleVideo);
  const toggleDeafen = useCallStore((s) => s.toggleDeafen);
  const toggleScreenShare = useCallStore((s) => s.toggleScreenShare);
  const leaveCall = useCallStore((s) => s.leaveCall);

  const callRoomName = useRoomStore((s) =>
    activeCallRoomId ? s.rooms.get(activeCallRoomId)?.name ?? "Voice Channel" : "Voice Channel"
  );

  const myPresence = usePresenceStore(
    (s) => s.presenceByUser.get(userId ?? "")?.presence ?? "online"
  );

  const client = getMatrixClient();
  const user = client?.getUser(userId ?? "");
  const displayName = user?.displayName ?? userId ?? "User";
  const avatarUrl = user && client
    ? mxcToHttp(user.avatarUrl ?? null, client.getHomeserverUrl())
    : null;
  const mxcAvatarUrl = user?.avatarUrl ?? null;

  const inCall = !!activeCallRoomId && connectionState === "connected";

  return (
    <div className="border-t border-bg-tertiary bg-bg-floating/70 px-3 py-2.5">
      <div className="flex flex-col gap-2">
        {inCall && (
          <div className="rounded-xl border border-bg-active bg-bg-secondary/70 p-2">
            <button
              onClick={() => activeCallRoomId && selectRoom(activeCallRoomId)}
              className="mb-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-bg-hover"
              title="Open active voice channel"
            >
              <div className="min-w-0">
                <p className={`text-[0.78rem] font-semibold ${
                  connectionState === "connected" ? "text-green" : "text-yellow"
                }`}>
                  {connectionState === "connected" ? "Voice Connected" : "Connecting..."}
                </p>
                <p className="truncate text-[0.72rem] text-text-muted">{callRoomName}</p>
              </div>
              <svg className="h-4 w-4 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              <CallControlButton
                onClick={toggleMic}
                active={!isMicMuted}
                danger={isMicMuted}
                title={isMicMuted ? "Unmute" : "Mute"}
              >
                {isMicMuted ? (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                  </svg>
                ) : (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                  </svg>
                )}
              </CallControlButton>

              <CallControlButton
                onClick={toggleDeafen}
                active={!isDeafened}
                danger={isDeafened}
                title={isDeafened ? "Undeafen" : "Deafen"}
              >
                {isDeafened ? (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.34 2.93L2.93 4.34 7.29 8.7 7 9H3v6h4l5 5v-6.59l4.18 4.18c-.65.49-1.38.88-2.18 1.11v2.06c1.34-.3 2.57-.97 3.6-1.88l2.05 2.05 1.41-1.41L4.34 2.93zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zm-7-8l-1.88 1.88L12 7.76V4zm4.5 8A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63z" />
                  </svg>
                ) : (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-3.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </CallControlButton>

              <CallControlButton
                onClick={toggleVideo}
                active={!isVideoMuted}
                danger={isVideoMuted}
                title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
              >
                {isVideoMuted ? (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
                  </svg>
                ) : (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                  </svg>
                )}
              </CallControlButton>

              <CallControlButton
                onClick={toggleScreenShare}
                active={isScreenSharing}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
                </svg>
              </CallControlButton>

              <button
                onClick={leaveCall}
                className="ml-auto flex h-11 min-w-[108px] items-center justify-center gap-1.5 rounded-full bg-red px-3 text-[0.82rem] font-semibold text-white transition-colors hover:bg-red/80"
                title="Disconnect"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                </svg>
                Disconnect
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-bg-active bg-bg-secondary/70 p-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => openModal("settings")}
              className="flex-shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80"
              title="User settings"
            >
              <Avatar
                name={displayName}
                url={avatarUrl}
                mxcUrl={mxcAvatarUrl}
                size={38}
                presence={myPresence}
              />
            </button>

            <button
              onClick={() => openModal("settings")}
              className="flex flex-1 items-center gap-2 overflow-hidden rounded-md px-1 py-1 text-left hover:bg-bg-hover"
              title="User settings"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-semibold text-text-primary">
                  {displayName}
                </p>
                <p className="truncate text-[0.72rem] text-text-muted">
                  {userId}
                </p>
              </div>
              <svg className="h-4 w-4 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

function CallControlButton({
  onClick,
  active,
  danger,
  title,
  children,
}: {
  onClick: () => void | Promise<void>;
  active?: boolean;
  danger?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={() => void onClick()}
      title={title}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
        danger
          ? "bg-bg-active text-red hover:bg-bg-hover"
          : active
            ? "bg-bg-active text-text-primary hover:bg-bg-hover"
            : "bg-bg-active text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
