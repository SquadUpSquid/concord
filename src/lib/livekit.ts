import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  Participant,
  DisconnectReason,
} from "livekit-client";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { MatrixClient } from "matrix-js-sdk";
import { useCallStore, CallParticipant } from "@/stores/callStore";
import { mxcToHttp } from "@/utils/matrixHelpers";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let activeLkRoom: Room | null = null;
let membershipRenewalTimer: ReturnType<typeof setInterval> | null = null;
let activeRoomId: string | null = null;

/** MediaStream map shared with callStore's getFeedStream */
const lkStreamMap = new Map<string, MediaStream>();
const LK_DEBUG_MEDIA = true;

export function getActiveLkRoom(): Room | null {
  return activeLkRoom;
}

export function getLkFeedStream(feedId: string): MediaStream | null {
  return lkStreamMap.get(feedId) ?? null;
}

export function isLivekitActive(): boolean {
  return activeLkRoom !== null;
}

function logLkMedia(...args: unknown[]) {
  if (!LK_DEBUG_MEDIA) return;
  console.log("[livekit-media]", ...args);
}

// ---------------------------------------------------------------------------
// LiveKit focus detection
// ---------------------------------------------------------------------------

export interface LivekitFocus {
  livekitServiceUrl: string;
  livekitAlias: string;
}

/** Cached well-known LiveKit focus so we only fetch once per session. */
let cachedWellKnownFocus: LivekitFocus | null | undefined = undefined;

/**
 * Fetch the homeserver's .well-known to discover LiveKit SFU configuration.
 * Caches the result for the session.
 */
async function fetchWellKnownLivekitFocus(
  client: MatrixClient,
  roomId: string,
): Promise<LivekitFocus | null> {
  if (cachedWellKnownFocus !== undefined) {
    return cachedWellKnownFocus
      ? { ...cachedWellKnownFocus, livekitAlias: roomId }
      : null;
  }

  try {
    const baseUrl = client.getHomeserverUrl().replace(/\/+$/, "");
    // Try the well-known endpoint for RTC foci
    const wkRes = await tauriFetch(
      `${baseUrl}/.well-known/matrix/client`,
      { method: "GET" },
    ).catch(() => null);

    if (wkRes?.ok) {
      const wk = await wkRes.json();
      const foci: any[] =
        wk?.["org.matrix.msc4143.rtc_foci"] ??
        wk?.["org.matrix.msc4143.rtc.foci"] ??
        [];
      for (const f of foci) {
        if (f?.type === "livekit" && typeof f.livekit_service_url === "string") {
          cachedWellKnownFocus = {
            livekitServiceUrl: f.livekit_service_url,
            livekitAlias: roomId,
          };
          return cachedWellKnownFocus;
        }
      }
    }
  } catch (err) {
    console.warn("[livekit] Failed to fetch well-known LiveKit focus:", err);
  }

  cachedWellKnownFocus = null;
  return null;
}

/**
 * Inspect a room's call-member state events to find a LiveKit focus.
 * Returns null if the room doesn't use LiveKit.
 */
export function getLivekitFocus(
  client: MatrixClient,
  roomId: string,
): LivekitFocus | null {
  const room = client.getRoom(roomId);
  if (!room) return null;

  // Check call member state events first
  const eventTypes = [
    "org.matrix.msc3401.call.member",
    "m.call.member",
  ];
  for (const type of eventTypes) {
    for (const ev of room.currentState.getStateEvents(type)) {
      const content = ev.getContent();
      const foci: any[] = content?.foci_preferred ?? [];
      for (const f of foci) {
        if (f?.type === "livekit" && typeof f.livekit_service_url === "string") {
          return {
            livekitServiceUrl: f.livekit_service_url,
            livekitAlias: f.livekit_alias ?? roomId,
          };
        }
      }
    }
  }

  // Check cached well-known (synchronous — only returns if already fetched)
  if (cachedWellKnownFocus) {
    return { ...cachedWellKnownFocus, livekitAlias: roomId };
  }

  return null;
}

/**
 * Async version that also checks the homeserver well-known if state events
 * don't have LiveKit focus info. This ensures the first user joining an empty
 * room can discover LiveKit without existing state events.
 */
export async function getLivekitFocusAsync(
  client: MatrixClient,
  roomId: string,
): Promise<LivekitFocus | null> {
  // Try synchronous check first (state events + cache)
  const syncResult = getLivekitFocus(client, roomId);
  if (syncResult) return syncResult;

  // Fall back to well-known discovery
  return fetchWellKnownLivekitFocus(client, roomId);
}

