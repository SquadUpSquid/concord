import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { useUiStore } from "@/stores/uiStore";
import { ChannelItem } from "./ChannelItem";
import { useAuthStore } from "@/stores/authStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { Avatar } from "@/components/common/Avatar";
import { destroyMatrixClient, getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";

export function ChannelSidebar() {
  const rooms = useRoomStore((s) => s.rooms);
  const selectedSpaceId = useRoomStore((s) => s.selectedSpaceId);
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const userId = useAuthStore((s) => s.userId);
  const openModal = useUiStore((s) => s.openModal);

  const [textCollapsed, setTextCollapsed] = useState(false);
  const [voiceCollapsed, setVoiceCollapsed] = useState(false);

  const myPresence = usePresenceStore(
    (s) => s.presenceByUser.get(userId ?? "")?.presence ?? "online"
  );

  const channels = Array.from(rooms.values()).filter((r) => {
    if (r.isSpace) return false;
    if (selectedSpaceId === null) return r.parentSpaceId === null;
    return r.parentSpaceId === selectedSpaceId;
  });

  const textChannels = channels
    .filter((ch) => ch.channelType === "text")
    .sort((a, b) => a.name.localeCompare(b.name));

  const voiceChannels = channels
    .filter((ch) => ch.channelType === "voice")
    .sort((a, b) => a.name.localeCompare(b.name));

  const spaceName = selectedSpaceId
    ? rooms.get(selectedSpaceId)?.name ?? "Space"
    : "Direct Messages";

  const handleLogout = async () => {
    await destroyMatrixClient();
    useAuthStore.getState().logout();
  };

  // Get user's display name and avatar from the Matrix client
  const client = getMatrixClient();
  const user = client?.getUser(userId ?? "");
  const displayName = user?.displayName ?? userId ?? "User";
  const avatarUrl = user
    ? mxcToHttp(user.avatarUrl ?? null, client!.getHomeserverUrl())
    : null;

  return (
    <div className="flex w-60 flex-col bg-bg-secondary">
      {/* Header */}
      <div className="flex h-12 items-center border-b border-bg-tertiary px-4 shadow-sm">
        <h2 className="flex-1 truncate text-sm font-semibold text-text-primary">
          {spaceName}
        </h2>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {channels.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-text-muted">
            No channels
          </p>
        )}

        {/* Text Channels Section */}
        {(textChannels.length > 0 || channels.length > 0) && (
          <div className="mb-1">
            <button
              onClick={() => setTextCollapsed(!textCollapsed)}
              className="group flex w-full items-center gap-0.5 px-1 py-1.5"
            >
              <svg
                className={`h-3 w-3 text-text-muted transition-transform ${
                  textCollapsed ? "-rotate-90" : ""
                }`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
              <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted group-hover:text-text-secondary">
                Text Channels
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  openModal("createRoom");
                }}
                className="rounded p-0.5 text-text-muted opacity-0 hover:text-text-primary group-hover:opacity-100"
                title="Create channel"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            {!textCollapsed && (
              <div>
                {textChannels.map((ch) => (
                  <ChannelItem
                    key={ch.roomId}
                    roomId={ch.roomId}
                    name={ch.name}
                    channelType={ch.channelType}
                    unreadCount={ch.unreadCount}
                    isSelected={selectedRoomId === ch.roomId}
                    onClick={() => selectRoom(ch.roomId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Voice Channels Section */}
        {(voiceChannels.length > 0 || channels.length > 0) && (
          <div className="mb-1">
            <button
              onClick={() => setVoiceCollapsed(!voiceCollapsed)}
              className="group flex w-full items-center gap-0.5 px-1 py-1.5"
            >
              <svg
                className={`h-3 w-3 text-text-muted transition-transform ${
                  voiceCollapsed ? "-rotate-90" : ""
                }`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
              <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted group-hover:text-text-secondary">
                Voice Channels
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  openModal("createRoom");
                }}
                className="rounded p-0.5 text-text-muted opacity-0 hover:text-text-primary group-hover:opacity-100"
                title="Create channel"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            {!voiceCollapsed && (
              <div>
                {voiceChannels.length === 0 ? (
                  <p className="px-3 py-1 text-xs text-text-muted">No voice channels</p>
                ) : (
                  voiceChannels.map((ch) => (
                    <ChannelItem
                      key={ch.roomId}
                      roomId={ch.roomId}
                      name={ch.name}
                      channelType={ch.channelType}
                      unreadCount={ch.unreadCount}
                      isSelected={selectedRoomId === ch.roomId}
                      onClick={() => selectRoom(ch.roomId)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User section */}
      <div className="flex items-center gap-2 border-t border-bg-tertiary bg-bg-floating/50 px-2 py-2">
        <Avatar
          name={displayName}
          url={avatarUrl}
          size={32}
          presence={myPresence}
        />
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-text-primary">
            {displayName}
          </p>
          <p className="truncate text-[10px] text-text-muted">
            {userId}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          title="Log out"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
