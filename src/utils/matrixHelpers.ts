export function mxcToHttp(
  mxcUrl: string | null | undefined,
  homeserverUrl: string,
  width = 40,
  height = 40
): string | null {
  if (!mxcUrl?.startsWith("mxc://")) return null;
  const parts = mxcUrl.slice(6).split("/");
  if (parts.length < 2) return null;
  const [serverName, mediaId] = parts;
  return `${homeserverUrl}/_matrix/media/v3/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=crop`;
}
