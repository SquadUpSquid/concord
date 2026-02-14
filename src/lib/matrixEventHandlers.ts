import { MatrixClient, ClientEvent, RoomEvent, MatrixEvent, Room } from "matrix-js-sdk";
import { useRoomStore, RoomSummary } from "@/stores/roomStore";
import { useMessageStore, Message } from "@/stores/messageStore";
import { useMemberStore, Member } from "@/stores/memberStore";
import { mxcToHttp } from "@/utils/matrixHelpers";

function mapEventToMessage(event: MatrixEvent, homeserverUrl: string): Message {
  const sender = event.sender;
  return {
    eventId: event.getId() ?? "",
    roomId: event.getRoomId() ?? "",
    senderId: event.getSender() ?? "",
    senderName: sender?.name ?? event.getSender() ?? "Unknown",
    senderAvatar: sender ? mxcToHttp(sender.getMxcAvatarUrl(), homeserverUrl) : null,
    body: event.getContent().body ?? "",
    formattedBody: event.getContent().formatted_body ?? null,
    timestamp: event.getTs(),
    type: event.getContent().msgtype ?? event.getType(),
    isEncrypted: event.isEncrypted(),
  };
}

function buildRoomSummary(room: Room, client: MatrixClient): RoomSummary {
  const lastEvent = room.timeline[room.timeline.length - 1];
  const isSpace = room.isSpaceRoom();

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

export function registerEventHandlers(client: MatrixClient): void {
  client.on(ClientEvent.Sync, (state) => {
    if (state === "PREPARED" || state === "SYNCING") {
      useRoomStore.getState().setSyncState("PREPARED");
      syncRoomList(client);
    } else if (state === "ERROR") {
      useRoomStore.getState().setSyncState("ERROR");
    }
  });

  client.on(RoomEvent.Timeline, (event, room, toStartOfTimeline) => {
    if (toStartOfTimeline || !room) return;

    if (event.getType() === "m.room.message" || event.getType() === "m.room.encrypted") {
      const message = mapEventToMessage(event, client.getHomeserverUrl());
      useMessageStore.getState().addMessage(room.roomId, message);
    }

    // Update room summary for last message timestamp
    useRoomStore.getState().updateRoom(room.roomId, {
      lastMessageTs: event.getTs(),
      unreadCount: room.getUnreadNotificationCount() ?? 0,
    });
  });

  client.on(RoomEvent.Name, (room) => {
    useRoomStore.getState().updateRoom(room.roomId, { name: room.name });
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
    .map((e) => mapEventToMessage(e, client.getHomeserverUrl()));

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
    .map((e) => mapEventToMessage(e, client.getHomeserverUrl()));

  useMessageStore.getState().setMessages(roomId, messages);
  useMessageStore.getState().setLoadingHistory(false);
}
