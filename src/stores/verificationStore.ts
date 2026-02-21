import { create } from "zustand";
import type { VerificationRequest } from "matrix-js-sdk/lib/crypto-api/verification";

interface VerificationState {
  /** True if this device is verified; false if not; null if not yet checked */
  deviceVerified: boolean | null;
  /** The verification request currently being shown in the modal (outgoing or incoming) */
  activeRequest: VerificationRequest | null;
  /** Incoming verification requests not yet accepted/declined */
  incomingRequests: VerificationRequest[];

  setDeviceVerified: (verified: boolean | null) => void;
  setActiveRequest: (request: VerificationRequest | null) => void;
  addIncomingRequest: (request: VerificationRequest) => void;
  removeIncomingRequest: (request: VerificationRequest) => void;
  clearIncoming: () => void;
}

export const useVerificationStore = create<VerificationState>()((set) => ({
  deviceVerified: null,
  activeRequest: null,
  incomingRequests: [],

  setDeviceVerified: (verified) => set({ deviceVerified: verified }),
  setActiveRequest: (request) => set({ activeRequest: request }),
  addIncomingRequest: (request) =>
    set((s) => {
      const requestTxnId = request.transactionId;
      const exists = s.incomingRequests.some((r) =>
        r === request ||
        (!!requestTxnId && r.transactionId === requestTxnId)
      );
      return {
        incomingRequests: exists
          ? s.incomingRequests
          : [...s.incomingRequests, request],
      };
    }),
  removeIncomingRequest: (request) =>
    set((s) => {
      const requestTxnId = request.transactionId;
      return {
        incomingRequests: s.incomingRequests.filter((r) =>
          r !== request &&
          (!requestTxnId || r.transactionId !== requestTxnId)
        ),
      };
    }),
  clearIncoming: () => set({ incomingRequests: [] }),
}));
