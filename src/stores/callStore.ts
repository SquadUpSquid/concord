import { create } from "zustand";
import {
  ClientEvent,
  GroupCall,
  GroupCallEvent,
  GroupCallIntent,
  GroupCallState,
  GroupCallType,
  SyncState,
} from "matrix-js-sdk";
import { CallFeed, CallFeedEvent } from "matrix-js-sdk/lib/webrtc/callFeed";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  getLivekitFocus,
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

// --- Module-level refs for live SDK objects (not in Zustand) ---

let activeGroupCall: GroupCall | null = null;
const feedStreamMap = new Map<string, MediaStream>();
const feedListenerCleanups: (() => void)[] = [];
const screenshareFeedCleanups: (() => void)[] = [];

export function getActiveGroupCall(): GroupCall | null {
  return activeGroupCall;
}

export function getFeedStream(feedId: string): MediaStream | null {
  return feedStreamMap.get(feedId) ?? getLkFeedStream(feedId) ?? null;
}

// --- Event listener helpers ---

function cleanupFeedListeners(): void {
  for (const cleanup of feedListenerCleanups) {
    cleanup();
  }
  feedListenerCleanups.length = 0;
}

function attachFeedListeners(
  feeds: CallFeed[],
  set: (partial: Partial<CallState>) => void,
  get: () => CallState,
): void {
  cleanupFeedListeners();

  for (const feed of feeds) {
    const feedId = `${feed.userId}:${feed.deviceId ?? "default"}`;

    const onSpeaking = (speaking: boolean) => {
      const participants = new Map(get().participants);
      const p = participants.get(feedId);
      if (p) {
        participants.set(feedId, { ...p, isSpeaking: speaking });
        set({ participants });
      }
    };

    const onMuteStateChanged = (audioMuted: boolean, videoMuted: boolean) => {
      const participants = new Map(get().participants);
      const p = participants.get(feedId);
      if (p) {
        participants.set(feedId, { ...p, isAudioMuted: audioMuted, isVideoMuted: videoMuted });
        set({ participants });
      }
    };

    const onNewStream = (newStream: MediaStream) => {
      feedStreamMap.set(feedId, newStream);
      // Force re-render by creating a new Map reference
      set({ participants: new Map(get().participants) });
    };

    feed.on(CallFeedEvent.Speaking, onSpeaking);
    feed.on(CallFeedEvent.MuteStateChanged, onMuteStateChanged);
    feed.on(CallFeedEvent.NewStream, onNewStream);

    // Enable volume monitoring for speaking detection
    feed.measureVolumeActivity(true);

    feedListenerCleanups.push(() => {
      feed.off(CallFeedEvent.Speaking, onSpeaking);
      feed.off(CallFeedEvent.MuteStateChanged, onMuteStateChanged);
      feed.off(CallFeedEvent.NewStream, onNewStream);
    });
  }
}

function attachGroupCallListeners(
  groupCall: GroupCall,
  set: (partial: Partial<CallState>) => void,
  get: () => CallState,
): void {
  const client = getMatrixClient();
  const homeserverUrl = client?.getHomeserverUrl() ?? "";

  groupCall.on(GroupCallEvent.UserMediaFeedsChanged, (feeds: CallFeed[]) => {
    const participants = new Map<string, CallParticipant>();
    feedStreamMap.clear();

    for (const feed of feeds) {
      const feedId = `${feed.userId}:${feed.deviceId ?? "default"}`;
      feedStreamMap.set(feedId, feed.stream);

      const member = feed.getMember();
      participants.set(feedId, {
        userId: feed.userId,
        displayName: member?.name ?? feed.userId,
        avatarUrl: member ? mxcToHttp(member.getMxcAvatarUrl(), homeserverUrl) : null,
        isSpeaking: feed.isSpeaking(),
        isAudioMuted: feed.isAudioMuted(),
        isVideoMuted: feed.isVideoMuted(),
        feedId,
      });
    }

    attachFeedListeners(feeds, set, get);
    set({ participants });
  });

  groupCall.on(GroupCallEvent.ActiveSpeakerChanged, (activeSpeaker?: CallFeed) => {
    set({ activeSpeakerId: activeSpeaker?.userId ?? null });
  });

  groupCall.on(GroupCallEvent.LocalMuteStateChanged, (audioMuted: boolean, videoMuted: boolean) => {
    set({ isMicMuted: audioMuted, isVideoMuted: videoMuted });
  });

  groupCall.on(GroupCallEvent.GroupCallStateChanged, (newState: GroupCallState) => {
    if (newState === GroupCallState.Ended) {
      get().leaveCall();
    }
  });

  groupCall.on(GroupCallEvent.LocalScreenshareStateChanged, (isScreensharing: boolean) => {
    set({ isScreenSharing: isScreensharing });
  });

  groupCall.on(GroupCallEvent.ScreenshareFeedsChanged, (feeds: CallFeed[]) => {
    for (const cleanup of screenshareFeedCleanups) cleanup();
    screenshareFeedCleanups.length = 0;
    for (const key of feedStreamMap.keys()) {
      if (key.startsWith("screenshare:")) feedStreamMap.delete(key);
    }
    const list: { feedId: string; userId: string; displayName: string }[] = [];
    for (const feed of feeds) {
      const feedId = `screenshare:${feed.userId}:${feed.deviceId ?? "default"}`;
      feedStreamMap.set(feedId, feed.stream);
      const member = feed.getMember();
      list.push({
        feedId,
        userId: feed.userId,
        displayName: member?.name ?? feed.userId,
      });
      const onNewStream = (newStream: MediaStream) => {
        feedStreamMap.set(feedId, newStream);
        set({ screenshareFeeds: [...get().screenshareFeeds] });
      };
      feed.on(CallFeedEvent.NewStream, onNewStream);
      screenshareFeedCleanups.push(() => feed.off(CallFeedEvent.NewStream, onNewStream));
    }
    set({ screenshareFeeds: list });
  });

  groupCall.on(GroupCallEvent.Error, (error) => {
    console.error("Group call error:", error);
    get().leaveCall();
  });
}

