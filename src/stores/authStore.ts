import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  isLoggedIn: boolean;
  accessToken: string | null;
  userId: string | null;
  deviceId: string | null;
  homeserverUrl: string | null;
  displayName: string | null;
  avatarUrl: string | null;

  setCredentials: (creds: {
    accessToken: string;
    userId: string;
    deviceId: string;
    homeserverUrl: string;
  }) => void;
  setProfile: (displayName: string, avatarUrl: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      accessToken: null,
      userId: null,
      deviceId: null,
      homeserverUrl: null,
      displayName: null,
      avatarUrl: null,

      setCredentials: (creds) =>
        set({
          isLoggedIn: true,
          ...creds,
        }),

      setProfile: (displayName, avatarUrl) => set({ displayName, avatarUrl }),

      logout: () =>
        set({
          isLoggedIn: false,
          accessToken: null,
          userId: null,
          deviceId: null,
          homeserverUrl: null,
          displayName: null,
          avatarUrl: null,
        }),
    }),
    { name: "concord-auth" }
  )
);
