import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "./uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      showMemberSidebar: false,
      activeModal: null,
      contextMenu: null,
    });
  });

  it("starts with no active modal", () => {
    expect(useUiStore.getState().activeModal).toBeNull();
  });

  it("opens and closes modals", () => {
    useUiStore.getState().openModal("createRoom");
    expect(useUiStore.getState().activeModal).toBe("createRoom");

    useUiStore.getState().closeModal();
    expect(useUiStore.getState().activeModal).toBeNull();
  });

  it("replaces the active modal when opening a new one", () => {
    useUiStore.getState().openModal("createRoom");
    useUiStore.getState().openModal("leaveRoom");
    expect(useUiStore.getState().activeModal).toBe("leaveRoom");
  });

  it("closes context menu when closing modal", () => {
    useUiStore.getState().openContextMenu("!room1:matrix.org", 100, 200);
    useUiStore.getState().openModal("leaveRoom");
    useUiStore.getState().closeModal();
    expect(useUiStore.getState().contextMenu).toBeNull();
  });

  it("opens and closes context menu", () => {
    useUiStore.getState().openContextMenu("!room1:matrix.org", 100, 200);
    expect(useUiStore.getState().contextMenu).toEqual({
      roomId: "!room1:matrix.org",
      x: 100,
      y: 200,
    });

    useUiStore.getState().closeContextMenu();
    expect(useUiStore.getState().contextMenu).toBeNull();
  });

  it("toggles member sidebar", () => {
    expect(useUiStore.getState().showMemberSidebar).toBe(false);
    useUiStore.getState().toggleMemberSidebar();
    expect(useUiStore.getState().showMemberSidebar).toBe(true);
    useUiStore.getState().toggleMemberSidebar();
    expect(useUiStore.getState().showMemberSidebar).toBe(false);
  });
});
