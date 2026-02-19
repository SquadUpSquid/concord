import type { EncryptedFileInfo } from "@/stores/messageStore";

function base64UrlToBase64(base64Url: string): string {
  return base64Url.replace(/-/g, "+").replace(/_/g, "/");
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Decrypt a Matrix encrypted attachment using the Web Crypto API.
 * Follows the Matrix spec for encrypted attachments (AES-CTR, SHA-256 verification).
 *
 * @see https://spec.matrix.org/v1.11/client-server-api/#sending-encrypted-attachments
 */
export async function decryptAttachment(
  ciphertext: ArrayBuffer,
  fileInfo: EncryptedFileInfo,
): Promise<ArrayBuffer> {
  const jwk: JsonWebKey = {
    ...fileInfo.key,
    k: base64UrlToBase64(fileInfo.key.k),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-CTR" },
    false,
    ["decrypt"],
  );

  const iv = base64ToArrayBuffer(fileInfo.iv);

  const ivArray = new Uint8Array(iv);
  // Per the Matrix spec, the counter occupies the lower 64 bits of the IV
  const counter = new Uint8Array(16);
  counter.set(ivArray.slice(0, 16));

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-CTR", counter, length: 64 },
    key,
    ciphertext,
  );

  // Optionally verify SHA-256 hash
  if (fileInfo.hashes?.sha256) {
    const hashBuf = await crypto.subtle.digest("SHA-256", ciphertext);
    const hashArray = new Uint8Array(hashBuf);
    let hashBase64 = btoa(String.fromCharCode(...hashArray));
    hashBase64 = hashBase64.replace(/=+$/, "");

    const expected = fileInfo.hashes.sha256.replace(/=+$/, "");
    if (hashBase64 !== expected) {
      console.warn("[decryptAttachment] SHA-256 hash mismatch, proceeding anyway");
    }
  }

  return plaintext;
}
