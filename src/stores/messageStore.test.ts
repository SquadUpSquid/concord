import { describe, it, expect, beforeEach } from "vitest";
import { useMessageStore, Message } from "./messageStore";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    eventId: "$event1",
    roomId: "!room1:matrix.org",
    senderId: "@user:matrix.org",
    senderName: "User",
    senderAvatar: null,
    body: "Hello",
    formattedBody: null,
    timestamp: Date.now(),
    type: "m.text",
    isEncrypted: false,
    ...overrides,
  };
}

describe("messageStore", () => {
  beforeEach(() => {
    useMessageStore.setState({
      messagesByRoom: new Map(),
      isLoadingHistory: false,
    });
  });

  it("starts empty", () => {
    const state = useMessageStore.getState();
    expect(state.messagesByRoom.size).toBe(0);
    expect(state.isLoadingHistory).toBe(false);
  });

  it("adds a message to a room", () => {
    const msg = makeMessage();
    useMessageStore.getState().addMessage("!room1:matrix.org", msg);

    const messages = useMessageStore.getState().messagesByRoom.get("!room1:matrix.org");
    expect(messages).toHaveLength(1);
    expect(messages![0].body).toBe("Hello");
  });

  it("appends messages in order", () => {
    useMessageStore.getState().addMessage("!room1:matrix.org", makeMessage({ eventId: "$1", body: "First" }));
    useMessageStore.getState().addMessage("!room1:matrix.org", makeMessage({ eventId: "$2", body: "Second" }));

    const messages = useMessageStore.getState().messagesByRoom.get("!room1:matrix.org");
    expect(messages).toHaveLength(2);
    expect(messages![0].body).toBe("First");
    expect(messages![1].body).toBe("Second");
  });

  it("sets messages for a room (replaces)", () => {
    useMessageStore.getState().addMessage("!room1:matrix.org", makeMessage());
    useMessageStore.getState().setMessages("!room1:matrix.org", [
      makeMessage({ eventId: "$new1", body: "Replaced" }),
    ]);

    const messages = useMessageStore.getState().messagesByRoom.get("!room1:matrix.org");
    expect(messages).toHaveLength(1);
    expect(messages![0].body).toBe("Replaced");
  });

  it("prepends messages (for history loading)", () => {
    useMessageStore.getState().setMessages("!room1:matrix.org", [
      makeMessage({ eventId: "$2", body: "Recent" }),
    ]);

    useMessageStore.getState().prependMessages("!room1:matrix.org", [
      makeMessage({ eventId: "$1", body: "Older" }),
    ]);

    const messages = useMessageStore.getState().messagesByRoom.get("!room1:matrix.org");
    expect(messages).toHaveLength(2);
    expect(messages![0].body).toBe("Older");
    expect(messages![1].body).toBe("Recent");
  });

  it("tracks loading history state", () => {
    useMessageStore.getState().setLoadingHistory(true);
    expect(useMessageStore.getState().isLoadingHistory).toBe(true);

    useMessageStore.getState().setLoadingHistory(false);
    expect(useMessageStore.getState().isLoadingHistory).toBe(false);
  });
});
