import { useEffect, useState, useCallback, useRef } from "react";
import type { VerificationRequest, Verifier } from "matrix-js-sdk/lib/crypto-api/verification";
import {
  canAcceptVerificationRequest,
  VerificationPhase,
  VerificationRequestEvent,
  VerifierEvent,
} from "matrix-js-sdk/lib/crypto-api/verification";
import { Modal } from "@/components/common/Modal";
import { useVerificationStore } from "@/stores/verificationStore";
import { getMatrixClient } from "@/lib/matrix";
import { checkCurrentDeviceVerified } from "@/lib/verification";

type SasState = {
  sas: { decimal?: [number, number, number]; emoji?: [string, string][] };
  confirm: () => Promise<void>;
  mismatch: () => void;
  cancel: () => void;
};

function extractSasCallbacks(callbacks: unknown): SasState | null {
  const cb = callbacks as {
    sas?: unknown;
    confirm?: () => Promise<void>;
    mismatch?: () => void;
    cancel?: () => void;
  } | null;
  if (!cb?.sas || !cb.confirm || !cb.mismatch || !cb.cancel) return null;
  return {
    sas: cb.sas as SasState["sas"],
    confirm: cb.confirm.bind(cb),
    mismatch: cb.mismatch.bind(cb),
    cancel: cb.cancel.bind(cb),
  };
}

