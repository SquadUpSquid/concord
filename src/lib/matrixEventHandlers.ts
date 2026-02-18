import { MatrixClient, ClientEvent, RoomEvent, RoomMemberEvent, RoomStateEvent, MatrixEvent, Room, Membership, SyncState } from "matrix-js-sdk";
import { useRoomStore, RoomSummary, ChannelType, RoomMembership } from "@/stores/roomStore";
import { requestNotificationPermission, sendMessageNotification, updateTitleWithUnread } from "@/lib/notifications";
import { useMessageStore, Message } from "@/stores/messageStore";
import { useMemberStore, Member } from "@/stores/memberStore";
import { useTypingStore } from "@/stores/typingStore";
import { usePresenceStore, PresenceStatus } from "@/stores/presenceStore";
import { useCallStore, CallParticipant } from "@/stores/callStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { mxcToHttp } from "@/utils/matrixHelpers";

function mapEventToMessage(event: MatrixEvent, client: MatrixClient): Message {
  const sender = event.sender;
  const homeserverUrl = client.getHomeserverUrl();
  const content = event.getContent();

  // Check if message was edited — use the replacement content if available
  const replacingEvent = event.replacingEvent();
  const effectiveContent = replacingEvent ? replacingEvent.getContent()["m.new_content"] ?? content : content;
  const isEdited = !!replacingEvent || !!content["m.relates_to"]?.rel_type?.includes("replace");
  const isRedacted = event.isRedacted();

  // Extract reply-to info from m.relates_to
  let replyToEvent: Message["replyToEvent"] = null;
  try {
    const room = client.getRoom(event.getRoomId() ?? "");
    const inReplyTo = content["m.relates_to"]?.["m.in_reply_to"]?.event_id;
    if (inReplyTo && room) {
      const replyEvent = room.findEventById(inReplyTo);
      if (replyEvent) {
        replyToEvent = {
          senderId: replyEvent.getSender() ?? "",
          senderName: replyEvent.sender?.name ?? replyEvent.getSender() ?? "Unknown",
          body: replyEvent.getContent().body ?? "",
        };
      }
    }
  } catch {
    // Ignore — reply context is optional
  }

  // Aggregate reactions from the event's relations
  const reactions: Message["reactions"] = [];
  try {
    const room = client.getRoom(event.getRoomId() ?? "");
    const relationsContainer = room?.relations?.getChildEventsForEvent(
      event.getId() ?? "", "m.annotation", "m.reaction"
    );
    if (relationsContainer) {
      const sorted = relationsContainer.getSortedAnnotationsByKey();
      if (sorted) {
        for (const [key, eventSet] of sorted) {
          const userIds = Array.from(eventSet)
            .map((e) => e.getSender())
            .filter((id): id is string => !!id);
          reactions.push({ key, count: eventSet.size, userIds });
        }
      }
    }
  } catch {
    // Ignore — reactions are optional
  }

  // Check for thread relation
  const threadRelation = content["m.relates_to"];
  const threadRootId =
    threadRelation?.rel_type === "m.thread" ? (threadRelation.event_id ?? null) : null;

  // Count thread replies if this event is a thread root
  let threadReplyCount = 0;
  let threadLastReplyTs: number | null = null;
  try {
    const room = client.getRoom(event.getRoomId() ?? "");
    if (room) {
      const threadRelations = room.relations?.getChildEventsForEvent(
        event.getId() ?? "", "m.thread", "m.room.message"
      );
      if (threadRelations) {
        const events = threadRelations.getRelations();
        threadReplyCount = events.length;
        if (events.length > 0) {
          threadLastReplyTs = events[events.length - 1].getTs();
        }
      }
    }
  } catch {
    // Thread counting is best-effort
  }

  return {
    eventId: event.getId() ?? "",
    roomId: event.getRoomId() ?? "",
    senderId: event.getSender() ?? "",
    senderName: sender?.name ?? event.getSender() ?? "Unknown",
    senderAvatar: sender ? mxcToHttp(sender.getMxcAvatarUrl(), homeserverUrl) : null,
    body: isRedacted ? "" : (effectiveContent.body ?? ""),
    formattedBody: isRedacted ? null : (effectiveContent.formatted_body ?? null),
    timestamp: event.getTs(),
    type: effectiveContent.msgtype ?? event.getType(),
    isEncrypted: event.isEncrypted(),
    isDecryptionFailure: event.isDecryptionFailure()
      || (content.body ?? "").includes("Unable to decrypt"),
    isEdited,
    isRedacted,
    replyToEvent,
    reactions,
    url: effectiveContent.url ?? null,
    info: effectiveContent.info ?? null,
    threadRootId,
    threadReplyCount,
    threadLastReplyTs,
  };
}

