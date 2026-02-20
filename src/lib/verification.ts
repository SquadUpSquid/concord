import type { MatrixClient } from "matrix-js-sdk";
import { useVerificationStore } from "@/stores/verificationStore";

/** CryptoEvent.VerificationRequestReceived - use string so we don't depend on crypto-api export */
const VERIFICATION_REQUEST_RECEIVED = "crypto.verificationRequestReceived";

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
): Promise<import("matrix-js-sdk/lib/crypto-api/verification").VerificationRequest | null> {
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

/** Stored handler reference so we can remove it on cleanup. */
let _verificationHandler: ((r: unknown) => void) | null = null;

/**
 * Subscribe to crypto verification events and push incoming requests into the store.
 * Call once after the client is ready (e.g. from registerEventHandlers or matrix init).
 * Returns a cleanup function that removes the listener.
 */
export function subscribeVerificationEvents(client: MatrixClient): () => void {
  const crypto = client.getCrypto();
  if (!crypto) return () => {};

  // Remove previous listener if any (e.g. same client re-registered)
  if (_verificationHandler) {
    (client as { off(event: string, fn: (r: unknown) => void): void }).off(
      VERIFICATION_REQUEST_RECEIVED,
      _verificationHandler
    );
  }

  const handleVerificationRequestReceived = (
    request: import("matrix-js-sdk/lib/crypto-api/verification").VerificationRequest
  ) => {
    useVerificationStore.getState().addIncomingRequest(request);
  };

  _verificationHandler = handleVerificationRequestReceived as (r: unknown) => void;

  (client as { on(event: string, fn: (r: unknown) => void): void }).on(
    VERIFICATION_REQUEST_RECEIVED,
    _verificationHandler
  );

  return () => {
    if (_verificationHandler) {
      (client as { off(event: string, fn: (r: unknown) => void): void }).off(
        VERIFICATION_REQUEST_RECEIVED,
        _verificationHandler
      );
      _verificationHandler = null;
    }
  };
}