function detachGroupCallListeners(groupCall: GroupCall): void {
  groupCall.removeAllListeners(GroupCallEvent.UserMediaFeedsChanged);
  groupCall.removeAllListeners(GroupCallEvent.ActiveSpeakerChanged);
  groupCall.removeAllListeners(GroupCallEvent.LocalMuteStateChanged);
  groupCall.removeAllListeners(GroupCallEvent.GroupCallStateChanged);
  groupCall.removeAllListeners(GroupCallEvent.LocalScreenshareStateChanged);
  groupCall.removeAllListeners(GroupCallEvent.ScreenshareFeedsChanged);
  groupCall.removeAllListeners(GroupCallEvent.Error);
  for (const cleanup of screenshareFeedCleanups) cleanup();
  screenshareFeedCleanups.length = 0;
  cleanupFeedListeners();
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

  if (msg.includes("power level") || msg.includes("not permitted") || msg.includes("403")) {
    return "You don't have permission to start a call in this room. Ask an admin to grant you permission, or wait for someone else to start the call.";
  }

  return msg || "Failed to join voice channel. Please try again.";
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

      // --- Check if the room uses LiveKit ---
      const lkFocus = getLivekitFocus(client, roomId);

      if (lkFocus) {
        // LiveKit path
        console.log("[livekit] Room uses LiveKit, fetching token from", lkFocus.livekitServiceUrl);
        const { url, jwt } = await fetchLivekitToken(client, lkFocus.livekitServiceUrl, roomId);
        console.log("[livekit] Token received, connecting to", url);

        // Apply preferred devices after connection via LiveKit APIs
        await joinLivekitCall(client, roomId, url, jwt, lkFocus);

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
        return;
      }

      // --- Legacy WebRTC GroupCall path ---
      if (!client.groupCallEventHandler) {
        throw new Error(
          "Voice calls are not supported in this environment. WebRTC may not be available."
        );
      }
      await client.groupCallEventHandler.waitUntilRoomReadyForGroupCalls(roomId);

      let groupCall = client.getGroupCallForRoom(roomId);

      if (!groupCall) {
        const room = client.getRoom(roomId);
        if (room) {
          try {
            client.groupCallEventHandler.waitUntilRoomReadyForGroupCalls(roomId);
            await new Promise((r) => setTimeout(r, 500));
            groupCall = client.getGroupCallForRoom(roomId);
          } catch {
            // Continue to create
          }
        }
      }

      if (!groupCall) {
        try {
          groupCall = await client.createGroupCall(
            roomId,
            GroupCallType.Video,
            false,
            GroupCallIntent.Room,
          );
        } catch (createErr) {
          console.warn("Could not create group call, checking for existing:", createErr);
          for (let i = 0; i < 3; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            groupCall = client.getGroupCallForRoom(roomId);
            if (groupCall) break;
          }
          if (!groupCall) {
            throw createErr;
          }
        }
      }

      activeGroupCall = groupCall;
      attachGroupCallListeners(groupCall, set, get);

      const { audioInputDeviceId, videoInputDeviceId } = useSettingsStore.getState();
      const mediaHandler = client.getMediaHandler?.();
      if (mediaHandler) {
        await (mediaHandler as { setMediaInputs(a?: string, v?: string): Promise<void> })
          .setMediaInputs(
            audioInputDeviceId ?? undefined,
            videoInputDeviceId ?? undefined
          )
          .catch((err) => console.warn("Failed to set media devices:", err));
      }

      await groupCall.enter();
      await groupCall.setLocalVideoMuted(true);

      for (const key of feedStreamMap.keys()) {
        if (key.startsWith("screenshare:")) feedStreamMap.delete(key);
      }
      const list: { feedId: string; userId: string; displayName: string }[] = [];
      for (const feed of groupCall.screenshareFeeds) {
        const feedId = `screenshare:${feed.userId}:${feed.deviceId ?? "default"}`;
        feedStreamMap.set(feedId, feed.stream);
        const member = feed.getMember();
        list.push({
          feedId,
          userId: feed.userId,
          displayName: member?.name ?? feed.userId,
        });
      }
      set({
        connectionState: "connected",
        isMicMuted: false,
        isVideoMuted: true,
        isScreenSharing: groupCall.isScreensharing(),
        screenshareFeeds: list,
        error: null,
      });
    } catch (err) {
      console.error("Failed to join call:", err);
      if (activeGroupCall) {
        detachGroupCallListeners(activeGroupCall);
        activeGroupCall = null;
      }
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
    } else if (activeGroupCall) {
      try {
        activeGroupCall.leave();
      } catch {
        // Ignore errors during leave
      }
      detachGroupCallListeners(activeGroupCall);
      activeGroupCall = null;
    }
    feedStreamMap.clear();
    const roomParticipants = get().participantsByRoom;
    set({ ...initialState, participantsByRoom: roomParticipants });
  },

  toggleMic: async () => {
    if (isLivekitActive()) {
      const ok = await toggleLkMic();
      if (ok) {
        const lkRoom = getActiveLkRoom();
        set({ isMicMuted: !lkRoom?.localParticipant.isMicrophoneEnabled });
      }
      return;
    }
    if (!activeGroupCall) return;
    const newMuted = !get().isMicMuted;
    const success = await activeGroupCall.setMicrophoneMuted(newMuted);
    if (success) set({ isMicMuted: newMuted });
  },

  toggleVideo: async () => {
    if (isLivekitActive()) {
      const ok = await toggleLkVideo();
      if (ok) {
        const lkRoom = getActiveLkRoom();
        set({ isVideoMuted: !lkRoom?.localParticipant.isCameraEnabled });
      }
      return;
    }
    if (!activeGroupCall) return;
    const newMuted = !get().isVideoMuted;
    const success = await activeGroupCall.setLocalVideoMuted(newMuted);
    if (success) set({ isVideoMuted: newMuted });
  },

  toggleDeafen: () => {
    const newDeafened = !get().isDeafened;
    if (isLivekitActive()) {
      if (newDeafened) {
        set({ isDeafened: true, wasMicMutedBeforeDeafen: get().isMicMuted });
        toggleLkMic().then(() => {
          const lkRoom = getActiveLkRoom();
          if (lkRoom?.localParticipant.isMicrophoneEnabled) {
            lkRoom.localParticipant.setMicrophoneEnabled(false);
          }
          set({ isMicMuted: true });
        });
      } else {
        const restoreMuted = get().wasMicMutedBeforeDeafen;
        set({ isDeafened: false });
        const lkRoom = getActiveLkRoom();
        lkRoom?.localParticipant.setMicrophoneEnabled(!restoreMuted);
        set({ isMicMuted: restoreMuted });
      }
      return;
    }
    if (newDeafened && activeGroupCall) {
      set({ isDeafened: true, wasMicMutedBeforeDeafen: get().isMicMuted });
      activeGroupCall.setMicrophoneMuted(true);
      set({ isMicMuted: true });
    } else if (!newDeafened && activeGroupCall) {
      const restoreMuted = get().wasMicMutedBeforeDeafen;
      set({ isDeafened: false });
      activeGroupCall.setMicrophoneMuted(restoreMuted);
      set({ isMicMuted: restoreMuted });
    } else {
      set({ isDeafened: newDeafened });
    }
  },

  toggleScreenShare: async () => {
    if (isLivekitActive()) {
      const ok = await toggleLkScreenShare();
      if (ok) {
        const lkRoom = getActiveLkRoom();
        set({ isScreenSharing: lkRoom?.localParticipant.isScreenShareEnabled ?? false });
      }
      return;
    }
    if (!activeGroupCall) return;
    const newEnabled = !get().isScreenSharing;
    const success = await activeGroupCall.setScreensharingEnabled(newEnabled);
    if (success) set({ isScreenSharing: newEnabled });
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