function buildRoomSummary(room: Room, client: MatrixClient): RoomSummary {
  const lastEvent = room.timeline[room.timeline.length - 1];
  const isSpace = room.isSpaceRoom();
  const myUserId = client.getUserId() ?? "";

  // Detect channel type from m.room.create type field (Element standard)
  const channelType: ChannelType =
    (room as any).isElementVideoRoom?.() || (room as any).isCallRoom?.()
      ? "voice"
      : "text";

  // Determine membership
  const myMember = room.getMember(myUserId);
  const membership: RoomMembership =
    myMember?.membership === "invite" ? "invite" :
    myMember?.membership === "leave" ? "leave" : "join";

  // Detect DMs — rooms with exactly 2 joined/invited members and is_direct flag
  const isDm = !!room.getDMInviter() ||
    (room.getJoinedMemberCount() + room.getInvitedMemberCount() <= 2 &&
     !isSpace &&
     room.currentState.getStateEvents("m.room.create", "")?.getContent()?.type == null);

  // Find who invited us (for invite UI)
  let inviteSender: string | null = null;
  if (membership === "invite") {
    inviteSender = room.getDMInviter() ?? myMember?.events?.member?.getSender() ?? null;
  }

  const powerLevels = room.currentState.getStateEvents("m.room.power_levels", "")?.getContent();
  const myPowerLevel = powerLevels?.users?.[myUserId] ?? powerLevels?.users_default ?? 0;

  const accessContent = room.currentState.getStateEvents("org.concord.room.access", "")?.getContent();
  const minPowerLevelToView = typeof accessContent?.minPowerLevelToView === "number" ? accessContent.minPowerLevelToView : 0;

  return {
    roomId: room.roomId,
    name: room.name,
    avatarUrl: mxcToHttp(room.getMxcAvatarUrl(), client.getHomeserverUrl()),
    topic:
      room.currentState
        .getStateEvents("m.room.topic", "")
        ?.getContent()?.topic ?? null,
    unreadCount: room.getUnreadNotificationCount() ?? 0,
    isSpace,
    parentSpaceId: null,
    lastMessageTs: lastEvent?.getTs() ?? 0,
    channelType,
    membership,
    isDm,
    inviteSender,
    minPowerLevelToView,
    myPowerLevel,
  };
}

