import { useState, useCallback } from "react";
import { useRoomStore, RoomSummary } from "@/stores/roomStore";
import { useUiStore } from "@/stores/uiStore";
import { useChannelPrefsStore } from "@/stores/channelPrefsStore";
import { useCategoryStore, generateCategoryId, Category } from "@/stores/categoryStore";
import { ChannelItem } from "./ChannelItem";
import { DmItem } from "./DmItem";
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

  const [orphanCollapsed, setOrphanCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [dragOverTarget, setDragOverTarget] = useState<{ catId: string; index: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const channelPrefs = useChannelPrefsStore((s) => s.prefs);
  const categories = useCategoryStore((s) => selectedSpaceId ? s.getCategories(selectedSpaceId) : []);
  const saveCategories = useCategoryStore((s) => s.saveCategories);

  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);

  // Category create/rename state
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameCatName, setRenameCatName] = useState("");

  const myPresence = usePresenceStore(
    (s) => s.presenceByUser.get(userId ?? "")?.presence ?? "online"
  );

  const pendingInvites = Array.from(rooms.values()).filter(
    (r) => r.membership === "invite"
  );

  const isHomeView = selectedSpaceId === null;

  const channels = Array.from(rooms.values()).filter((r) => {
    if (r.isSpace) return false;
    if (r.membership !== "join") return false;
    if (isHomeView) return r.parentSpaceId === null;
    if (r.parentSpaceId !== selectedSpaceId) return false;
    const required = r.minPowerLevelToView ?? 0;
    if (required > 0) {
      const myLevel = r.myPowerLevel ?? 0;
      if (myLevel < required) return false;
    }
    return true;
  });

  // Home view: separate DMs from orphan channels
  const dmChannels = isHomeView
    ? channels
        .filter((ch) => ch.isDm)
        .sort((a, b) => b.lastMessageTs - a.lastMessageTs)
    : [];
  const orphanChannels = isHomeView
    ? channels.filter((ch) => !ch.isDm)
    : [];

  // Space view: group channels by category
  const favoriteChannels = isHomeView
    ? []
    : channels.filter((ch) => channelPrefs[ch.roomId]?.isFavorite);

  // Build channel lookup for quick access
  const channelMap = new Map(channels.map((ch) => [ch.roomId, ch]));

  // Channels assigned to a category (resolved from category channelIds)
  const assignedChannelIds = new Set(categories.flatMap((c) => c.channelIds));

  // Uncategorized channels (in space, not favorites, not assigned to any category)
  const uncategorizedChannels = isHomeView
    ? []
    : channels.filter(
        (ch) => !channelPrefs[ch.roomId]?.isFavorite && !assignedChannelIds.has(ch.roomId)
      );

  const canReorder = selectedSpaceId !== null;

  // Resolve channels for a given category, preserving order
  const getCategoryChannels = useCallback(
    (cat: Category): RoomSummary[] =>
      cat.channelIds
        .map((id) => channelMap.get(id))
        .filter((ch): ch is RoomSummary => !!ch && !channelPrefs[ch.roomId]?.isFavorite),
    [channelMap, channelPrefs]
  );

  const toggleSection = (id: string) =>
    setCollapsedSections((s) => ({ ...s, [id]: !s[id] }));

  // ── Drag-and-drop within a category ──
  function handleDragStart(e: React.DragEvent, roomId: string, catId: string) {
    e.dataTransfer.setData(CHANNEL_DND_TYPE, JSON.stringify({ roomId, catId }));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
    setDraggingId(roomId);
  }

  function handleItemDragOver(e: React.DragEvent, catId: string, index: number) {
    if (!e.dataTransfer.types.includes(CHANNEL_DND_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertAt = e.clientY < midY ? index : index + 1;
    setDragOverTarget({ catId, index: insertAt });
  }

  function handleDrop(e: React.DragEvent, targetCatId: string) {
    e.preventDefault();
    const insertIndex = dragOverTarget?.index ?? 0;
    setDragOverTarget(null);
    setDraggingId(null);
    if (!selectedSpaceId) return;
    try {
      const raw = e.dataTransfer.getData(CHANNEL_DND_TYPE);
      if (!raw) return;
      const { roomId, catId: sourceCatId } = JSON.parse(raw) as { roomId: string; catId: string };
      const updated = categories.map((c) => ({ ...c, channelIds: [...c.channelIds] }));

      // Remove from source
      if (sourceCatId !== "__uncategorized") {
        const src = updated.find((c) => c.id === sourceCatId);
        if (src) src.channelIds = src.channelIds.filter((id) => id !== roomId);
      }

      // Add to target
      if (targetCatId === "__uncategorized") {
        // Removing from a category puts it back in uncategorized (just remove from all)
        for (const c of updated) c.channelIds = c.channelIds.filter((id) => id !== roomId);
      } else {
        const tgt = updated.find((c) => c.id === targetCatId);
        if (tgt) {
          tgt.channelIds = tgt.channelIds.filter((id) => id !== roomId);
          tgt.channelIds.splice(insertIndex, 0, roomId);
        }
      }
      saveCategories(selectedSpaceId, updated);
    } catch {
      // ignore
    }
  }

  function handleDragEnd() {
    setDragOverTarget(null);
    setDraggingId(null);
  }

  // ── Category CRUD ──
  async function handleCreateCategory() {
    if (!newCatName.trim() || !selectedSpaceId) return;
    const newCat: Category = { id: generateCategoryId(), name: newCatName.trim(), channelIds: [] };
    await saveCategories(selectedSpaceId, [...categories, newCat]);
    setNewCatName("");
    setCreatingCategory(false);
  }

  async function handleRenameCategory(catId: string) {
    if (!renameCatName.trim() || !selectedSpaceId) return;
    const updated = categories.map((c) =>
      c.id === catId ? { ...c, name: renameCatName.trim() } : c
    );
    await saveCategories(selectedSpaceId, updated);
    setRenamingCatId(null);
    setRenameCatName("");
  }

  async function handleDeleteCategory(catId: string) {
    if (!selectedSpaceId) return;
    const updated = categories.filter((c) => c.id !== catId);
    await saveCategories(selectedSpaceId, updated);
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

        {/* ──── HOME VIEW (DMs + orphan channels) ──── */}
        {isHomeView && (
          <>
            {dmChannels.length === 0 && orphanChannels.length === 0 && pendingInvites.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-text-muted">
                No conversations yet
              </p>
            )}

            {/* Direct Messages list */}
            {dmChannels.length > 0 && (
              <div className="mb-1">
                <div className="px-1 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Direct Messages — {dmChannels.length}
                  </span>
                </div>
                {dmChannels.map((ch) => (
                  <DmItem
                    key={ch.roomId}
                    roomId={ch.roomId}
                    name={ch.name}
                    unreadCount={ch.unreadCount}
                    isSelected={selectedRoomId === ch.roomId}
                    onClick={() => selectRoom(ch.roomId)}
                  />
                ))}
              </div>
            )}

            {/* Orphan channels (not DMs, no parent space) */}
            {orphanChannels.length > 0 && (
              <div className="mb-1">
                <button
                  onClick={() => setOrphanCollapsed(!orphanCollapsed)}
                  className="group flex w-full items-center gap-0.5 px-1 py-1.5"
                >
                  <svg
                    className={`h-3 w-3 text-text-muted transition-transform ${
                      orphanCollapsed ? "-rotate-90" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                  <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted group-hover:text-text-secondary">
                    Channels — {orphanChannels.length}
                  </span>
                </button>
                {!orphanCollapsed &&
                  orphanChannels.map((ch) => (
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
          </>
        )}

        {/* ──── SPACE VIEW (favorites, categories, uncategorized) ──── */}
        {!isHomeView && (
          <>
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

            {/* User-created categories */}
            {categories.map((cat) => {
              const catChannels = getCategoryChannels(cat);
              const isCollapsed = collapsedSections[cat.id] ?? false;
              const isRenaming = renamingCatId === cat.id;

              return (
                <div key={cat.id} className="mb-1">
                  <div className="group flex w-full items-center gap-0.5 px-1 py-1.5">
                    <button onClick={() => toggleSection(cat.id)} className="flex flex-1 items-center gap-0.5">
                      <svg
                        className={`h-3 w-3 text-text-muted transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M7 10l5 5 5-5z" />
                      </svg>
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameCatName}
                          onChange={(e) => setRenameCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameCategory(cat.id);
                            if (e.key === "Escape") { setRenamingCatId(null); setRenameCatName(""); }
                          }}
                          onBlur={() => handleRenameCategory(cat.id)}
                          className="w-full bg-transparent text-[11px] font-semibold uppercase tracking-wide text-text-primary outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted group-hover:text-text-secondary"
                          onDoubleClick={() => { setRenamingCatId(cat.id); setRenameCatName(cat.name); }}
                        >
                          {cat.name}
                        </span>
                      )}
                    </button>
                    {/* Create channel in this category */}
                    <span
                      onClick={(e) => { e.stopPropagation(); openModal("createRoom"); }}
                      className="rounded p-0.5 text-text-muted opacity-0 hover:text-text-primary group-hover:opacity-100 cursor-pointer"
                      title="Create channel"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                    {/* Delete category */}
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                      className="rounded p-0.5 text-text-muted opacity-0 hover:text-red group-hover:opacity-100 cursor-pointer"
                      title="Delete section"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </span>
                  </div>
                  {!isCollapsed && (
                    <div>
                      {catChannels.length === 0 ? (
                        <p className="px-3 py-1 text-xs text-text-muted italic">No channels</p>
                      ) : (
                        catChannels.map((ch, i) => (
                          <div
                            key={ch.roomId}
                            className="relative"
                            draggable={canReorder}
                            onDragStart={canReorder ? (e) => handleDragStart(e, ch.roomId, cat.id) : undefined}
                            onDragOver={canReorder ? (e) => handleItemDragOver(e, cat.id, i) : undefined}
                            onDrop={canReorder ? (e) => handleDrop(e, cat.id) : undefined}
                            onDragEnd={canReorder ? handleDragEnd : undefined}
                          >
                            {canReorder && dragOverTarget?.catId === cat.id && dragOverTarget.index === i && draggingId !== ch.roomId && (
                              <div className="absolute left-1 right-1 top-0 z-10 h-0.5 rounded bg-accent" />
                            )}
                            <div className={`${canReorder ? "cursor-grab active:cursor-grabbing" : ""} ${draggingId === ch.roomId ? "opacity-40" : ""}`}>
                              <ChannelItem
                                roomId={ch.roomId}
                                name={ch.name}
                                channelType={ch.channelType}
                                unreadCount={ch.unreadCount}
                                isSelected={selectedRoomId === ch.roomId}
                                onClick={() => selectRoom(ch.roomId)}
                              />
                            </div>
                            {canReorder && dragOverTarget?.catId === cat.id && dragOverTarget.index === i + 1 && i === catChannels.length - 1 && draggingId !== ch.roomId && (
                              <div className="absolute bottom-0 left-1 right-1 z-10 h-0.5 rounded bg-accent" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized channels */}
            {uncategorizedChannels.length > 0 && (
              <div className="mb-1">
                <button
                  onClick={() => toggleSection("__uncategorized")}
                  className="group flex w-full items-center gap-0.5 px-1 py-1.5"
                >
                  <svg
                    className={`h-3 w-3 text-text-muted transition-transform ${
                      collapsedSections["__uncategorized"] ? "-rotate-90" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                  <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted group-hover:text-text-secondary">
                    Channels
                  </span>
                  <span
                    onClick={(e) => { e.stopPropagation(); openModal("createRoom"); }}
                    className="rounded p-0.5 text-text-muted opacity-0 hover:text-text-primary group-hover:opacity-100 cursor-pointer"
                    title="Create channel"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
                {!collapsedSections["__uncategorized"] && (
                  <div>
                    {uncategorizedChannels.map((ch, i) => (
                      <div
                        key={ch.roomId}
                        className="relative"
                        draggable={canReorder}
                        onDragStart={canReorder ? (e) => handleDragStart(e, ch.roomId, "__uncategorized") : undefined}
                        onDragOver={canReorder ? (e) => handleItemDragOver(e, "__uncategorized", i) : undefined}
                        onDrop={canReorder ? (e) => handleDrop(e, "__uncategorized") : undefined}
                        onDragEnd={canReorder ? handleDragEnd : undefined}
                      >
                        {canReorder && dragOverTarget?.catId === "__uncategorized" && dragOverTarget.index === i && draggingId !== ch.roomId && (
                          <div className="absolute left-1 right-1 top-0 z-10 h-0.5 rounded bg-accent" />
                        )}
                        <div className={`${canReorder ? "cursor-grab active:cursor-grabbing" : ""} ${draggingId === ch.roomId ? "opacity-40" : ""}`}>
                          <ChannelItem
                            roomId={ch.roomId}
                            name={ch.name}
                            channelType={ch.channelType}
                            unreadCount={ch.unreadCount}
                            isSelected={selectedRoomId === ch.roomId}
                            onClick={() => selectRoom(ch.roomId)}
                          />
                        </div>
                        {canReorder && dragOverTarget?.catId === "__uncategorized" && dragOverTarget.index === i + 1 && i === uncategorizedChannels.length - 1 && draggingId !== ch.roomId && (
                          <div className="absolute bottom-0 left-1 right-1 z-10 h-0.5 rounded bg-accent" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Category button / inline form */}
            {canReorder && (
              <div className="mt-1 px-1">
                {creatingCategory ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateCategory();
                        if (e.key === "Escape") { setCreatingCategory(false); setNewCatName(""); }
                      }}
                      placeholder="Section name"
                      className="w-full rounded-sm bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      onClick={handleCreateCategory}
                      disabled={!newCatName.trim()}
                      className="rounded-sm bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreatingCategory(true)}
                    className="flex w-full items-center gap-1 rounded-sm px-1 py-1 text-[11px] text-text-muted hover:text-text-secondary"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Create Section
                  </button>
                )}
              </div>
            )}
          </>
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