export function VerificationFlowModal() {
  const activeRequest = useVerificationStore((s) => s.activeRequest);
  const incomingRequests = useVerificationStore((s) => s.incomingRequests);
  const setActiveRequest = useVerificationStore((s) => s.setActiveRequest);
  const removeIncomingRequest = useVerificationStore((s) => s.removeIncomingRequest);

  const [phase, setPhase] = useState<number | null>(null);
  const [sasCallbacks, setSasCallbacks] = useState<SasState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track the current verifier so we can subscribe to it when it appears
  const verifierRef = useRef<Verifier | null>(null);

  // Show modal for active request, or first incoming request (Accept? screen)
  const request: VerificationRequest | null = activeRequest ?? incomingRequests[0] ?? null;
  const isIncoming = request != null && !request.initiatedByMe && request.isSelfVerification;

  const closeAndCleanup = useCallback(() => {
    setActiveRequest(null);
    setSasCallbacks(null);
    setError(null);
    setPhase(null);
    verifierRef.current = null;
    if (request) {
      removeIncomingRequest(request);
    }
    const client = getMatrixClient();
    if (client) {
      checkCurrentDeviceVerified(client).catch(() => {});
    }
  }, [request, setActiveRequest, removeIncomingRequest]);

  // Subscribe to request phase changes and dynamically attach verifier listeners
  useEffect(() => {
    if (!request) return;

    // Sync initial phase
    setPhase(request.phase);
    setSasCallbacks(null);
    setError(null);

    // Helper to subscribe to a verifier's events
    let currentVerifierCleanup: (() => void) | null = null;

    function attachVerifier(verifier: Verifier) {
      // Clean up old verifier listeners if any
      currentVerifierCleanup?.();
      verifierRef.current = verifier;

      // Check if SAS is already available
      const existingSas = verifier.getShowSasCallbacks?.() ?? null;
      if (existingSas) {
        const extracted = extractSasCallbacks(existingSas);
        if (extracted) setSasCallbacks(extracted);
      }

      const onShowSas = (s: unknown) => {
        const extracted = extractSasCallbacks(s);
        if (extracted) setSasCallbacks(extracted);
      };

      const onCancel = () => {
        setError("Verification was cancelled.");
        setSasCallbacks(null);
      };

      verifier.on(VerifierEvent.ShowSas, onShowSas);
      verifier.on(VerifierEvent.Cancel, onCancel);

      currentVerifierCleanup = () => {
        verifier.off(VerifierEvent.ShowSas, onShowSas);
        verifier.off(VerifierEvent.Cancel, onCancel);
      };
    }

    // If a verifier already exists (e.g. reconnecting to in-progress verification), attach now
    if (request.verifier) {
      attachVerifier(request.verifier);
    }

    const onChange = () => {
      const newPhase = request.phase;
      setPhase(newPhase);

      // When the verifier appears for the first time, attach listeners
      const verifier = request.verifier;
      if (verifier && verifier !== verifierRef.current) {
        attachVerifier(verifier);
      }
    };

    request.on(VerificationRequestEvent.Change, onChange);

    return () => {
      request.off(VerificationRequestEvent.Change, onChange);
      currentVerifierCleanup?.();
      verifierRef.current = null;
    };
  }, [request]);

  // Start SAS verification when phase reaches Ready.
  // Only the INITIATOR should call startVerification (not the responder).
  useEffect(() => {
    if (!request) return;
    if (phase !== VerificationPhase.Ready) return;
    if (request.verifier != null) return; // already started

    // Only the side that initiated the request should start verification.
    // The responder just waits — the SDK handles the rest after accept().
    if (!request.initiatedByMe) return;

    let cancelled = false;

    const startSas = async () => {
      try {
        const verifier = await request.startVerification("m.sas.v1");
        if (!cancelled) {
          await verifier.verify();
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Start verification failed:", e);
          setError(e instanceof Error ? e.message : "Verification failed.");
        }
      }
    };
    startSas();

    return () => {
      cancelled = true;
    };
  }, [request, phase]);

  if (!request || phase == null) return null;

  // Incoming request: show Accept / Decline when still in Requested and can accept
  const canAccept = canAcceptVerificationRequest(request);
  if (isIncoming && canAccept && !request.accepting && !request.declining) {
    const otherDeviceId = request.otherDeviceId ?? "another device";
    return (
      <Modal
        title="Verify new login"
        onClose={closeAndCleanup}
      >
        <div className="flex flex-col gap-4">
          <p className="text-text-primary">
            <strong>{otherDeviceId}</strong> wants to verify this session. Accept to continue.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await request.accept();
                  setActiveRequest(request);
                  removeIncomingRequest(request);
                } catch (e) {
                  console.error("Accept failed:", e);
                  setError(e instanceof Error ? e.message : "Failed to accept.");
                }
              }}
              className="rounded bg-accent px-4 py-2 font-medium text-white hover:bg-accent/90"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={async () => {
                await request.cancel().catch(() => {});
                removeIncomingRequest(request);
                closeAndCleanup();
              }}
              className="rounded border border-border-primary bg-bg-secondary px-4 py-2 text-text-primary hover:bg-bg-tertiary"
            >
              Decline
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Cancelled or Done: show result and close
  if (phase === VerificationPhase.Cancelled || phase === VerificationPhase.Done) {
    return (
      <Modal
        title={phase === VerificationPhase.Done ? "Verification complete" : "Verification cancelled"}
        onClose={closeAndCleanup}
      >
        <div className="flex flex-col gap-4">
          <p className="text-text-primary">
            {phase === VerificationPhase.Done
              ? "This session is now verified."
              : "The verification was cancelled."}
          </p>
          <button
            type="button"
            onClick={closeAndCleanup}
            className="rounded bg-accent px-4 py-2 font-medium text-white hover:bg-accent/90"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // SAS step: show emoji or decimal and confirm / mismatch / cancel
  if (sasCallbacks) {
    const { sas, confirm, mismatch, cancel } = sasCallbacks;
    return (
      <Modal title="Confirm verification" onClose={() => { cancel(); closeAndCleanup(); }}>
        <div className="flex flex-col gap-4">
          <p className="text-text-primary">Compare with the other device:</p>
          {sas.emoji && (
            <div className="flex flex-wrap justify-center gap-2">
              {sas.emoji.map(([emoji, name], i) => (
                <span key={i} title={name} className="text-2xl" role="img" aria-label={name}>
                  {emoji}
                </span>
              ))}
            </div>
          )}
          {sas.decimal && !sas.emoji && (
            <p className="text-center font-mono text-xl text-text-primary">
              {sas.decimal.join(" ")}
            </p>
          )}
          {error && <p className="text-sm text-red">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await confirm();
                  setSasCallbacks(null);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed");
                }
              }}
              className="rounded bg-accent px-4 py-2 font-medium text-white hover:bg-accent/90"
            >
              They match
            </button>
            <button
              type="button"
              onClick={() => { mismatch(); setError("SAS did not match."); }}
              className="rounded border border-border-primary bg-bg-secondary px-4 py-2 text-text-primary hover:bg-bg-tertiary"
            >
              They don&apos;t match
            </button>
            <button
              type="button"
              onClick={() => { cancel(); closeAndCleanup(); }}
              className="rounded border border-border-primary bg-bg-secondary px-4 py-2 text-text-muted hover:bg-bg-tertiary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Waiting for other device (Requested or Ready, no SAS yet)
  return (
    <Modal title="Verification" onClose={() => { request.cancel().catch(() => {}); closeAndCleanup(); }}>
      <div className="flex flex-col gap-4">
        <p className="text-text-primary">
          {phase === VerificationPhase.Ready
            ? "Starting verification…"
            : "Waiting for the other device to accept…"}
        </p>
        {error && <p className="text-sm text-red">{error}</p>}
        <button
          type="button"
          onClick={async () => {
            await request.cancel().catch(() => {});
            closeAndCleanup();
          }}
          className="rounded border border-border-primary bg-bg-secondary px-4 py-2 text-text-muted hover:bg-bg-tertiary"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
