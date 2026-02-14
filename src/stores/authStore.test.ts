import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it("starts logged out", () => {
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.userId).toBeNull();
  });

  it("sets credentials and marks logged in", () => {
    useAuthStore.getState().setCredentials({
      accessToken: "token123",
      userId: "@user:matrix.org",
      deviceId: "DEVICE1",
      homeserverUrl: "https://matrix.org",
    });

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.accessToken).toBe("token123");
    expect(state.userId).toBe("@user:matrix.org");
    expect(state.deviceId).toBe("DEVICE1");
    expect(state.homeserverUrl).toBe("https://matrix.org");
  });

  it("sets profile info", () => {
    useAuthStore.getState().setProfile("Test User", "mxc://matrix.org/avatar");
    const state = useAuthStore.getState();
    expect(state.displayName).toBe("Test User");
    expect(state.avatarUrl).toBe("mxc://matrix.org/avatar");
  });

  it("clears everything on logout", () => {
    useAuthStore.getState().setCredentials({
      accessToken: "token123",
      userId: "@user:matrix.org",
      deviceId: "DEVICE1",
      homeserverUrl: "https://matrix.org",
    });
    useAuthStore.getState().setProfile("Test", null);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.userId).toBeNull();
    expect(state.deviceId).toBeNull();
    expect(state.homeserverUrl).toBeNull();
    expect(state.displayName).toBeNull();
    expect(state.avatarUrl).toBeNull();
  });
});
