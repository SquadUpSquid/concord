import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRoomStore, RoomSummary } from "@/stores/roomStore";
import { useUiStore } from "@/stores/uiStore";
import { useChannelPrefsStore } from "@/stores/channelPrefsStore";
import { useCategoryStore, generateCategoryId, buildSectionOrder, Category } from "@/stores/categoryStore";
import { ChannelItem } from "./ChannelItem";
import { DmItem } from "./DmItem";
import { InviteItem } from "./InviteItem";
import { POWER_LEVEL_MODERATOR } from "@/utils/roles";
import { EmojiText } from "@/components/common/Emoji";

const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_ORDER: string[] = [];

// Minimum px the mouse must move before we start a drag
const DRAG_THRESHOLD = 5;

export function ChannelSidebar() {
  const rooms = useRoomStore((s) => s.rooms);
  const selectedSpaceId = useRoomStore((s) => s.selectedSpaceId);
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const openModal = useUiStore((s) => s.openModal);

  const [orphanCollapsed, setOrphanCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(false);

  // Mouse-based drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ catId: string; index: number } | null>(null);
  const [sectionDropIndex, setSectionDropIndex] = useState<number | null>(null);

  // Refs for mouse drag tracking (synchronous access in event handlers)
  const dragRef = useRef<{
    type: "channel" | "section";
    id: string;
    sourceCatId: string;
    startY: number;
    started: boolean;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const channelPrefs = useChannelPrefsStore((s) => s.prefs);
  const categories = useCategoryStore((s) =>
    selectedSpaceId ? (s.categoriesBySpace[selectedSpaceId] ?? EMPTY_CATEGORIES) : EMPTY_CATEGORIES
  );
  const storedSectionOrder = useCategoryStore((s) =>
    selectedSpaceId ? (s.sectionOrderBySpace[selectedSpaceId] ?? EMPTY_ORDER) : EMPTY_ORDER
  );
  const saveCategories = useCategoryStore((s) => s.saveCategories);
  const saveSectionOrder = useCategoryStore((s) => s.saveSectionOrder);

  const sectionOrder = useMemo(
    () => buildSectionOrder(storedSectionOrder, categories),
    [storedSectionOrder, categories]
  );
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Category create/rename state
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameCatName, setRenameCatName] = useState("");

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

  // Channels assigned to a custom category
  const assignedChannelIds = new Set(categories.flatMap((c) => c.channelIds));

  // Default sections: uncategorized text and voice channels (not favorites, not in a custom section)
  const defaultTextChannels = isHomeView
    ? []
    : channels.filter(
        (ch) => ch.channelType === "text" && !channelPrefs[ch.roomId]?.isFavorite && !assignedChannelIds.has(ch.roomId)
      );
  const defaultVoiceChannels = isHomeView
    ? []
    : channels.filter(
        (ch) => ch.channelType === "voice" && !channelPrefs[ch.roomId]?.isFavorite && !assignedChannelIds.has(ch.roomId)
      );

  // Only admins/moderators can organize channels and sections
  const mySpacePowerLevel = useMemo(() => {
    if (!selectedSpaceId) return 0;
    const space = rooms.get(selectedSpaceId);
    return space?.myPowerLevel ?? 0;
  }, [selectedSpaceId, rooms]);

  const canManage = selectedSpaceId !== null && mySpacePowerLevel >= POWER_LEVEL_MODERATOR;

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

  const isDefaultSection = (id: string) => id === "__text" || id === "__voice";

  const sectionChannelsById = useMemo(() => {
    const map = new Map<string, RoomSummary[]>();
    for (const sectionId of sectionOrder) {
      if (sectionId === "__text") {
        map.set(sectionId, defaultTextChannels);
        continue;
      }
      if (sectionId === "__voice") {
        map.set(sectionId, defaultVoiceChannels);
        continue;
      }
      const cat = categoryById.get(sectionId);
      map.set(sectionId, cat ? getCategoryChannels(cat) : []);
    }
    return map;
  }, [sectionOrder, defaultTextChannels, defaultVoiceChannels, categoryById, getCategoryChannels]);

  const visibleSectionOrder = useMemo(() => {
    if (canManage) return sectionOrder;
    return sectionOrder.filter((sectionId) => (sectionChannelsById.get(sectionId)?.length ?? 0) > 0);
  }, [canManage, sectionOrder, sectionChannelsById]);

  // ── Mouse-based drag-and-drop ──

  function handleChannelMouseDown(e: React.MouseEvent, roomId: string, catId: string) {
    if (e.button !== 0) return; // left-click only
    e.preventDefault();
    dragRef.current = { type: "channel", id: roomId, sourceCatId: catId, startY: e.clientY, started: false };
  }

  function handleSectionMouseDown(e: React.MouseEvent, sectionId: string) {
    if (e.button !== 0) return;
    // Don't start section drag if clicking on buttons/inputs
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("span[title]")) return;
    e.preventDefault();
    dragRef.current = { type: "section", id: sectionId, sourceCatId: "", startY: e.clientY, started: false };
  }

  // Global mousemove/mouseup handlers for drag tracking
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;

      // Check threshold
      if (!drag.started) {
        if (Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD) return;
        drag.started = true;
        if (drag.type === "channel") {
          setDraggingId(drag.id);
        } else {
          setDraggingSectionId(drag.id);
        }
      }

      // Find the element under the cursor using data attributes
      const container = scrollContainerRef.current;
      if (!container) return;

      if (drag.type === "channel") {
        // Find which channel item we're over
        const channelEls = container.querySelectorAll<HTMLElement>("[data-channel-id]");
        let bestTarget: { catId: string; index: number } | null = null;

        for (const el of channelEls) {
          const rect = el.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const catId = el.dataset.channelCat!;
            const index = parseInt(el.dataset.channelIdx!, 10);
            const midY = rect.top + rect.height / 2;
            bestTarget = { catId, index: e.clientY < midY ? index : index + 1 };
            break;
          }
        }

        // Also check empty section drop zones
        if (!bestTarget) {
          const emptyEls = container.querySelectorAll<HTMLElement>("[data-empty-section]");
          for (const el of emptyEls) {
            const rect = el.getBoundingClientRect();
            if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
              bestTarget = { catId: el.dataset.emptySection!, index: 0 };
              break;
            }
          }
        }

        // Check section containers as fallback (drop at end of section)
        if (!bestTarget) {
          const sectionEls = container.querySelectorAll<HTMLElement>("[data-section-id]");
          for (const el of sectionEls) {
            const rect = el.getBoundingClientRect();
            if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
              const sectionId = el.dataset.sectionId!;
              const count = parseInt(el.dataset.sectionCount ?? "0", 10);
              bestTarget = { catId: sectionId, index: count };
              break;
            }
          }
        }

        setDragOverTarget(bestTarget);
      } else {
        // Section drag - find which section index we're over
        const sectionEls = container.querySelectorAll<HTMLElement>("[data-section-id]");
        let bestIdx: number | null = null;
        for (const el of sectionEls) {
          const rect = el.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
            const idx = parseInt(el.dataset.sectionIdx!, 10);
            const midY = rect.top + rect.height / 2;
            bestIdx = e.clientY < midY ? idx : idx + 1;
            break;
          }
        }
        setSectionDropIndex(bestIdx);
      }
    }

    function onMouseUp() {
      const drag = dragRef.current;
      if (!drag || !drag.started) {
        dragRef.current = null;
        return;
      }

      if (drag.type === "channel") {
        // Perform channel drop
        performChannelDrop(drag.id, drag.sourceCatId);
      } else {
        // Perform section drop
        performSectionDrop(drag.id);
      }

      dragRef.current = null;
      setDraggingId(null);
      setDraggingSectionId(null);
      setDragOverTarget(null);
      setSectionDropIndex(null);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  });

  function performChannelDrop(roomId: string, sourceCatId: string) {
    const target = dragOverTarget;
    if (!target || !selectedSpaceId) return;
    const targetCatId = target.catId;
    const insertIndex = target.index;

    if (sourceCatId === targetCatId && isDefaultSection(targetCatId)) return;

    const updated = categories.map((c) => ({ ...c, channelIds: [...c.channelIds] }));

    // Remove from source custom category
    if (!isDefaultSection(sourceCatId)) {
      const src = updated.find((c) => c.id === sourceCatId);
      if (src) src.channelIds = src.channelIds.filter((id) => id !== roomId);
    }

    // Add to target
    if (isDefaultSection(targetCatId)) {
      for (const c of updated) c.channelIds = c.channelIds.filter((id) => id !== roomId);
    } else {
      const tgt = updated.find((c) => c.id === targetCatId);
      if (tgt) {
        tgt.channelIds = tgt.channelIds.filter((id) => id !== roomId);
        tgt.channelIds.splice(insertIndex, 0, roomId);
      }
    }
    saveCategories(selectedSpaceId!, updated);
  }

  function performSectionDrop(sectionId: string) {
    const targetIdx = sectionDropIndex;
    if (targetIdx == null || !selectedSpaceId) return;
    const currentIdx = sectionOrder.indexOf(sectionId);
    if (currentIdx === -1 || currentIdx === targetIdx) return;
    const reordered = [...sectionOrder];
    const [moved] = reordered.splice(currentIdx, 1);
    const insertAt = targetIdx > currentIdx ? targetIdx - 1 : targetIdx;
    reordered.splice(insertAt, 0, moved);
    saveSectionOrder(selectedSpaceId!, reordered);
  }

  // ── Category CRUD ──
  async function handleCreateCategory() {
    if (!newCatName.trim() || !selectedSpaceId) return;
    const newCat: Category = { id: generateCategoryId(), name: newCatName.trim(), channelIds: [] };
    const newOrder = [...sectionOrder];
    const voiceIdx = newOrder.indexOf("__voice");
    if (voiceIdx !== -1) newOrder.splice(voiceIdx, 0, newCat.id);
    else newOrder.push(newCat.id);
    await saveCategories(selectedSpaceId, [...categories, newCat], newOrder);
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
    const newOrder = sectionOrder.filter((id) => id !== catId);
    await saveCategories(selectedSpaceId, updated, newOrder);
  }

  const spaceName = selectedSpaceId
    ? rooms.get(selectedSpaceId)?.name ?? "Space"
    : "Direct Messages";

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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-1.5 py-2">
        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mb-1.5">
            <div className="flex items-center gap-1 px-1.5 py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-yellow">
                Pending Invites — {pendingInvites.length}
              </span>
            </div>
            {pendingInvites.map((invite) => (
              <InviteItem key={invite.roomId} room={invite} />
            ))}
            <div className="mx-1.5 my-1.5 h-px bg-bg-active" />
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
              <div className="mb-1.5">
                <div className="px-1.5 py-1">
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
              <div className="mb-1.5">
                <button
                  onClick={() => setOrphanCollapsed(!orphanCollapsed)}
                  className="group flex w-full items-center gap-1 px-1.5 py-1"
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

        {/* ──── SPACE VIEW ──── */}
        {!isHomeView && (
          <>
            {channels.length === 0 && pendingInvites.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-text-muted">
                No channels
              </p>
            )}

            {/* Favorites */}
            {favoriteChannels.length > 0 && (
              <div className="mb-1.5">
                <button
                  onClick={() => setFavoritesCollapsed(!favoritesCollapsed)}
                  className="group flex w-full items-center gap-1 px-1.5 py-1"
                >
                  <svg className={`h-3 w-3 text-text-muted transition-transform ${favoritesCollapsed ? "-rotate-90" : ""}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                  <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-yellow group-hover:text-yellow/80">
                    Favorites — {favoriteChannels.length}
                  </span>
                </button>
                {!favoritesCollapsed &&
                  favoriteChannels.map((ch) => (
                    <ChannelItem key={ch.roomId} roomId={ch.roomId} name={ch.name} channelType={ch.channelType} unreadCount={ch.unreadCount} isSelected={selectedRoomId === ch.roomId} onClick={() => selectRoom(ch.roomId)} />
                  ))}
              </div>
            )}

            {/* All sections in unified order */}
            {visibleSectionOrder.map((sectionId, secIdx) => {
              const isDefault = isDefaultSection(sectionId);
              const cat = isDefault ? null : categoryById.get(sectionId);
              if (!isDefault && !cat) return null;

              const sectionLabel = sectionId === "__text" ? "Text Channels" : sectionId === "__voice" ? "Voice Channels" : cat!.name;
              const sectionChannels = sectionChannelsById.get(sectionId) ?? [];
              const isCollapsed = collapsedSections[sectionId] ?? false;
              const isRenaming = !isDefault && renamingCatId === sectionId;
              const emptyLabel = sectionId === "__text" ? "No text channels" : sectionId === "__voice" ? "No voice channels" : "Drag channels here";

              return (
                <div
                  key={sectionId}
                  className={`relative mb-1.5 ${draggingSectionId === sectionId ? "opacity-40" : ""}`}
                  data-section-id={sectionId}
                  data-section-idx={secIdx}
                  data-section-count={sectionChannels.length}
                >
                  {/* Section drop indicator */}
                  {canManage && sectionDropIndex === secIdx && draggingSectionId && draggingSectionId !== sectionId && (
                    <div className="absolute left-0 right-0 top-0 z-10 h-0.5 rounded bg-accent" />
                  )}

                  {/* Section header */}
                  <div
                    className="group flex w-full items-center gap-1 px-1.5 py-1"
                    onMouseDown={canManage ? (e) => handleSectionMouseDown(e, sectionId) : undefined}
                  >
                    <button onClick={() => toggleSection(sectionId)} className="flex flex-1 items-center gap-1">
                      <svg className={`h-3 w-3 text-text-muted transition-transform ${isCollapsed ? "-rotate-90" : ""}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z" />
                      </svg>
                      {isRenaming ? (
                        <input autoFocus value={renameCatName} onChange={(e) => setRenameCatName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRenameCategory(sectionId); if (e.key === "Escape") { setRenamingCatId(null); setRenameCatName(""); } }}
                          onBlur={() => handleRenameCategory(sectionId)}
                          className="w-full bg-transparent text-[11px] font-semibold uppercase tracking-wide text-text-primary outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted group-hover:text-text-secondary"
                          onDoubleClick={canManage && !isDefault ? () => { setRenamingCatId(sectionId); setRenameCatName(cat!.name); } : undefined}
                        >
                          <EmojiText text={sectionLabel} emojiSize={14} />
                        </span>
                      )}
                    </button>
                    {canManage && (
                      <>
                        <span onClick={(e) => { e.stopPropagation(); openModal("createRoom"); }} className="rounded p-0.5 text-text-muted opacity-0 hover:text-text-primary group-hover:opacity-100 cursor-pointer" title="Create channel">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                        </span>
                        {!isDefault && (
                          <span onClick={(e) => { e.stopPropagation(); handleDeleteCategory(sectionId); }} className="rounded p-0.5 text-text-muted opacity-0 hover:text-red group-hover:opacity-100 cursor-pointer" title="Delete section">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Section channels */}
                  {!isCollapsed && (
                    <div>
                      {sectionChannels.length === 0 ? (
                        <div
                          className={`rounded px-2 py-1.5 text-xs text-text-muted ${!isDefault ? "italic" : ""} ${canManage && dragOverTarget?.catId === sectionId ? "bg-accent/10" : ""}`}
                          data-empty-section={sectionId}
                        >{emptyLabel}</div>
                      ) : (
                        sectionChannels.map((ch, i) => (
                          <div
                            key={ch.roomId}
                            className="relative"
                            data-channel-id={ch.roomId}
                            data-channel-cat={sectionId}
                            data-channel-idx={i}
                          >
                            {canManage && dragOverTarget?.catId === sectionId && dragOverTarget.index === i && draggingId !== ch.roomId && (
                              <div className="absolute left-1 right-1 top-0 z-10 h-0.5 rounded bg-accent" />
                            )}
                            <div
                              className={`${canManage ? "cursor-grab active:cursor-grabbing" : ""} ${draggingId === ch.roomId ? "opacity-40" : ""}`}
                              onMouseDown={canManage ? (e) => handleChannelMouseDown(e, ch.roomId, sectionId) : undefined}
                            >
                              <ChannelItem roomId={ch.roomId} name={ch.name} channelType={ch.channelType} unreadCount={ch.unreadCount} isSelected={selectedRoomId === ch.roomId} onClick={() => selectRoom(ch.roomId)} />
                            </div>
                            {canManage && dragOverTarget?.catId === sectionId && dragOverTarget.index === i + 1 && i === sectionChannels.length - 1 && draggingId !== ch.roomId && (
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

            {/* Section drop indicator after last section */}
            {canManage && sectionDropIndex === visibleSectionOrder.length && draggingSectionId && (
              <div className="relative h-0.5 rounded bg-accent" />
            )}

            {/* Create Section button */}
            {canManage && (
              <div className="mt-1.5 px-0.5">
                {creatingCategory ? (
                  <div className="flex items-center gap-1.5 px-1">
                    <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateCategory(); if (e.key === "Escape") { setCreatingCategory(false); setNewCatName(""); } }}
                      placeholder="Section name"
                      className="w-full rounded bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button onClick={handleCreateCategory} disabled={!newCatName.trim()} className="rounded bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50">
                      Add
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setCreatingCategory(true)} className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-[11px] text-text-muted hover:text-text-secondary">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    Create Section
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
