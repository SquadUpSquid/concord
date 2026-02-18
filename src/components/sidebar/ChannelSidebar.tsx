import { useState } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { useUiStore } from "@/stores/uiStore";
import { useChannelOrderStore, sortChannelsByOrder } from "@/stores/channelOrderStore";
import { useChannelPrefsStore } from "@/stores/channelPrefsStore";
import type { ChannelListType } from "@/stores/channelOrderStore";
import { ChannelItem } from "./ChannelItem";
import { InviteItem } from "./InviteItem";
import { useAuthStore } from "@/stores/authStore";
import { usePresenceStore } from "@/stores/presenceStore";
import { Avatar } from "@/components/common/Avatar";
import { ConnectedCallBar } from "@/components/voice/ConnectedCallBar";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";

const CHANNEL_DND_TYPE = "application/x-concord-channel";

export function ChannelSidebar() {
  const rooms = useRoomStore((s) => s.rooms);
  const selectedSpaceId = useRoomStore((s) => s.selectedSpaceId);
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const userId = useAuthStore((s) => s.userId);
  const openModal = useUiStore((s) => s.openModal);

  const [textCollapsed, setTextCollapsed] = useState(false);
  const [voiceCollapsed, setVoiceCollapsed] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<{ type: ChannelListType; index: number } | null>(null);

  const getOrder = useChannelOrderStore((s) => s.getOrder);
  const reorderChannel = useChannelOrderStore((s) => s.reorderChannel);
  const channelPrefs = useChannelPrefsStore((s) => s.prefs);

  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);

  const myPresence = usePresenceStore(
    (s) => s.presenceByUser.get(userId ?? "")?.presence ?? "online"
  );

  // Pending invites (shown globally, not per-space)
  const pendingInvites = Array.from(rooms.values()).filter(
    (r) => r.membership === "invite"
  );

  const channels = Array.from(rooms.values()).filter((r) => {
    if (r.isSpace) return false;
    if (r.membership !== "join") return false;
    if (selectedSpaceId === null) return r.parentSpaceId === null;
    if (r.parentSpaceId !== selectedSpaceId) return false;
    const required = r.minPowerLevelToView ?? 0;
    if (required > 0) {
      const myLevel = r.myPowerLevel ?? 0;
      if (myLevel < required) return false;
    }
    return true;
  });

  // Separate favorite channels
  const favoriteChannels = channels.filter((ch) => channelPrefs[ch.roomId]?.isFavorite);
  const nonFavoriteChannels = channels.filter((ch) => !channelPrefs[ch.roomId]?.isFavorite);

  const textChannelsRaw = nonFavoriteChannels.filter((ch) => ch.channelType === "text");
  const voiceChannelsRaw = nonFavoriteChannels.filter((ch) => ch.channelType === "voice");

  const textOrder = selectedSpaceId ? getOrder(selectedSpaceId, "text") : [];
  const voiceOrder = selectedSpaceId ? getOrder(selectedSpaceId, "voice") : [];
  const textChannels = sortChannelsByOrder(textChannelsRaw, textOrder);
  const voiceChannels = sortChannelsByOrder(voiceChannelsRaw, voiceOrder);

  const canReorder = selectedSpaceId !== null;

  function handleDragStart(e: React.DragEvent, roomId: string, type: ChannelListType) {
    e.dataTransfer.setData(CHANNEL_DND_TYPE, JSON.stringify({ roomId, type }));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ""); // some browsers need this
  }

  function handleDragOver(e: React.DragEvent, type: ChannelListType, index: number) {
    if (!e.dataTransfer.types.includes(CHANNEL_DND_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex({ type, index });
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent, type: ChannelListType, insertIndex: number) {
    e.preventDefault();
    setDragOverIndex(null);
    try {
      const raw = e.dataTransfer.getData(CHANNEL_DND_TYPE);
      if (!raw) return;
      const { roomId, type: draggedType } = JSON.parse(raw) as { roomId: string; type: ChannelListType };
      if (draggedType !== type || !selectedSpaceId) return;
      const currentOrder = type === "text" ? textChannels.map((c) => c.roomId) : voiceChannels.map((c) => c.roomId);
      reorderChannel(selectedSpaceId, type, roomId, insertIndex, currentOrder);
    } catch {
      // ignore
    }
  }

  function handleDragEnd() {
    setDragOverIndex(null);
  }

  const spaceName = selectedSpaceId
    ? rooms.get(selectedSpaceId)?.name ?? "Space"
    : "Direct Messages";

  // Get user's display name and avatar from the Matrix client
  const client = getMatrixClient();
  const user = client?.getUser(userId ?? "");
  const displayName = user?.displayName ?? userId ?? "User";
  const avatarUrl = user && client
    ? mxcToHttp(user.avatarUrl ?? null, client.getHomeserverUrl())
    : null;

  return (
    <div className="flex w-60 flex-col bg-bg-secondary">
      {/* Header */}
      <div className="flex h-12 items-center border-b border-bg-tertiary px-4 shadow-sm">
        <h2 className="flex-1 truncate text-sm font-semibold text-text-primary">
          {spaceName}
        </h2>
        {selectedSpaceId === null ? (
          <button
            onClick={() => openModal("createDm")}
            className="rounded p-1 text-text-muted hover:text-text-primary"
            title="New Direct Message"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => openModal("spaceSettings")}
            className="rounded p-1 text-text-muted hover:text-text-primary"
            title="Space settings"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        )}
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1 px-1 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-yellow">
                Pending Invites — {pendingInvites.length}
              </span>
            </div>
            {pendingInvites.map((invite) => (
              <InviteItem key={invite.roomId} room={invite} />
            ))}
            <div className="mx-1 my-2 h-px bg-bg-active" />
          </div>
        )}

        {channels.length === 0 && pendingInvites.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-text-muted">
            No channels
          </p>
        )}

        {/* Favorites Section */}
        {favoriteChannels.length > 0 && (
          <div className="mb-1">
            <button
              onClick={() => setFavoritesCollapsed(!favoritesCollapsed)}
              className="group flex w-full items-center gap-0.5 px-1 py-1.5"
            >
              <svg
                className={`h-3 w-3 text-text-muted transition-transform ${
                  favoritesCollapsed ? "-rotate-90" : ""
                }`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
              <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-yellow group-hover:text-yellow/80">
                Favorites — {favoriteChannels.length}
              </span>
            </button>
            {!favoritesCollapsed &&
              favoriteChannels.map((ch) => (
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
                {canReorder && textChannels.length > 0 && (
                  <div
                    onDragOver={(e) => handleDragOver(e, "text", 0)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, "text", 0)}
                    className={`min-h-[6px] transition-colors ${dragOverIndex?.type === "text" && dragOverIndex?.index === 0 ? "bg-accent/30" : "bg-transparent"}`}
                  />
                )}
                {textChannels.map((ch, i) => (
                  <span key={ch.roomId} className="block">
                    {canReorder && (
                      <div
                        onDragOver={(e) => handleDragOver(e, "text", i + 1)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, "text", i + 1)}
                        className={`min-h-[6px] transition-colors ${dragOverIndex?.type === "text" && dragOverIndex?.index === i + 1 ? "bg-accent/30" : "bg-transparent"}`}
                      />
                    )}
                    <div
                      draggable={canReorder}
                      onDragStart={canReorder ? (e) => handleDragStart(e, ch.roomId, "text") : undefined}
                      onDragEnd={canReorder ? handleDragEnd : undefined}
                      className={canReorder ? "cursor-grab active:cursor-grabbing" : ""}
                    >
                      <ChannelItem
                        roomId={ch.roomId}
                        name={ch.name}
                        channelType={ch.channelType}
                        unreadCount={ch.unreadCount}
                        isSelected={selectedRoomId === ch.roomId}
                        onClick={() => selectRoom(ch.roomId)}
                      />
                    </div>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Voice Channels Section — only show when a space is selected, not in overview */}
        {selectedSpaceId !== null && (voiceChannels.length > 0 || channels.length > 0) && (
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
                  <>
                    {canReorder && (
                      <div
                        onDragOver={(e) => handleDragOver(e, "voice", 0)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, "voice", 0)}
                        className={`min-h-[6px] transition-colors ${dragOverIndex?.type === "voice" && dragOverIndex?.index === 0 ? "bg-accent/30" : "bg-transparent"}`}
                      />
                    )}
                    {voiceChannels.map((ch, i) => (
                      <span key={ch.roomId} className="block">
                        {canReorder && (
                          <div
                            onDragOver={(e) => handleDragOver(e, "voice", i + 1)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, "voice", i + 1)}
                            className={`min-h-[6px] transition-colors ${dragOverIndex?.type === "voice" && dragOverIndex?.index === i + 1 ? "bg-accent/30" : "bg-transparent"}`}
                          />
                        )}
                        <div
                          draggable={canReorder}
                          onDragStart={canReorder ? (e) => handleDragStart(e, ch.roomId, "voice") : undefined}
                          onDragEnd={canReorder ? handleDragEnd : undefined}
                          className={canReorder ? "cursor-grab active:cursor-grabbing" : ""}
                        >
                          <ChannelItem
                            roomId={ch.roomId}
                            name={ch.name}
                            channelType={ch.channelType}
                            unreadCount={ch.unreadCount}
                            isSelected={selectedRoomId === ch.roomId}
                            onClick={() => selectRoom(ch.roomId)}
                          />
                        </div>
                      </span>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Voice connection bar */}
      <ConnectedCallBar />

      {/* User section */}
      <div className="flex items-center gap-2 border-t border-bg-tertiary bg-bg-floating/50 px-2 py-2">
        <button
          onClick={() => openModal("settings")}
          className="flex-shrink-0 cursor-pointer rounded-full transition-opacity hover:opacity-80"
          title="User settings"
        >
          <Avatar
            name={displayName}
            url={avatarUrl}
            size={32}
            presence={myPresence}
          />
        </button>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-text-primary">
            {displayName}
          </p>
          <p className="truncate text-[10px] text-text-muted">
            {userId}
          </p>
        </div>
        <button
          onClick={() => openModal("settings")}
          className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
          title="User settings"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
