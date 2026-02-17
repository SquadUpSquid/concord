import { describe, it, expect } from "vitest";
import { mxcToHttp } from "./matrixHelpers";

describe("mxcToHttp", () => {
  const homeserver = "https://matrix.org";

  it("converts a valid mxc URL to HTTP thumbnail URL", () => {
    const result = mxcToHttp("mxc://matrix.org/abcdef123", homeserver);
    // Without a client, falls back to authenticated endpoint (no token)
    expect(result).toBe(
      "https://matrix.org/_matrix/client/v1/media/thumbnail/matrix.org/abcdef123?width=96&height=96&method=crop"
    );
  });

  it("uses custom dimensions", () => {
    const result = mxcToHttp("mxc://matrix.org/abcdef123", homeserver, 200, 200);
    expect(result).toContain("width=200&height=200");
  });

  it("returns null for null input", () => {
    expect(mxcToHttp(null, homeserver)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(mxcToHttp(undefined, homeserver)).toBeNull();
  });

  it("returns null for non-mxc URLs", () => {
    expect(mxcToHttp("https://example.com/image.png", homeserver)).toBeNull();
  });

  it("returns null for malformed mxc URL", () => {
    expect(mxcToHttp("mxc://", homeserver)).toBeNull();
  });
});
