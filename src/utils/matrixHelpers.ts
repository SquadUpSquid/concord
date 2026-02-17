export function mxcToHttp(
  mxcUrl: string | null | undefined,
  homeserverUrl: string,
  width = 96,
  height = 96
): string | null {
  if (!mxcUrl?.startsWith("mxc://")) return null;
  const parts = mxcUrl.slice(6).split("/");
  if (parts.length < 2) return null;
  const [serverName, mediaId] = parts;
  const hs = homeserverUrl.replace(/\/$/, "");
  return `${hs}/_matrix/media/v3/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=crop`;
}

export function mxcToFullUrl(
  mxcUrl: string | null | undefined,
  homeserverUrl: string
): string | null {
  if (!mxcUrl?.startsWith("mxc://")) return null;
  const parts = mxcUrl.slice(6).split("/");
  if (parts.length < 2) return null;
  const [serverName, mediaId] = parts;
  const hs = homeserverUrl.replace(/\/$/, "");
  return `${hs}/_matrix/media/v3/download/${serverName}/${mediaId}`;
}
