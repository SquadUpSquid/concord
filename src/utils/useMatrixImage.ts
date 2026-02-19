import { useState, useEffect } from "react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { getMatrixClient } from "@/lib/matrix";

/**
 * Module-level cache: mxcUrl -> blob URL.
 * Persists across component mounts so the same image is only fetched once.
 */
const blobCache = new Map<string, string>();

/** Track in-flight fetches so multiple components requesting the same MXC URL
 *  don't fire duplicate network requests. */
const inflightRequests = new Map<string, Promise<string | null>>();

function buildThumbnailUrl(
  mxcUrl: string,
  homeserverUrl: string,
  width: number,
  height: number,
): string {
  const parts = mxcUrl.slice(6).split("/");
  const [serverName, mediaId] = parts;
  const hs = homeserverUrl.replace(/\/$/, "");
  return `${hs}/_matrix/client/v1/media/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=crop`;
}

async function fetchImageAsBlob(
  mxcUrl: string,
  width: number,
  height: number,
): Promise<string | null> {
  const cached = blobCache.get(mxcUrl);
  if (cached) return cached;

  const inflight = inflightRequests.get(mxcUrl);
  if (inflight) return inflight;

  const promise = (async (): Promise<string | null> => {
    try {
      const client = getMatrixClient();
      if (!client) return null;

      const hs = client.getHomeserverUrl();
      const token = client.getAccessToken();
      const url = buildThumbnailUrl(mxcUrl, hs, width, height);

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await tauriFetch(url, { method: "GET", headers });

      if (!res.ok) {
        // Fall back to legacy unauthenticated endpoint
        const parts = mxcUrl.slice(6).split("/");
        const [serverName, mediaId] = parts;
        const legacyUrl = `${hs.replace(/\/$/, "")}/_matrix/media/v3/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=crop`;
        const legacyRes = await tauriFetch(legacyUrl, { method: "GET" });
        if (!legacyRes.ok) return null;
        const blob = await legacyRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobCache.set(mxcUrl, blobUrl);
        return blobUrl;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(mxcUrl, blobUrl);
      return blobUrl;
    } catch (err) {
      console.warn("[useMatrixImage] Failed to fetch", mxcUrl, err);
      return null;
    } finally {
      inflightRequests.delete(mxcUrl);
    }
  })();

  inflightRequests.set(mxcUrl, promise);
  return promise;
}

/**
 * React hook that fetches a Matrix media image via the Tauri HTTP plugin
 * (with proper Authorization header) and returns a blob URL for use in <img>.
 *
 * Caches results so each MXC URL is only fetched once across the app lifetime.
 */
export function useMatrixImage(
  mxcUrl: string | null | undefined,
  width = 96,
  height = 96,
): { src: string | null; loading: boolean } {
  const [src, setSrc] = useState<string | null>(() =>
    mxcUrl ? blobCache.get(mxcUrl) ?? null : null,
  );
  const [loading, setLoading] = useState(() =>
    !!mxcUrl && !blobCache.has(mxcUrl),
  );

  useEffect(() => {
    if (!mxcUrl || !mxcUrl.startsWith("mxc://")) {
      setSrc(null);
      setLoading(false);
      return;
    }

    const cached = blobCache.get(mxcUrl);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchImageAsBlob(mxcUrl, width, height).then((blobUrl) => {
      if (!cancelled) {
        setSrc(blobUrl);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mxcUrl, width, height]);

  return { src, loading };
}

/** Evict a single entry from the blob cache (e.g. after avatar change). */
export function evictImageCache(mxcUrl: string): void {
  const existing = blobCache.get(mxcUrl);
  if (existing) {
    URL.revokeObjectURL(existing);
    blobCache.delete(mxcUrl);
  }
}

/** Clear the entire image cache (e.g. on logout). */
export function clearImageCache(): void {
  for (const url of blobCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobCache.clear();
}
