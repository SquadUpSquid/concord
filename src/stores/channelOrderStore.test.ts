import { describe, it, expect, beforeEach } from "vitest";
import {
  useChannelOrderStore,
  sortChannelsByOrder,
  type ChannelListType,
} from "./channelOrderStore";

describe("sortChannelsByOrder", () => {
  it("sorts by name when order is empty", () => {
    const channels = [
      { roomId: "3", name: "C" },
      { roomId: "1", name: "A" },
      { roomId: "2", name: "B" },
    ];
    const result = sortChannelsByOrder(channels, []);
    expect(result.map((c) => c.name)).toEqual(["A", "B", "C"]);
  });

  it("sorts by order when order is provided", () => {
    const channels = [
      { roomId: "a", name: "First" },
      { roomId: "b", name: "Second" },
      { roomId: "c", name: "Third" },
    ];
    const result = sortChannelsByOrder(channels, ["c", "a", "b"]);
    expect(result.map((c) => c.roomId)).toEqual(["c", "a", "b"]);
  });

  it("puts channels not in order at the end, sorted by name", () => {
    const channels = [
      { roomId: "x", name: "X" },
      { roomId: "a", name: "A" },
      { roomId: "z", name: "Z" },
    ];
    const result = sortChannelsByOrder(channels, ["a"]);
    expect(result.map((c) => c.roomId)).toEqual(["a", "x", "z"]);
  });
});

describe("channelOrderStore", () => {
  beforeEach(() => {
    useChannelOrderStore.setState({ orderBySpace: {} });
  });

  it("getOrder returns empty array for unknown space", () => {
    expect(useChannelOrderStore.getState().getOrder("!space:matrix.org", "text")).toEqual([]);
    expect(useChannelOrderStore.getState().getOrder("!space:matrix.org", "voice")).toEqual([]);
  });

  it("setOrder and getOrder round-trip", () => {
    const spaceId = "!space:matrix.org";
    useChannelOrderStore.getState().setOrder(spaceId, "text", ["!r1:matrix.org", "!r2:matrix.org"]);
    expect(useChannelOrderStore.getState().getOrder(spaceId, "text")).toEqual([
      "!r1:matrix.org",
      "!r2:matrix.org",
    ]);
    expect(useChannelOrderStore.getState().getOrder(spaceId, "voice")).toEqual([]);
  });

  it("reorderChannel moves channel to insert index", () => {
    const spaceId = "!space:matrix.org";
    useChannelOrderStore.getState().setOrder(spaceId, "text", ["a", "b", "c"]);

    useChannelOrderStore.getState().reorderChannel(spaceId, "text", "c", 0);
    expect(useChannelOrderStore.getState().getOrder(spaceId, "text")).toEqual(["c", "a", "b"]);
  });

  it("reorderChannel with empty order uses currentOrder fallback", () => {
    const spaceId = "!space:matrix.org";
    useChannelOrderStore.getState().reorderChannel(
      spaceId,
      "text" as ChannelListType,
      "b",
      0,
      ["a", "b", "c"]
    );
    expect(useChannelOrderStore.getState().getOrder(spaceId, "text")).toEqual(["b", "a", "c"]);
  });
});
