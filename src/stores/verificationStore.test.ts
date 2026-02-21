import { describe, it, expect, beforeEach } from "vitest";
import { useVerificationStore } from "./verificationStore";
import type { VerificationRequest } from "matrix-js-sdk/lib/crypto-api/verification";

describe("verificationStore", () => {
  beforeEach(() => {
    useVerificationStore.setState({
      deviceVerified: null,
      activeRequest: null,
      incomingRequests: [],
    });
  });

  it("starts with deviceVerified null and no requests", () => {
    const state = useVerificationStore.getState();
    expect(state.deviceVerified).toBeNull();
    expect(state.activeRequest).toBeNull();
    expect(state.incomingRequests).toEqual([]);
  });

  it("setDeviceVerified sets verified to true", () => {
    useVerificationStore.getState().setDeviceVerified(true);
    expect(useVerificationStore.getState().deviceVerified).toBe(true);
  });

  it("setDeviceVerified sets verified to false", () => {
    useVerificationStore.getState().setDeviceVerified(false);
    expect(useVerificationStore.getState().deviceVerified).toBe(false);
  });

  it("setDeviceVerified resets verified to null", () => {
    useVerificationStore.getState().setDeviceVerified(true);
    useVerificationStore.getState().setDeviceVerified(null);
    expect(useVerificationStore.getState().deviceVerified).toBeNull();
  });

  it("setActiveRequest stores a request", () => {
    const mockRequest = {} as VerificationRequest;
    useVerificationStore.getState().setActiveRequest(mockRequest);
    expect(useVerificationStore.getState().activeRequest).toBe(mockRequest);
  });

  it("setActiveRequest clears active request when passed null", () => {
    const mockRequest = {} as VerificationRequest;
    useVerificationStore.getState().setActiveRequest(mockRequest);
    useVerificationStore.getState().setActiveRequest(null);
    expect(useVerificationStore.getState().activeRequest).toBeNull();
  });

  it("addIncomingRequest adds a request", () => {
    const mockRequest = {} as VerificationRequest;
    useVerificationStore.getState().addIncomingRequest(mockRequest);
    expect(useVerificationStore.getState().incomingRequests).toHaveLength(1);
    expect(useVerificationStore.getState().incomingRequests[0]).toBe(mockRequest);
  });

  it("addIncomingRequest does not add duplicates", () => {
    const mockRequest = {} as VerificationRequest;
    useVerificationStore.getState().addIncomingRequest(mockRequest);
    useVerificationStore.getState().addIncomingRequest(mockRequest);
    expect(useVerificationStore.getState().incomingRequests).toHaveLength(1);
  });

  it("addIncomingRequest adds multiple distinct requests", () => {
    const req1 = { id: "1" } as unknown as VerificationRequest;
    const req2 = { id: "2" } as unknown as VerificationRequest;
    useVerificationStore.getState().addIncomingRequest(req1);
    useVerificationStore.getState().addIncomingRequest(req2);
    expect(useVerificationStore.getState().incomingRequests).toHaveLength(2);
  });

  it("removeIncomingRequest removes a specific request", () => {
    const req1 = { id: "1" } as unknown as VerificationRequest;
    const req2 = { id: "2" } as unknown as VerificationRequest;
    useVerificationStore.getState().addIncomingRequest(req1);
    useVerificationStore.getState().addIncomingRequest(req2);
    useVerificationStore.getState().removeIncomingRequest(req1);
    const { incomingRequests } = useVerificationStore.getState();
    expect(incomingRequests).toHaveLength(1);
    expect(incomingRequests[0]).toBe(req2);
  });

  it("removeIncomingRequest is a no-op if request is not in the list", () => {
    const req1 = { id: "1" } as unknown as VerificationRequest;
    const req2 = { id: "2" } as unknown as VerificationRequest;
    useVerificationStore.getState().addIncomingRequest(req1);
    useVerificationStore.getState().removeIncomingRequest(req2);
    expect(useVerificationStore.getState().incomingRequests).toHaveLength(1);
  });

  it("clearIncoming removes all incoming requests", () => {
    const req1 = { id: "1" } as unknown as VerificationRequest;
    const req2 = { id: "2" } as unknown as VerificationRequest;
    useVerificationStore.getState().addIncomingRequest(req1);
    useVerificationStore.getState().addIncomingRequest(req2);
    useVerificationStore.getState().clearIncoming();
    expect(useVerificationStore.getState().incomingRequests).toEqual([]);
  });
});
