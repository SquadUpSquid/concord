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

/**
 * Subscribe to crypto verification events and push incoming requests into the store.
 * Call once after the client is ready (e.g. from registerEventHandlers or matrix init).
 */
export function subscribeVerificationEvents(client: MatrixClient): void {
  const crypto = client.getCrypto();
  if (!crypto) return;

  const handleVerificationRequestReceived = (
    request: import("matrix-js-sdk/lib/crypto-api/verification").VerificationRequest
  ) => {
    useVerificationStore.getState().addIncomingRequest(request);
  };

  (client as { on(event: string, fn: (r: unknown) => void): void }).on(
    VERIFICATION_REQUEST_RECEIVED,
    handleVerificationRequestReceived as (r: unknown) => void
  );
}
