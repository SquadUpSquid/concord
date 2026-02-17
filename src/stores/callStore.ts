import { create } from "zustand";
import {
  GroupCall,
  GroupCallEvent,
  GroupCallIntent,
  GroupCallState,
  GroupCallType,
} from "matrix-js-sdk";
import { CallFeed, CallFeedEvent } from "matrix-js-sdk/lib/webrtc/callFeed";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";

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
  isScreenSharing: boolean;
  participants: Map<string, CallParticipant>;
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

export function getActiveGroupCall(): GroupCall | null {
  return activeGroupCall;
}

export function getFeedStream(feedId: string): MediaStream | null {
  return feedStreamMap.get(feedId) ?? null;
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

  groupCall.on(GroupCallEvent.ScreenshareFeedsChanged, (feeds: CallFeed[]) => {
    for (const feed of feeds) {
      const feedId = `screenshare:${feed.userId}:${feed.deviceId ?? "default"}`;
      feedStreamMap.set(feedId, feed.stream);
    }
    // Trigger re-render
    set({ participants: new Map(get().participants) });
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
  groupCall.removeAllListeners(GroupCallEvent.ScreenshareFeedsChanged);
  groupCall.removeAllListeners(GroupCallEvent.Error);
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
  isScreenSharing: false,
  participants: new Map<string, CallParticipant>(),
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
      // Wait for room state to be ready
      if (!client.groupCallEventHandler) {
        throw new Error("Group call support not initialized. Please restart the app.");
      }
      await client.groupCallEventHandler.waitUntilRoomReadyForGroupCalls(roomId);

      // Try to get an existing group call first (created by another participant)
      let groupCall = client.getGroupCallForRoom(roomId);

      // No existing call — try to create one; if we lack permissions, wait for
      // the room state to sync in case another participant creates it
      if (!groupCall) {
        try {
          groupCall = await client.createGroupCall(
            roomId,
            GroupCallType.Video,
            false, // isPtt
            GroupCallIntent.Room,
          );
        } catch (createErr) {
          console.warn("Could not create group call, checking for existing:", createErr);
          // Wait a moment for room state sync then check again
          await new Promise((r) => setTimeout(r, 2000));
          groupCall = client.getGroupCallForRoom(roomId);
          if (!groupCall) {
            throw createErr;
          }
        }
      }

      activeGroupCall = groupCall;
      attachGroupCallListeners(groupCall, set, get);

      // Enter the call (requests mic, starts WebRTC connections)
      await groupCall.enter();

      // Voice-first: mute video by default
      await groupCall.setLocalVideoMuted(true);

      set({ connectionState: "connected", isMicMuted: false, isVideoMuted: true, error: null });
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
    if (activeGroupCall) {
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
    if (!activeGroupCall) return;
    const newMuted = !get().isMicMuted;
    const success = await activeGroupCall.setMicrophoneMuted(newMuted);
    if (success) set({ isMicMuted: newMuted });
  },

  toggleVideo: async () => {
    if (!activeGroupCall) return;
    const newMuted = !get().isVideoMuted;
    const success = await activeGroupCall.setLocalVideoMuted(newMuted);
    if (success) set({ isVideoMuted: newMuted });
  },

  toggleDeafen: () => {
    const newDeafened = !get().isDeafened;
    set({ isDeafened: newDeafened });
    // Discord behavior: mute mic when deafening
    if (newDeafened && activeGroupCall) {
      activeGroupCall.setMicrophoneMuted(true);
      set({ isMicMuted: true });
    }
  },

  toggleScreenShare: async () => {
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