function syncRoomList(client: MatrixClient): void {
  try {
    const rooms = client.getRooms();
    const roomMap = new Map<string, RoomSummary>();

    for (const room of rooms) {
      try {
        roomMap.set(room.roomId, buildRoomSummary(room, client));
      } catch (err) {
        console.warn("Failed to build summary for room", room.roomId, err);
      }
    }

    // Resolve space parents and load categories/section order
    const catStore = useCategoryStore.getState();
    for (const room of rooms) {
      try {
        if (room.isSpaceRoom()) {
          const childEvents = room.currentState.getStateEvents("m.space.child");
          for (const ev of childEvents) {
            const childId = ev.getStateKey();
            if (childId) {
              const child = roomMap.get(childId);
              if (child && !child.parentSpaceId) {
                child.parentSpaceId = room.roomId;
              }
            }
          }

          // Load custom categories and section order from space state
          const catEvent = room.currentState.getStateEvents("org.concord.space.categories", "");
          if (catEvent) {
            const content = catEvent.getContent();
            if (Array.isArray(content?.categories)) {
              catStore.setCategories(room.roomId, content.categories);
            }
            if (Array.isArray(content?.sectionOrder)) {
              catStore.setSectionOrder(room.roomId, content.sectionOrder);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to resolve space parents for room", room.roomId, err);
      }
    }

    useRoomStore.getState().setRooms(roomMap);
  } catch (err) {
    console.error("syncRoomList failed:", err);
  }
}

export function syncRoomMembers(client: MatrixClient, roomId: string): void {
  const room = client.getRoom(roomId);
  if (!room) return;

  const members: Member[] = room.getJoinedMembers().map((m) => ({
    userId: m.userId,
    displayName: m.name,
    avatarUrl: mxcToHttp(m.getMxcAvatarUrl(), client.getHomeserverUrl()),
    membership: m.membership ?? "join",
    powerLevel: room.currentState.getStateEvents("m.room.power_levels", "")
      ?.getContent()?.users?.[m.userId] ?? 0,
  }));

  useMemberStore.getState().setMembers(roomId, members);
}

function updateReactionsForEvent(client: MatrixClient, roomId: string, eventId: string): void {
  try {
    const room = client.getRoom(roomId);
    if (!room) return;

    const relationsContainer = room.relations?.getChildEventsForEvent(
      eventId, "m.annotation", "m.reaction"
    );

    const reactions: Message["reactions"] = [];
    if (relationsContainer) {
      const sorted = relationsContainer.getSortedAnnotationsByKey();
      if (sorted) {
        for (const [key, eventSet] of sorted) {
          const userIds = Array.from(eventSet)
            .map((e) => e.getSender())
            .filter((id): id is string => !!id);
          reactions.push({ key, count: eventSet.size, userIds });
        }
      }
    }

    useMessageStore.getState().updateReactions(roomId, eventId, reactions);
  } catch {
    // Ignore — reaction updates are best-effort
  }
}

function applySyncReady(client: MatrixClient, hasInitiallySyncedRef: { current: boolean }) {
  useRoomStore.getState().setSyncState("PREPARED");
  if (!hasInitiallySyncedRef.current || useRoomStore.getState().rooms.size === 0) {
    hasInitiallySyncedRef.current = true;
    syncRoomList(client);
  }
  updateTitleWithUnread();
}

let _registeredClient: MatrixClient | null = null;

export function registerEventHandlers(client: MatrixClient): void {
  // Prevent registering duplicate listeners on the same client instance
  // (can happen when React StrictMode double-fires effects).
  if (_registeredClient === client) return;
  _registeredClient = client;

  const hasInitiallySyncedRef = { current: false };

  client.on(ClientEvent.Sync, (state) => {
    if (state === SyncState.Prepared || state === SyncState.Syncing) {
      applySyncReady(client, hasInitiallySyncedRef);
    } else if (state === SyncState.Error) {
      useRoomStore.getState().setSyncState("ERROR");
    }
  });

  // Client may have already synced before we registered (e.g. right after startClient()).
  // Check current state so we don't show a blank loading screen forever.
  const current = client.getSyncState();
  if (current === SyncState.Prepared || current === SyncState.Syncing) {
    applySyncReady(client, hasInitiallySyncedRef);
  }

  // Request notification permission once sync is ready
  requestNotificationPermission();

  client.on(RoomEvent.Timeline, (event, room, toStartOfTimeline) => {
    if (toStartOfTimeline || !room) return;

    if (event.getType() === "m.room.message" || event.getType() === "m.room.encrypted") {
      // Check if this is an edit (m.replace relation)
      const relatesTo = event.getContent()["m.relates_to"];
      if (relatesTo?.rel_type === "m.replace" && relatesTo?.event_id) {
        const newContent = event.getContent()["m.new_content"];
        if (newContent) {
          useMessageStore.getState().updateMessage(room.roomId, relatesTo.event_id, {
            body: newContent.body ?? "",
            formattedBody: newContent.formatted_body ?? null,
            isEdited: true,
          });
        }
      } else {
        const message = mapEventToMessage(event, client);
        useMessageStore.getState().addMessage(room.roomId, message);

        // Send desktop notification for messages from other people
        const myUserId = client.getUserId();
        if (message.senderId !== myUserId && message.body) {
          const roomName = room.name ?? "Unknown Room";
          const isMention = myUserId ? message.body.includes(myUserId) : false;
          sendMessageNotification(message.senderName, message.body, room.roomId, roomName, isMention);
        }
      }
    }

    // Handle reaction events
    if (event.getType() === "m.reaction") {
      const relates = event.getContent()["m.relates_to"];
      if (relates?.event_id) {
        updateReactionsForEvent(client, room.roomId, relates.event_id);
      }
    }

    // Update room summary for last message timestamp
    useRoomStore.getState().updateRoom(room.roomId, {
      lastMessageTs: event.getTs(),
      unreadCount: room.getUnreadNotificationCount() ?? 0,
    });
    updateTitleWithUnread();
  });

  // Handle redactions (message deletions)
  client.on(RoomEvent.Redaction, (event, room) => {
    if (!room) return;
    const redactedId = event.event.redacts;
    if (redactedId) {
      useMessageStore.getState().updateMessage(room.roomId, redactedId, {
        body: "",
        formattedBody: null,
        isRedacted: true,
      });
    }
  });

  client.on(RoomEvent.Name, (room) => {
    useRoomStore.getState().updateRoom(room.roomId, { name: room.name });
  });

  // New rooms appearing (join/invite from another client)
  client.on(ClientEvent.Room, (room: Room) => {
    try {
      const summary = buildRoomSummary(room, client);
      const rooms = new Map(useRoomStore.getState().rooms);
      rooms.set(room.roomId, summary);
      // Resolve space parent if applicable
      for (const existingRoom of client.getRooms()) {
        if (existingRoom.isSpaceRoom()) {
          const childEvents = existingRoom.currentState.getStateEvents("m.space.child");
          for (const ev of childEvents) {
            if (ev.getStateKey() === room.roomId) {
              summary.parentSpaceId = existingRoom.roomId;
            }
          }
        }
      }
      useRoomStore.getState().setRooms(rooms);
    } catch (err) {
      console.warn("ClientEvent.Room handler error:", err);
    }
  });

  // Handle membership changes (new invites, joins, leaves)
  client.on(RoomEvent.MyMembership, (room, membership: Membership) => {
    try {
      if (membership === "invite" || membership === "join") {
        const summary = buildRoomSummary(room, client);
        // Resolve space parent
        for (const existingRoom of client.getRooms()) {
          if (existingRoom.isSpaceRoom()) {
            const childEvents = existingRoom.currentState.getStateEvents("m.space.child");
            for (const ev of childEvents) {
              if (ev.getStateKey() === room.roomId) {
                summary.parentSpaceId = existingRoom.roomId;
              }
            }
          }
        }
        const rooms = new Map(useRoomStore.getState().rooms);
        rooms.set(room.roomId, summary);
        useRoomStore.getState().setRooms(rooms);
      } else if (membership === "leave") {
        useRoomStore.getState().removeRoom(room.roomId);
      }
    } catch (err) {
      console.warn("RoomEvent.MyMembership handler error:", err);
    }
  });

  // Typing indicators
  client.on(RoomMemberEvent.Typing, (_event, member) => {
    const roomId = member.roomId;
    const room = client.getRoom(roomId);
    if (!room) return;
    const typingMembers = room.currentState
      .getMembers()
      .filter((m: { typing: boolean; userId: string }) => m.typing && m.userId !== client.getUserId())
      .map((m: { name: string; userId: string }) => m.name || m.userId);
    useTypingStore.getState().setTyping(roomId, typingMembers);
  });

  // User presence
  client.on(ClientEvent.Event, (event) => {
    if (event.getType() !== "m.presence") return;
    const userId = event.getSender();
    if (!userId) return;
    const content = event.getContent();
    usePresenceStore.getState().setPresence(userId, {
      userId,
      presence: (content.presence as PresenceStatus) ?? "offline",
      lastActiveAgo: content.last_active_ago ?? null,
      statusMsg: content.status_msg ?? null,
    });
  });

  // Track room state changes (topics, voice participants)
  client.on(RoomStateEvent.Events, (event) => {
    const roomId = event.getRoomId();
    if (!roomId) return;

    // Topic changes
    if (event.getType() === "m.room.topic") {
      const topic = event.getContent()?.topic ?? null;
      useRoomStore.getState().updateRoom(roomId, { topic });
    }

    // Space child added/removed — update the child room's parentSpaceId
    if (event.getType() === "m.space.child") {
      const childId = event.getStateKey();
      if (childId) {
        const content = event.getContent();
        const hasVia = content?.via && Array.isArray(content.via) && content.via.length > 0;
        if (hasVia) {
          // Child added to this space
          useRoomStore.getState().updateRoom(childId, { parentSpaceId: roomId });
        } else {
          // Child removed from this space (empty content means removal)
          const existing = useRoomStore.getState().rooms.get(childId);
          if (existing?.parentSpaceId === roomId) {
            useRoomStore.getState().updateRoom(childId, { parentSpaceId: null });
          }
        }
      }
    }

    // Channel categories changed
    if (event.getType() === "org.concord.space.categories") {
      const content = event.getContent();
      const store = useCategoryStore.getState();
      if (Array.isArray(content?.categories)) {
        store.setCategories(roomId, content.categories);
      }
      if (Array.isArray(content?.sectionOrder)) {
        store.setSectionOrder(roomId, content.sectionOrder);
      }
    }

    // Voice channel participant tracking via MatrixRTC state events
    if (event.getType() === "org.matrix.msc3401.call.member" ||
        event.getType() === "m.call.member" ||
        event.getType() === "org.matrix.msc3401.call") {
      scanVoiceParticipants(client, roomId);
    }
  });

  // Initial scan of all rooms for voice participants after sync
  client.once(ClientEvent.Sync, () => {
    const rooms = client.getRooms();
    for (const room of rooms) {
      scanVoiceParticipants(client, room.roomId);
    }
  });
}

/**
 * Extract the userId from a call.member state key.
 * Format 3 (per-device) uses `_@user:server_DEVICEID` as the state key.
 * Legacy formats use `@user:server` directly.
 */
function userIdFromStateKey(stateKey: string): string | null {
  if (stateKey.startsWith("_")) {
    const inner = stateKey.slice(1);
    const lastUnderscore = inner.lastIndexOf("_");
    if (lastUnderscore > 0) return inner.slice(0, lastUnderscore);
    return inner;
  }
  return stateKey.startsWith("@") ? stateKey : null;
}

/**
 * Scan a room for active voice/call participants using m.call.member state events.
 * Handles three MatrixRTC formats:
 *   1. Legacy m.calls array with m.devices
 *   2. Legacy memberships array
 *   3. Per-device session keys (newest, used by Element Call)
 */
function scanVoiceParticipants(client: MatrixClient, roomId: string): void {
  const room = client.getRoom(roomId);
  if (!room) return;

  const homeserverUrl = client.getHomeserverUrl();
  const activeUserIds = new Set<string>();

  const memberEvents = [
    ...room.currentState.getStateEvents("org.matrix.msc3401.call.member"),
    ...room.currentState.getStateEvents("m.call.member"),
  ];

  const now = Date.now();

  for (const event of memberEvents) {
    const stateKey = event.getStateKey();
    if (!stateKey) continue;
    const userId = userIdFromStateKey(stateKey);
    if (!userId) continue;
    if (activeUserIds.has(userId)) continue;

    const content = event.getContent();
    if (!content || Object.keys(content).length === 0) continue;

    let isActive = false;

    // Format 1: Legacy m.calls → m.devices
    const calls = content["m.calls"];
    if (Array.isArray(calls)) {
      for (const call of calls) {
        const devices = call["m.devices"] ?? [];
        if (devices.length > 0) { isActive = true; break; }
      }
    }

    // Format 2: Legacy memberships array
    if (!isActive) {
      const memberships = content["memberships"];
      if (Array.isArray(memberships)) {
        for (const m of memberships) {
          const expiresMs = m["expires"] ?? m["expires_ts"];
          const createdTs = m["created_ts"] ?? event.getTs();
          if (typeof expiresMs === "number" && typeof createdTs === "number") {
            if (createdTs + expiresMs < now) continue;
          }
          isActive = true;
          break;
        }
      }
    }

    // Format 3: Per-device session content (has "application" field)
    if (!isActive && typeof content["application"] === "string") {
      isActive = true;
    }

    if (isActive) activeUserIds.add(userId);
  }

  const participants: CallParticipant[] = [];
  for (const userId of activeUserIds) {
    const member = room.getMember(userId);
    if (!member) continue;
    participants.push({
      userId,
      displayName: member.name ?? userId,
      avatarUrl: mxcToHttp(member.getMxcAvatarUrl(), homeserverUrl),
      isSpeaking: false,
      isAudioMuted: false,
      isVideoMuted: true,
      feedId: null,
    });
  }

  useCallStore.getState().setRoomParticipants(roomId, participants);
}

export function loadRoomMessages(client: MatrixClient, roomId: string): void {
  const room = client.getRoom(roomId);
  if (!room) return;

  const messages = room.timeline
    .filter(
      (e) =>
        e.getType() === "m.room.message" ||
        e.getType() === "m.room.encrypted"
    )
    .map((e) => mapEventToMessage(e, client));

  useMessageStore.getState().setMessages(roomId, messages);
  syncRoomMembers(client, roomId);
}

export async function loadThreadMessages(
  client: MatrixClient,
  roomId: string,
  threadRootId: string
): Promise<void> {
  const room = client.getRoom(roomId);
  if (!room) return;

  try {
    // Fetch thread events using the relations API
    const response = await client.relations(
      roomId,
      threadRootId,
      "m.thread",
      "m.room.message",
      { limit: 100 }
    );

    const threadMsgs: Message[] = [];

    // First, include the thread root message itself
    const rootEvent = room.findEventById(threadRootId);
    if (rootEvent) {
      threadMsgs.push(mapEventToMessage(rootEvent, client));
    }

    // Then add all thread replies
    if (response?.events) {
      for (const evt of response.events) {
        const mapped = mapEventToMessage(evt as MatrixEvent, client);
        threadMsgs.push(mapped);
      }
    }

    // Sort by timestamp
    threadMsgs.sort((a, b) => a.timestamp - b.timestamp);
    useMessageStore.getState().setThreadMessages(threadRootId, threadMsgs);
  } catch (err) {
    console.error("Failed to load thread messages:", err);

    // Fallback: just show the root message
    const rootEvent = room.findEventById(threadRootId);
    if (rootEvent) {
      useMessageStore.getState().setThreadMessages(threadRootId, [
        mapEventToMessage(rootEvent, client),
      ]);
    }
  }
}

export async function loadMoreMessages(
  client: MatrixClient,
  roomId: string
): Promise<void> {
  const room = client.getRoom(roomId);
  if (!room) return;

  useMessageStore.getState().setLoadingHistory(true);

  await client.scrollback(room, 30);

  const messages = room.timeline
    .filter(
      (e) =>
        e.getType() === "m.room.message" ||
        e.getType() === "m.room.encrypted"
    )
    .map((e) => mapEventToMessage(e, client));

  useMessageStore.getState().setMessages(roomId, messages);
  useMessageStore.getState().setLoadingHistory(false);
}
