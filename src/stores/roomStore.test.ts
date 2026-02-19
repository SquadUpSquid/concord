import { describe, it, expect, beforeEach } from "vitest";
import { useRoomStore, RoomSummary } from "./roomStore";

function makeRoom(overrides: Partial<RoomSummary> = {}): RoomSummary {
  return {
    roomId: "!room1:matrix.org",
    name: "General",
    avatarUrl: null,
    mxcAvatarUrl: null,
    topic: null,
    unreadCount: 0,
    isSpace: false,
    parentSpaceId: null,
    lastMessageTs: Date.now(),
    channelType: "text",
    membership: "join",
    isDm: false,
    inviteSender: null,
    minPowerLevelToView: 0,
    myPowerLevel: 0,
    ...overrides,
  };
}

describe("roomStore", () => {
  beforeEach(() => {
    useRoomStore.setState({
      rooms: new Map(),
      selectedSpaceId: null,
      selectedRoomId: null,
      syncState: "STOPPED",
    });
  });

  it("starts with empty state", () => {
    const state = useRoomStore.getState();
    expect(state.rooms.size).toBe(0);
    expect(state.selectedRoomId).toBeNull();
    expect(state.selectedSpaceId).toBeNull();
    expect(state.syncState).toBe("STOPPED");
  });

  it("sets rooms", () => {
    const rooms = new Map<string, RoomSummary>();
    rooms.set("!room1:matrix.org", makeRoom());
    rooms.set("!room2:matrix.org", makeRoom({ roomId: "!room2:matrix.org", name: "Random" }));

    useRoomStore.getState().setRooms(rooms);
    expect(useRoomStore.getState().rooms.size).toBe(2);
  });

  it("updates a room", () => {
    const rooms = new Map<string, RoomSummary>();
    rooms.set("!room1:matrix.org", makeRoom());
    useRoomStore.getState().setRooms(rooms);

    useRoomStore.getState().updateRoom("!room1:matrix.org", { name: "Updated", unreadCount: 5 });

    const room = useRoomStore.getState().rooms.get("!room1:matrix.org");
    expect(room?.name).toBe("Updated");
    expect(room?.unreadCount).toBe(5);
  });

  it("selects a space and clears room selection", () => {
    useRoomStore.getState().selectRoom("!room1:matrix.org");
    expect(useRoomStore.getState().selectedRoomId).toBe("!room1:matrix.org");

    useRoomStore.getState().selectSpace("!space1:matrix.org");
    expect(useRoomStore.getState().selectedSpaceId).toBe("!space1:matrix.org");
    expect(useRoomStore.getState().selectedRoomId).toBeNull();
  });

  it("selects a room", () => {
    useRoomStore.getState().selectRoom("!room1:matrix.org");
    expect(useRoomStore.getState().selectedRoomId).toBe("!room1:matrix.org");
  });

  it("sets sync state", () => {
    useRoomStore.getState().setSyncState("PREPARED");
    expect(useRoomStore.getState().syncState).toBe("PREPARED");
  });
});
