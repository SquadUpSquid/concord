import { MatrixClient, ClientEvent, RoomEvent, RoomMemberEvent, MatrixEvent, Room, Membership } from "matrix-js-sdk";
import { useRoomStore, RoomSummary, ChannelType, RoomMembership } from "@/stores/roomStore";
import { requestNotificationPermission, sendMessageNotification, updateTitleWithUnread } from "@/lib/notifications";
import { useMessageStore, Message } from "@/stores/messageStore";
import { useMemberStore, Member } from "@/stores/memberStore";
import { useTypingStore } from "@/stores/typingStore";
import { usePresenceStore, PresenceStatus } from "@/stores/presenceStore";
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
  };
}

function syncRoomList(client: MatrixClient): void {
  const rooms = client.getRooms();
  const roomMap = new Map<string, RoomSummary>();

  for (const room of rooms) {
    roomMap.set(room.roomId, buildRoomSummary(room, client));
  }

  // Resolve space parents
  for (const room of rooms) {
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
    }
  }

  useRoomStore.getState().setRooms(roomMap);
}

function syncRoomMembers(client: MatrixClient, roomId: string): void {
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

export function registerEventHandlers(client: MatrixClient): void {
  client.on(ClientEvent.Sync, (state) => {
    if (state === "PREPARED" || state === "SYNCING") {
      useRoomStore.getState().setSyncState("PREPARED");
      syncRoomList(client);
      updateTitleWithUnread();
    } else if (state === "ERROR") {
      useRoomStore.getState().setSyncState("ERROR");
    }
  });

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
          sendMessageNotification(message.senderName, message.body, room.roomId, roomName);
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

  // Handle membership changes (new invites, joins, leaves)
  client.on(RoomEvent.MyMembership, (room, membership: Membership) => {
    if (membership === "invite" || membership === "join") {
      const summary = buildRoomSummary(room, client);
      const rooms = new Map(useRoomStore.getState().rooms);
      rooms.set(room.roomId, summary);
      useRoomStore.getState().setRooms(rooms);
    } else if (membership === "leave") {
      useRoomStore.getState().removeRoom(room.roomId);
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
