import { create } from "zustand";
import {
  ClientEvent,
  SyncState,
} from "matrix-js-sdk";
import { getMatrixClient } from "@/lib/matrix";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  getLivekitFocusAsync,
  fetchLivekitToken,
  joinLivekitCall,
  leaveLivekitCall,
  isLivekitActive,
  toggleLkMic,
  toggleLkVideo,
  toggleLkScreenShare,
  getLkFeedStream,
  getActiveLkRoom,
} from "@/lib/livekit";

// --- Types ---

export interface CallParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  mxcAvatarUrl: string | null;
  isSpeaking: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  feedId: string | null;
}

export type CallConnectionState = "disconnected" | "connecting" | "connected";

interface CallState {
  activeCallRoomId: string | null;
  connectionState: CallConnectionState;
  error: string | null;
  isMicMuted: boolean;
  isVideoMuted: boolean;
  isDeafened: boolean;
  wasMicMutedBeforeDeafen: boolean;
  isScreenSharing: boolean;
  participants: Map<string, CallParticipant>;
  /** Active screenshare feeds for the current call (feedId -> displayName) */
  screenshareFeeds: { feedId: string; userId: string; displayName: string }[];
  activeSpeakerId: string | null;
  participantsByRoom: Map<string, CallParticipant[]>;

  joinCall: (roomId: string) => Promise<void>;
  leaveCall: () => void;
  toggleMic: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleDeafen: () => void;
  toggleScreenShare: () => Promise<void>;
  setParticipants: (participants: Map<string, CallParticipant>) => void;
  setActiveSpeaker: (userId: string | null) => void;
  setConnectionState: (state: CallConnectionState) => void;
  setRoomParticipants: (roomId: string, participants: CallParticipant[]) => void;
  clearError: () => void;
  _reset: () => void;
}

export function getFeedStream(feedId: string): MediaStream | null {
  return getLkFeedStream(feedId) ?? null;
}

// --- Store ---

const initialState = {
  activeCallRoomId: null,
  connectionState: "disconnected" as CallConnectionState,
  error: null as string | null,
  isMicMuted: false,
  isVideoMuted: true,
  isDeafened: false,
  wasMicMutedBeforeDeafen: false,
  isScreenSharing: false,
  participants: new Map<string, CallParticipant>(),
  screenshareFeeds: [] as { feedId: string; userId: string; displayName: string }[],
  activeSpeakerId: null,
  participantsByRoom: new Map<string, CallParticipant[]>(),
};

function toUserFriendlyError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "Microphone permission denied. Please allow microphone access in your system settings and try again.";
    }
    if (err.name === "NotFoundError") {
      return "No microphone found. Please connect a microphone and try again.";
    }
    if (err.name === "NotReadableError" || err.name === "AbortError") {
      return "Could not access microphone. It may be in use by another application.";
    }
  }

  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("WebRTC") || msg.includes("webRTC") || msg.includes("not supported on this browser")) {
    return (
      "WebRTC is not available. Ubuntu/Debian ship WebKitGTK without WebRTC support. " +
      "Voice calls work on Windows and macOS. On Linux, a custom WebKitGTK build " +
      "with -DENABLE_WEB_RTC=ON is required."
    );
  }

  if (msg.includes("power level") || msg.includes("not permitted") || msg.includes("403")) {
    return "You don't have permission to start a call in this room. Ask an admin to grant you permission, or wait for someone else to start the call.";
  }

  if (msg.includes("LiveKit connection failed")) {
    return msg;
  }

  if (msg.includes("PC") || msg.includes("PeerConnection") || msg.includes("peer connection") || msg.includes("ICE")) {
    return `Could not establish a connection to other participants. This may be caused by network restrictions or missing TURN server configuration.\n\n[Debug] ${msg}`;
  }

  if (msg.includes("getUserMedia") || msg.includes("media devices")) {
    return "Could not access media devices. Please check that your microphone is connected and permissions are granted.";
  }

  return `${msg || "Failed to join voice channel. Please try again."}\n\n[Debug] ${msg}`;
}