// ---------------------------------------------------------------------------
// JWT token exchange
// ---------------------------------------------------------------------------

interface SfuTokenResponse {
  url: string;
  jwt: string;
}

export async function fetchLivekitToken(
  client: MatrixClient,
  livekitServiceUrl: string,
  roomId: string,
): Promise<SfuTokenResponse> {
  const openIdToken = await client.getOpenIdToken();

  const deviceId = client.getDeviceId() ?? "unknown";

  const body = {
    room: roomId,
    openid_token: {
      access_token: openIdToken.access_token,
      token_type: openIdToken.token_type ?? "Bearer",
      matrix_server_name: openIdToken.matrix_server_name,
      expires_in: openIdToken.expires_in,
    },
    device_id: deviceId,
  };

  // The livekit_service_url from state events is the base URL (e.g.
  // https://host/livekit/jwt). The legacy endpoint is at /sfu/get under that.
  const base = livekitServiceUrl.replace(/\/+$/, "");
  const sfuUrl = `${base}/sfu/get`;

  const res = await tauriFetch(sfuUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LiveKit JWT request failed (${res.status}): ${text}`);
  }

  return (await res.json()) as SfuTokenResponse;
}

// ---------------------------------------------------------------------------
// MatrixRTC state event management
// ---------------------------------------------------------------------------

function getCallMemberStateKey(client: MatrixClient): string {
  const userId = client.getUserId() ?? "";
  const deviceId = client.getDeviceId() ?? "unknown";
  return `_${userId}_${deviceId}_m.call`;
}

export async function writeCallMemberEvent(
  client: MatrixClient,
  roomId: string,
  focus: LivekitFocus | null,
  joining: boolean,
): Promise<void> {
  const stateKey = getCallMemberStateKey(client);
  const eventType = "org.matrix.msc3401.call.member";

  if (!joining) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.sendStateEvent(roomId, eventType as any, {}, stateKey);
    return;
  }

  const content = {
    application: "m.call",
    call_id: "",
    scope: "m.room",
    device_id: client.getDeviceId() ?? "unknown",
    expires: 7200000,
    created_ts: Date.now(),
    focus_active: {
      type: "livekit",
      focus_selection: "oldest_membership",
    },
    foci_preferred: focus
      ? [
          {
            type: "livekit",
            livekit_service_url: focus.livekitServiceUrl,
            livekit_alias: focus.livekitAlias,
          },
        ]
      : [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.sendStateEvent(roomId, eventType as any, content, stateKey);
}

function startMembershipRenewal(client: MatrixClient, roomId: string, focus: LivekitFocus | null) {
  stopMembershipRenewal();
  membershipRenewalTimer = setInterval(
    () => {
      writeCallMemberEvent(client, roomId, focus, true).catch((err) =>
        console.warn("[livekit] Failed to renew membership:", err),
      );
    },
    30 * 60 * 1000,
  );
}

function stopMembershipRenewal() {
  if (membershipRenewalTimer) {
    clearInterval(membershipRenewalTimer);
    membershipRenewalTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Participant mapping helpers
// ---------------------------------------------------------------------------

/** Extract the Matrix userId from a LiveKit identity (userId:deviceId → userId). */
function extractUserId(identity: string): string {
  // LiveKit identity is "userId:deviceId" (e.g. "@user:server.com:DEVICEID").
  // Matrix userIds contain exactly one colon (@localpart:server), so split
  // on the second colon to strip the device suffix.
  const firstColon = identity.indexOf(":");
  if (firstColon === -1) return identity;
  const secondColon = identity.indexOf(":", firstColon + 1);
  return secondColon === -1 ? identity : identity.slice(0, secondColon);
}

function participantToCallParticipant(
  p: Participant,
  matrixClient: MatrixClient,
  roomId: string,
): CallParticipant {
  const identity = p.identity;
  const userId = extractUserId(identity);
  const room = matrixClient.getRoom(roomId);
  const member = room?.getMember(userId) ?? null;
  const homeserverUrl = matrixClient.getHomeserverUrl();

  return {
    userId,
    displayName: member?.name ?? p.name ?? userId,
    avatarUrl: member ? mxcToHttp(member.getMxcAvatarUrl(), homeserverUrl) : null,
    mxcAvatarUrl: member?.getMxcAvatarUrl() ?? null,
    isSpeaking: p.isSpeaking,
    isAudioMuted: !p.isMicrophoneEnabled,
    isVideoMuted: !p.isCameraEnabled,
    feedId: `lk:${identity}`,
  };
}

function rebuildLkParticipants(
  lkRoom: Room,
  matrixClient: MatrixClient,
  roomId: string,
): Map<string, CallParticipant> {
  const map = new Map<string, CallParticipant>();

  // Local participant
  const local = lkRoom.localParticipant;
  const localCp = participantToCallParticipant(local, matrixClient, roomId);
  map.set(localCp.feedId!, localCp);

  // Remote participants
  for (const [, rp] of lkRoom.remoteParticipants) {
    const cp = participantToCallParticipant(rp, matrixClient, roomId);
    map.set(cp.feedId!, cp);
  }

  return map;
}

function syncStreamsFromRoom(lkRoom: Room) {
  lkStreamMap.clear();

  const addPublicationTracks = (feedId: string, pub: { source: Track.Source; track?: { mediaStream?: MediaStream } | null }) => {
    const mediaStream = pub.track?.mediaStream;
    if (!mediaStream) return;

    if (pub.source === Track.Source.ScreenShare) {
      // Build a fresh stream to avoid reusing/mutating SDK-owned streams across re-subscribes.
      const stream = new MediaStream();
      for (const t of mediaStream.getTracks()) {
        if (!stream.getTracks().some((existing) => existing.id === t.id)) {
          stream.addTrack(t);
        }
      }
      lkStreamMap.set(`screenshare:${feedId}`, stream);
      return;
    }

    let stream = lkStreamMap.get(feedId);
    if (!stream) {
      stream = new MediaStream();
      lkStreamMap.set(feedId, stream);
    }

    for (const t of mediaStream.getTracks()) {
      if (t.readyState === "ended") continue;
      // Main participant feed should expose at most one audio + one video track.
      // If a participant rejoins/renegotiates, prefer the latest track for that kind.
      const existingSameKind = stream.getTracks().find((existing) => existing.kind === t.kind);
      if (existingSameKind && existingSameKind.id !== t.id) {
        stream.removeTrack(existingSameKind);
        logLkMedia("replaced track", { feedId, kind: t.kind, oldTrackId: existingSameKind.id, newTrackId: t.id });
      }
      if (!stream.getTracks().some((existing) => existing.id === t.id)) {
        stream.addTrack(t);
        logLkMedia("added track", { feedId, kind: t.kind, trackId: t.id });
      }
    }
  };

  const localId = `lk:${lkRoom.localParticipant.identity}`;
  for (const pub of lkRoom.localParticipant.trackPublications.values()) {
    addPublicationTracks(localId, pub);
  }

  for (const [, rp] of lkRoom.remoteParticipants) {
    const feedId = `lk:${rp.identity}`;
    for (const pub of rp.trackPublications.values()) {
      addPublicationTracks(feedId, pub);
    }
  }

  if (LK_DEBUG_MEDIA) {
    for (const [feedId, stream] of lkStreamMap) {
      logLkMedia("feed snapshot", {
        feedId,
        tracks: stream.getTracks().map((t) => ({ id: t.id, kind: t.kind, readyState: t.readyState })),
      });
    }
  }
}

function rebuildScreenshareFeeds(
  lkRoom: Room,
  matrixClient: MatrixClient,
  roomId: string,
): { feedId: string; userId: string; displayName: string }[] {
  const feeds: { feedId: string; userId: string; displayName: string }[] = [];

  const checkParticipant = (p: Participant) => {
    for (const pub of p.trackPublications.values()) {
      if (pub.source === Track.Source.ScreenShare && pub.track) {
        const userId = extractUserId(p.identity);
        const room = matrixClient.getRoom(roomId);
        const member = room?.getMember(userId);
        feeds.push({
          feedId: `screenshare:lk:${p.identity}`,
          userId,
          displayName: member?.name ?? p.name ?? userId,
        });
      }
    }
  };

  checkParticipant(lkRoom.localParticipant);
  for (const [, rp] of lkRoom.remoteParticipants) {
    checkParticipant(rp);
  }

  return feeds;
}

function removeParticipantMedia(identity: string) {
  lkStreamMap.delete(`lk:${identity}`);
  lkStreamMap.delete(`screenshare:lk:${identity}`);
}

function removeStaleFeedsForUser(currentIdentity: string) {
  const currentUserId = extractUserId(currentIdentity);
  for (const key of Array.from(lkStreamMap.keys())) {
    if (!key.startsWith("lk:") && !key.startsWith("screenshare:lk:")) continue;
    const identity = key.replace(/^screenshare:/, "").slice(3); // strip optional screenshare: + "lk:"
    if (identity === currentIdentity) continue;
    if (extractUserId(identity) === currentUserId) {
      lkStreamMap.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

export function checkWebRTCSupport(): string | null {
  if (typeof RTCPeerConnection === "undefined") {
    return (
      "WebRTC is not available. Ubuntu/Debian ship WebKitGTK without WebRTC support. " +
      "Voice calls work on Windows and macOS. On Linux, a custom WebKitGTK build with " +
      "-DENABLE_WEB_RTC=ON is required."
    );
  }
  if (typeof navigator.mediaDevices === "undefined") {
    return "Media device APIs are not available. WebRTC calls require a secure context.";
  }
  return null;
}

export async function joinLivekitCall(
  matrixClient: MatrixClient,
  roomId: string,
  url: string,
  jwt: string,
  focus: LivekitFocus,
): Promise<void> {
  const webrtcErr = checkWebRTCSupport();
  if (webrtcErr) throw new Error(webrtcErr);

  // Defensive cleanup in case a previous room is still tearing down.
  if (activeLkRoom) {
    try {
      activeLkRoom.removeAllListeners();
      activeLkRoom.disconnect();
    } catch (err) {
      console.warn("[livekit] Failed to disconnect previous room before join:", err);
    }
    activeLkRoom = null;
    lkStreamMap.clear();
  }

  const lkRoom = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  const store = useCallStore.getState();

  // Attach event listeners before connecting
  lkRoom.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      logLkMedia("TrackSubscribed", {
        participant: participant.identity,
        source: pub.source,
        pubTrackSid: pub.trackSid,
        kind: track.kind,
        mediaTracks: track.mediaStream?.getTracks().map((t) => ({ id: t.id, kind: t.kind, readyState: t.readyState })),
      });
      syncStreamsFromRoom(lkRoom);
      const participants = rebuildLkParticipants(lkRoom, matrixClient, roomId);
      const screenshareFeeds = rebuildScreenshareFeeds(lkRoom, matrixClient, roomId);
      useCallStore.setState({ participants, screenshareFeeds });
    },
  );

  lkRoom.on(
    RoomEvent.TrackUnsubscribed,
    (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      logLkMedia("TrackUnsubscribed", {
        participant: participant.identity,
        source: pub.source,
        pubTrackSid: pub.trackSid,
        kind: track.kind,
        mediaTracks: track.mediaStream?.getTracks().map((t) => ({ id: t.id, kind: t.kind, readyState: t.readyState })),
      });
      track.detach();
      syncStreamsFromRoom(lkRoom);
      const participants = rebuildLkParticipants(lkRoom, matrixClient, roomId);
      const screenshareFeeds = rebuildScreenshareFeeds(lkRoom, matrixClient, roomId);
      useCallStore.setState({ participants, screenshareFeeds });
    },
  );

  lkRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
    logLkMedia("ParticipantConnected", { participant: participant.identity });
    // If the same Matrix user reconnects with a new LiveKit identity, purge any
    // stale feed streams so they rejoin with a clean media state.
    for (const [, rp] of lkRoom.remoteParticipants) {
      removeStaleFeedsForUser(rp.identity);
    }
    syncStreamsFromRoom(lkRoom);
    const participants = rebuildLkParticipants(lkRoom, matrixClient, roomId);
    const screenshareFeeds = rebuildScreenshareFeeds(lkRoom, matrixClient, roomId);
    useCallStore.setState({ participants, screenshareFeeds });
  });

  lkRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
    logLkMedia("ParticipantDisconnected", { participant: participant.identity });
    removeParticipantMedia(participant.identity);
    syncStreamsFromRoom(lkRoom);
    const participants = rebuildLkParticipants(lkRoom, matrixClient, roomId);
    const screenshareFeeds = rebuildScreenshareFeeds(lkRoom, matrixClient, roomId);
    useCallStore.setState({ participants, screenshareFeeds });
  });

  lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
    const speakerIds = new Set(speakers.map((s) => s.identity));
    const current = useCallStore.getState().participants;
    const updated = new Map(current);
    for (const [key, p] of updated) {
      const identity = p.feedId?.startsWith("lk:") ? p.feedId.slice(3) : p.userId;
      updated.set(key, { ...p, isSpeaking: speakerIds.has(identity) });
    }
    useCallStore.setState({
      participants: updated,
      activeSpeakerId: speakers[0]?.identity ?? null,
    });
  });

  lkRoom.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
    console.warn("[livekit] Disconnected from room, reason:", reason);
    store.leaveCall();
  });

  lkRoom.on(RoomEvent.LocalTrackPublished, () => {
    syncStreamsFromRoom(lkRoom);
    const participants = rebuildLkParticipants(lkRoom, matrixClient, roomId);
    const screenshareFeeds = rebuildScreenshareFeeds(lkRoom, matrixClient, roomId);
    useCallStore.setState({ participants, screenshareFeeds });
  });

  lkRoom.on(RoomEvent.LocalTrackUnpublished, () => {
    syncStreamsFromRoom(lkRoom);
    const participants = rebuildLkParticipants(lkRoom, matrixClient, roomId);
    const screenshareFeeds = rebuildScreenshareFeeds(lkRoom, matrixClient, roomId);
    useCallStore.setState({ participants, screenshareFeeds });
  });

  // Connect
  await lkRoom.connect(url, jwt);

  activeLkRoom = lkRoom;
  activeRoomId = roomId;

  // Write state event to announce presence
  await writeCallMemberEvent(matrixClient, roomId, focus, true);
  startMembershipRenewal(matrixClient, roomId, focus);

  // Enable microphone (voice-first). This can fail if no devices are available
  // (e.g. WSL2, permission denied) -- connect anyway so the user can hear others.
  let micEnabled = false;
  try {
    await lkRoom.localParticipant.setMicrophoneEnabled(true);
    micEnabled = lkRoom.localParticipant.isMicrophoneEnabled;
  } catch (err) {
    console.warn("[livekit] Could not enable microphone:", err);
  }

  // Build initial participant list and streams
  syncStreamsFromRoom(lkRoom);
  const participants = rebuildLkParticipants(lkRoom, matrixClient, roomId);
  const screenshareFeeds = rebuildScreenshareFeeds(lkRoom, matrixClient, roomId);

  useCallStore.setState({
    connectionState: "connected",
    participants,
    screenshareFeeds,
    isMicMuted: !micEnabled,
    isVideoMuted: !lkRoom.localParticipant.isCameraEnabled,
    isScreenSharing: lkRoom.localParticipant.isScreenShareEnabled,
    error: micEnabled ? null : "No microphone detected. You can hear others but cannot speak.",
  });
}

export async function leaveLivekitCall(matrixClient: MatrixClient): Promise<void> {
  stopMembershipRenewal();

  const roomToClose = activeLkRoom;
  activeLkRoom = null;

  if (roomToClose) {
    try {
      // Prevent intentional disconnect from re-entering store.leaveCall() via RoomEvent.Disconnected.
      roomToClose.removeAllListeners();

      for (const pub of roomToClose.localParticipant.trackPublications.values()) {
        try {
          pub.track?.detach?.();
          pub.track?.stop?.();
        } catch {
          // best effort
        }
      }

      for (const [, rp] of roomToClose.remoteParticipants) {
        for (const pub of rp.trackPublications.values()) {
          try {
            pub.track?.detach?.();
          } catch {
            // best effort
          }
        }
      }

      roomToClose.disconnect();
    } catch (err) {
      console.warn("[livekit] Error while disconnecting room:", err);
    }
  }

  if (activeRoomId) {
    await writeCallMemberEvent(matrixClient, activeRoomId, null, false).catch((err) =>
      console.warn("[livekit] Failed to clear membership on leave:", err),
    );
    activeRoomId = null;
  }

  lkStreamMap.clear();
}

// ---------------------------------------------------------------------------
// Media controls
// ---------------------------------------------------------------------------

export async function toggleLkMic(): Promise<boolean> {
  if (!activeLkRoom) return false;
  try {
    const lp = activeLkRoom.localParticipant;
    const newEnabled = !lp.isMicrophoneEnabled;
    await lp.setMicrophoneEnabled(newEnabled);
    return true;
  } catch (err) {
    console.warn("[livekit] Failed to toggle microphone:", err);
    return false;
  }
}

export async function toggleLkVideo(): Promise<boolean> {
  if (!activeLkRoom) return false;
  try {
    const lp = activeLkRoom.localParticipant;
    const newEnabled = !lp.isCameraEnabled;
    await lp.setCameraEnabled(newEnabled);
    syncStreamsFromRoom(activeLkRoom);
    return true;
  } catch (err) {
    console.warn("[livekit] Failed to toggle camera:", err);
    return false;
  }
}

export async function toggleLkScreenShare(): Promise<boolean> {
  if (!activeLkRoom) return false;
  try {
    const lp = activeLkRoom.localParticipant;
    const newEnabled = !lp.isScreenShareEnabled;
    await lp.setScreenShareEnabled(newEnabled);
    return true;
  } catch (err) {
    console.warn("[livekit] Failed to toggle screen share:", err);
    return false;
  }
}

export async function switchLkDevice(
  kind: "audioinput" | "videoinput" | "audiooutput",
  deviceId: string,
): Promise<void> {
  if (!activeLkRoom) return;
  await activeLkRoom.switchActiveDevice(kind, deviceId);
}
