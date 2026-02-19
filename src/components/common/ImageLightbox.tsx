import { useState, useEffect } from "react";
import { fetchMediaBlob } from "@/utils/useMatrixImage";
import type { EncryptedFileInfo } from "@/stores/messageStore";

interface ImageLightboxProps {
  src: string;
  mxcUrl?: string;
  file?: EncryptedFileInfo | null;
  mimetype?: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, mxcUrl, file, mimetype, alt, onClose }: ImageLightboxProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      const blob = mxcUrl
        ? await fetchMediaBlob(mxcUrl, file, mimetype)
        : await fetch(src).then((r) => r.blob());

      if (!blob) throw new Error("Failed to fetch image");

      const fileName = alt || "image.png";
      const ext = fileName.includes(".") ? fileName.split(".").pop() : "png";
      const filePath = await save({
        defaultPath: fileName,
        filters: ext ? [{ name: "Image", extensions: [ext] }] : undefined,
      });
      if (!filePath) return;

      const arrayBuf = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuf));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save image:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Save button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSave();
        }}
        disabled={saving}
        className="absolute right-14 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70 disabled:opacity-50"
        title="Save image"
      >
        {saving ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : saved ? (
          <svg className="h-6 w-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        )}
      </button>

      {/* Image */}
      <img
        src={src}
        alt={alt ?? "Image preview"}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