export const useCallStore = create<CallState>()((set, get) => ({
  ...initialState,

  joinCall: async (roomId: string) => {
    const client = getMatrixClient();
    if (!client) {
      set({ error: "Not connected to Matrix. Please log in again." });
      return;
    }

    // Leave current call if in one
    if (get().activeCallRoomId) {
      get().leaveCall();
    }

    set({ connectionState: "connecting", activeCallRoomId: roomId, error: null });

    try {
      // Wait for initial sync if not done yet
      if (!client.isInitialSyncComplete()) {
        await new Promise<void>((resolve) => {
          const onSync = (state: SyncState) => {
            if (state === SyncState.Prepared || state === SyncState.Syncing) {
              client.off(ClientEvent.Sync, onSync);
              resolve();
            }
          };
          client.on(ClientEvent.Sync, onSync);
        });
      }

      // --- Discover LiveKit server ---
      const lkFocus = await getLivekitFocusAsync(client, roomId);

      if (!lkFocus) {
        throw new Error(
          "Could not find a LiveKit server for this room. Voice calls require a homeserver with LiveKit configured."
        );
      }

      const { url, jwt } = await fetchLivekitToken(client, lkFocus.livekitServiceUrl, roomId);

      try {
        await joinLivekitCall(client, roomId, url, jwt, lkFocus);
      } catch (connectErr) {
        // Re-throw with connection details so we can diagnose
        const detail = connectErr instanceof Error ? connectErr.message : String(connectErr);
        throw new Error(
          `LiveKit connection failed.\nSFU URL: ${lkFocus.livekitServiceUrl}\nWS URL: ${url}\nError: ${detail}`
        );
      }

      const { audioInputDeviceId, videoInputDeviceId } = useSettingsStore.getState();
      const lkRoom = getActiveLkRoom();
      if (lkRoom) {
        if (audioInputDeviceId) {
          await lkRoom.switchActiveDevice("audioinput", audioInputDeviceId).catch(() => {});
        }
        if (videoInputDeviceId) {
          await lkRoom.switchActiveDevice("videoinput", videoInputDeviceId).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Failed to join call:", err);
      set({
        ...initialState,
        activeCallRoomId: roomId,
        error: toUserFriendlyError(err),
      });
    }
  },

  leaveCall: () => {
    if (isLivekitActive()) {
      const client = getMatrixClient();
      if (client) {
        leaveLivekitCall(client).catch((err) =>
          console.warn("Error during LiveKit leave:", err),
        );
      }
    }
    const roomParticipants = get().participantsByRoom;
    set({ ...initialState, participantsByRoom: roomParticipants });
  },

  toggleMic: async () => {
    if (!isLivekitActive()) return;
    const ok = await toggleLkMic();
    if (ok) {
      const lkRoom = getActiveLkRoom();
      set({ isMicMuted: !lkRoom?.localParticipant.isMicrophoneEnabled });
    }
  },

  toggleVideo: async () => {
    if (!isLivekitActive()) return;
    const ok = await toggleLkVideo();
    if (ok) {
      const lkRoom = getActiveLkRoom();
      set({ isVideoMuted: !lkRoom?.localParticipant.isCameraEnabled });
    }
  },

  toggleDeafen: () => {
    const newDeafened = !get().isDeafened;
    if (!isLivekitActive()) {
      set({ isDeafened: newDeafened });
      return;
    }
    if (newDeafened) {
      set({ isDeafened: true, wasMicMutedBeforeDeafen: get().isMicMuted });
      toggleLkMic().then(() => {
        const lkRoom = getActiveLkRoom();
        if (lkRoom?.localParticipant.isMicrophoneEnabled) {
          lkRoom.localParticipant.setMicrophoneEnabled(false).catch(() => {});
        }
        set({ isMicMuted: true });
      });
    } else {
      const restoreMuted = get().wasMicMutedBeforeDeafen;
      set({ isDeafened: false });
      const lkRoom = getActiveLkRoom();
      lkRoom?.localParticipant.setMicrophoneEnabled(!restoreMuted).catch(() => {});
      set({ isMicMuted: restoreMuted });
    }
  },

  toggleScreenShare: async () => {
    if (!isLivekitActive()) return;
    const ok = await toggleLkScreenShare();
    if (ok) {
      const lkRoom = getActiveLkRoom();
      set({ isScreenSharing: lkRoom?.localParticipant.isScreenShareEnabled ?? false });
    }
  },

  setParticipants: (participants) => set({ participants }),
  setActiveSpeaker: (userId) => set({ activeSpeakerId: userId }),
  setConnectionState: (state) => set({ connectionState: state }),

  setRoomParticipants: (roomId, participants) => {
    const map = new Map(get().participantsByRoom);
    if (participants.length === 0) {
      map.delete(roomId);
    } else {
      map.set(roomId, participants);
    }
    set({ participantsByRoom: map });
  },

  clearError: () => set({ error: null }),

  _reset: () => {
    const roomParticipants = get().participantsByRoom;
    set({ ...initialState, participantsByRoom: roomParticipants });
  },
}));
