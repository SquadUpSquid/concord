import { useEffect, useState, useCallback } from "react";
import type { VerificationRequest, Verifier } from "matrix-js-sdk/lib/crypto-api/verification";
import {
  VerificationRequestEvent,
  VerifierEvent,
} from "matrix-js-sdk/lib/crypto-api/verification";
import { Modal } from "@/components/common/Modal";
import { useVerificationStore } from "@/stores/verificationStore";
import { getMatrixClient } from "@/lib/matrix";
import { checkCurrentDeviceVerified } from "@/lib/verification";

/** VerificationPhase enum values from matrix-js-sdk (crypto-api) */
const VerificationPhase = {
  Unsent: 1,
  Requested: 2,
  Ready: 3,
  Started: 4,
  Cancelled: 5,
  Done: 6,
} as const;

export function VerificationFlowModal() {
  const activeRequest = useVerificationStore((s) => s.activeRequest);
  const incomingRequests = useVerificationStore((s) => s.incomingRequests);
  const setActiveRequest = useVerificationStore((s) => s.setActiveRequest);
  const removeIncomingRequest = useVerificationStore((s) => s.removeIncomingRequest);

  const [, forceUpdate] = useState(0);
  const [sasCallbacks, setSasCallbacks] = useState<{
    sas: { decimal?: [number, number, number]; emoji?: [string, string][] };
    confirm: () => Promise<void>;
    mismatch: () => void;
    cancel: () => void;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Show modal for active request, or first incoming request (Accept? screen)
  const request: VerificationRequest | null = activeRequest ?? incomingRequests[0] ?? null;
  const isIncoming = request != null && !request.initiatedByMe && request.isSelfVerification;

  const closeAndCleanup = useCallback(() => {
    setActiveRequest(null);
    setSasCallbacks(null);
    setError(null);
    if (request) {
      removeIncomingRequest(request);
    }
    const client = getMatrixClient();
    if (client) {
      checkCurrentDeviceVerified(client).catch(() => {});
    }
  }, [request, setActiveRequest, removeIncomingRequest]);

  // Subscribe to request phase changes and verifier events
  useEffect(() => {
    if (!request) return;

    const onChange = () => {
      forceUpdate((n) => n + 1);
      setSasCallbacks(null);
    };

    request.on(VerificationRequestEvent.Change, onChange);

    const verifier: Verifier | undefined = request.verifier;
    let onShowSas: ((s: unknown) => void) | null = null;
    let onCancel: (() => void) | null = null;

    if (verifier) {
      const sas = verifier.getShowSasCallbacks?.() ?? null;
      if (sas) {
        setSasCallbacks({
          sas: sas.sas as { decimal?: [number, number, number]; emoji?: [string, string][] },
          confirm: sas.confirm.bind(sas),
          mismatch: sas.mismatch.bind(sas),
          cancel: sas.cancel.bind(sas),
        });
      }
      onShowSas = (s: unknown) => {
        const cb = (s as { sas: unknown; confirm: () => Promise<void>; mismatch: () => void; cancel: () => void });
        setSasCallbacks({
          sas: cb.sas as { decimal?: [number, number, number]; emoji?: [string, string][] },
          confirm: cb.confirm.bind(cb),
          mismatch: cb.mismatch.bind(cb),
          cancel: cb.cancel.bind(cb),
        });
      };
      onCancel = () => {
        setError("Verification was cancelled.");
        setSasCallbacks(null);
      };
      verifier.on(VerifierEvent.ShowSas, onShowSas);
      verifier.on(VerifierEvent.Cancel, onCancel);
    }

    return () => {
      request.off(VerificationRequestEvent.Change, onChange);
      if (verifier && onShowSas && onCancel) {
        verifier.off(VerifierEvent.ShowSas, onShowSas);
        verifier.off(VerifierEvent.Cancel, onCancel);
      }
    };
  }, [request]);

  // When phase is Ready and we haven't started yet, start SAS verification
  useEffect(() => {
    if (!request || request.phase !== VerificationPhase.Ready) return;
    if (request.verifier != null) return; // already started

    const startSas = async () => {
      try {
        const verifier = await request.startVerification("m.sas.v1");
        await verifier.verify();
      } catch (e) {
        console.error("Start verification failed:", e);
        setError(e instanceof Error ? e.message : "Verification failed.");
      }
    };
    startSas();
  }, [request]);

  if (!request) return null;

  const phase = request.phase;

  // Incoming request: show Accept / Decline when still in Requested and can accept
  const canAccept = phase === VerificationPhase.Requested || phase === VerificationPhase.Unsent;
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
                await request.cancel();
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
            await request.cancel();
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
