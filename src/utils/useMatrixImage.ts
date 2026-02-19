import { useState, useEffect } from "react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { getMatrixClient } from "@/lib/matrix";
import { decryptAttachment } from "@/utils/decryptAttachment";
import type { EncryptedFileInfo } from "@/stores/messageStore";

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
        console.warn("[fetchImageAsBlob] Auth thumbnail failed:", res.status, "for", mxcUrl);
        // Fall back to legacy unauthenticated endpoint
        const parts = mxcUrl.slice(6).split("/");
        const [serverName, mediaId] = parts;
        const legacyUrl = `${hs.replace(/\/$/, "")}/_matrix/media/v3/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=crop`;
        const legacyRes = await tauriFetch(legacyUrl, { method: "GET" });
        if (!legacyRes.ok) {
          console.warn("[fetchImageAsBlob] Legacy thumbnail also failed:", legacyRes.status);
          return null;
        }
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
      console.error("[fetchImageAsBlob] Failed to fetch", mxcUrl, err);
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

function buildDownloadUrl(
  mxcUrl: string,
  homeserverUrl: string,
): string {
  const parts = mxcUrl.slice(6).split("/");
  const [serverName, mediaId] = parts;
  const hs = homeserverUrl.replace(/\/$/, "");
  return `${hs}/_matrix/client/v1/media/download/${serverName}/${mediaId}`;
}

async function downloadRawMedia(mxcUrl: string): Promise<ArrayBuffer | null> {
  const client = getMatrixClient();
  if (!client) {
    console.warn("[downloadRawMedia] No Matrix client");
    return null;
  }

  const hs = client.getHomeserverUrl();
  const token = client.getAccessToken();
  const url = buildDownloadUrl(mxcUrl, hs);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await tauriFetch(url, { method: "GET", headers });

    if (!res.ok) {
      console.warn("[downloadRawMedia] Auth endpoint failed:", res.status, "for", mxcUrl);
      const parts = mxcUrl.slice(6).split("/");
      const [serverName, mediaId] = parts;
      const legacyUrl = `${hs.replace(/\/$/, "")}/_matrix/media/v3/download/${serverName}/${mediaId}`;
      const legacyRes = await tauriFetch(legacyUrl, { method: "GET" });
      if (!legacyRes.ok) {
        console.warn("[downloadRawMedia] Legacy endpoint also failed:", legacyRes.status);
        return null;
      }
      const blob = await legacyRes.blob();
      return await blob.arrayBuffer();
    }

    const blob = await res.blob();
    return await blob.arrayBuffer();
  } catch (err) {
    console.error("[downloadRawMedia] Fetch error for", mxcUrl, err);
    return null;
  }
}

async function fetchMediaAsBlob(
  mxcUrl: string,
  fileInfo?: EncryptedFileInfo | null,
  mimetype?: string,
): Promise<string | null> {
  const cacheKey = `dl:${mxcUrl}`;
  const cached = blobCache.get(cacheKey);
  if (cached) return cached;

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) return inflight;

  const promise = (async (): Promise<string | null> => {
    try {
      const raw = await downloadRawMedia(mxcUrl);
      if (!raw) {
        console.warn("[fetchMediaAsBlob] Download returned null for", mxcUrl);
        return null;
      }
      console.log("[fetchMediaAsBlob] Downloaded", raw.byteLength, "bytes for", mxcUrl, fileInfo ? "(encrypted)" : "(plain)");

      let finalBuf: ArrayBuffer;
      if (fileInfo) {
        finalBuf = await decryptAttachment(raw, fileInfo);
        console.log("[fetchMediaAsBlob] Decrypted to", finalBuf.byteLength, "bytes");
      } else {
        finalBuf = raw;
      }

      const blob = new Blob([finalBuf], mimetype ? { type: mimetype } : undefined);
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(cacheKey, blobUrl);
      return blobUrl;
    } catch (err) {
      console.error("[fetchMediaAsBlob] Failed for", mxcUrl, err);
      return null;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * React hook that fetches full-size Matrix media via the Tauri HTTP plugin
 * (with proper Authorization header) and returns a blob URL.
 * Supports encrypted attachments when fileInfo is provided.
 * Use for images in lightbox, video, audio, and file downloads.
 */
export function useMatrixMedia(
  mxcUrl: string | null | undefined,
  fileInfo?: EncryptedFileInfo | null,
  mimetype?: string,
): { src: string | null; loading: boolean } {
  const cacheKey = mxcUrl ? `dl:${mxcUrl}` : null;
  const [src, setSrc] = useState<string | null>(() =>
    cacheKey ? blobCache.get(cacheKey) ?? null : null,
  );
  const [loading, setLoading] = useState(() =>
    !!cacheKey && !blobCache.has(cacheKey),
  );

  useEffect(() => {
    if (!mxcUrl || !mxcUrl.startsWith("mxc://")) {
      setSrc(null);
      setLoading(false);
      return;
    }

    const key = `dl:${mxcUrl}`;
    const cached = blobCache.get(key);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchMediaAsBlob(mxcUrl, fileInfo, mimetype).then((blobUrl) => {
      if (!cancelled) {
        setSrc(blobUrl);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mxcUrl, fileInfo, mimetype]);

  return { src, loading };
}

/**
 * Non-hook function to fetch media as a blob (for downloads / save-to-disk).
 * Returns the raw Blob, not a blob URL.
 * Supports encrypted attachments when fileInfo is provided.
 */
export async function fetchMediaBlob(
  mxcUrl: string,
  fileInfo?: EncryptedFileInfo | null,
  mimetype?: string,
): Promise<Blob | null> {
  try {
    const raw = await downloadRawMedia(mxcUrl);
    if (!raw) return null;

    if (fileInfo) {
      const decrypted = await decryptAttachment(raw, fileInfo);
      return new Blob([decrypted], mimetype ? { type: mimetype } : undefined);
    }

    return new Blob([raw]);
  } catch (err) {
    console.warn("[fetchMediaBlob] Failed to fetch", mxcUrl, err);
    return null;
  }
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
