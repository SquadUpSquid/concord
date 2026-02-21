import type { MatrixClient } from "matrix-js-sdk";
import { CryptoEvent } from "matrix-js-sdk/lib/crypto-api";
import type { VerificationRequest } from "matrix-js-sdk/lib/crypto-api/verification";
import { useVerificationStore } from "@/stores/verificationStore";

const VERIFICATION_REQUEST_RECEIVED = CryptoEvent.VerificationRequestReceived;

/**
 * Check whether the current device is verified (cross-signed).
 * Updates verificationStore.deviceVerified and returns the result.
 */
export async function checkCurrentDeviceVerified(
  client: MatrixClient
): Promise<boolean> {
  const crypto = client.getCrypto();
  const userId = client.getUserId();
  const deviceId = client.getDeviceId();
  if (!crypto || !userId || !deviceId) {
    useVerificationStore.getState().setDeviceVerified(false);
    return false;
  }
  try {
    const status = await crypto.getDeviceVerificationStatus(userId, deviceId);
    const verified = status?.isVerified() ?? false;
    useVerificationStore.getState().setDeviceVerified(verified);
    return verified;
  } catch {
    useVerificationStore.getState().setDeviceVerified(false);
    return false;
  }
}

/**
 * Request verification from our other devices (e.g. "verify this session" from new device).
 * Returns the VerificationRequest; store it as activeRequest and show the verification flow.
 */
export async function requestOwnUserVerification(
  client: MatrixClient
): Promise<VerificationRequest | null> {
  const crypto = client.getCrypto();
  if (!crypto) return null;
  try {
    const request = await crypto.requestOwnUserVerification();
    useVerificationStore.getState().setActiveRequest(request);
    return request;
  } catch (err) {
    console.error("requestOwnUserVerification failed:", err);
    return null;
  }
}

/** Stored references so we can remove listeners on re-register/cleanup. */
let _verificationHandler: ((r: VerificationRequest) => void) | null = null;
let _verificationClient:
  | Pick<MatrixClient, "on" | "off">
  | null = null;

/**
 * Subscribe to crypto verification events and push incoming requests into the store.
 * Call once after the client is ready (e.g. from registerEventHandlers or matrix init).
 * Returns a cleanup function that removes the listener.
 */
export function subscribeVerificationEvents(client: MatrixClient): () => void {
  const crypto = client.getCrypto();
  if (!crypto) return () => {};

  // Remove previous listeners if any (e.g. client recreated on relogin)
  if (_verificationHandler && _verificationClient) {
    _verificationClient.off(VERIFICATION_REQUEST_RECEIVED, _verificationHandler);
  }

  const handleVerificationRequestReceived = (request: VerificationRequest) => {
    useVerificationStore.getState().addIncomingRequest(request);
  };

  _verificationHandler = handleVerificationRequestReceived;
  _verificationClient = client;

  // Verification request events are emitted on MatrixClient.
  client.on(VERIFICATION_REQUEST_RECEIVED, _verificationHandler);

  return () => {
    if (!_verificationHandler) return;
    client.off(VERIFICATION_REQUEST_RECEIVED, _verificationHandler);
    _verificationHandler = null;
    _verificationClient = null;
  };
}
