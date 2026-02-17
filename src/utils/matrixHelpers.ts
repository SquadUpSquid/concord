import { getMatrixClient } from "@/lib/matrix";

/**
 * Convert an MXC URL to an HTTP thumbnail URL.
 * Uses the SDK's mxcUrlToHttp (with auth) when available, falls back to manual
 * construction with access_token query param for authenticated media support.
 */
export function mxcToHttp(
  mxcUrl: string | null | undefined,
  homeserverUrl: string,
  width = 96,
  height = 96
): string | null {
  if (!mxcUrl?.startsWith("mxc://")) return null;

  // Prefer SDK method — it handles authenticated media endpoints correctly
  const client = getMatrixClient();
  if (client) {
    const httpUrl = client.mxcUrlToHttp(mxcUrl, width, height, "crop", false, false, true);
    if (httpUrl) return httpUrl;
  }

  // Fallback: manual construction with access_token for authenticated media
  const parts = mxcUrl.slice(6).split("/");
  if (parts.length < 2) return null;
  const [serverName, mediaId] = parts;
  const hs = homeserverUrl.replace(/\/$/, "");

  // Try authenticated endpoint first, with access_token in query for <img> tags
  const accessToken = client?.getAccessToken();
  const authParam = accessToken ? `&access_token=${encodeURIComponent(accessToken)}` : "";

  return `${hs}/_matrix/client/v1/media/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=crop${authParam}`;
}

/**
 * Convert an MXC URL to a full-size download URL.
 * Uses authenticated endpoint when possible.
 */
export function mxcToFullUrl(
  mxcUrl: string | null | undefined,
  homeserverUrl: string
): string | null {
  if (!mxcUrl?.startsWith("mxc://")) return null;

  // Prefer SDK method with auth
  const client = getMatrixClient();
  if (client) {
    const httpUrl = client.mxcUrlToHttp(mxcUrl, undefined, undefined, undefined, true, false, true);
    if (httpUrl) return httpUrl;
  }

  // Fallback: manual construction
  const parts = mxcUrl.slice(6).split("/");
  if (parts.length < 2) return null;
  const [serverName, mediaId] = parts;
  const hs = homeserverUrl.replace(/\/$/, "");

  const accessToken = client?.getAccessToken();
  const authParam = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : "";

  return `${hs}/_matrix/client/v1/media/download/${serverName}/${mediaId}${authParam}`;
}
