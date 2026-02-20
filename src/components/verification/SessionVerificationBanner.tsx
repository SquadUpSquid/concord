import { getMatrixClient } from "@/lib/matrix";
import { requestOwnUserVerification } from "@/lib/verification";
import { useVerificationStore } from "@/stores/verificationStore";

/**
 * Banner shown when this session is not verified and no verification is in progress.
 * "Use another device" starts a to-device verification request and opens the flow modal.
 */
export function SessionVerificationBanner() {
  const deviceVerified = useVerificationStore((s) => s.deviceVerified);
  const activeRequest = useVerificationStore((s) => s.activeRequest);

  const showBanner =
    deviceVerified === false &&
    activeRequest === null;

  const handleUseAnotherDevice = () => {
    const client = getMatrixClient();
    if (!client) return;
    requestOwnUserVerification(client);
  };

  if (!showBanner) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-primary bg-bg-secondary px-4 py-3 text-sm">
      <span className="text-text-primary">
        This session is not verified. Verify it to secure your account and messages.
      </span>
      <button
        type="button"
        onClick={handleUseAnotherDevice}
        className="shrink-0 rounded bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent/90"
      >
        Use another device
      </button>
    </div>
  );
}
