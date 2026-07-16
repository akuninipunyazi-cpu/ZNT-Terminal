"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { ImagePlus, Loader2, X, ZoomIn } from "lucide-react";

type Props = {
  value: string | null;          // Current image URL (after upload)
  onChange: (url: string | null) => void;
  token: string | null;          // Bearer token for the upload API call
  apiBase?: string;
};

type UploadState = "idle" | "uploading" | "done" | "error";

export function ImageUploadZone({ value, onChange, token, apiBase }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const base = apiBase ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  async function uploadFile(file: File) {
    setState("uploading");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${base}/insights/upload-chart`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.detail ?? "Upload failed");
      }

      const data = await res.json() as { url: string };
      onChange(`${base}${data.url}`);
      setState("done");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload error");
      onChange(null);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleRemove() {
    onChange(null);
    setState("idle");
    setErrorMsg("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Preview mode — show uploaded image */}
      {value && state === "done" ? (
        <div className="relative group border border-terminal-yellow/30 bg-graphite-950 overflow-hidden rounded-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Chart preview"
            className="w-full max-h-64 object-contain"
          />
          {/* Overlay actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="flex items-center gap-1.5 border border-white/20 bg-black/80 px-3 py-1.5 text-xs text-white hover:border-terminal-yellow hover:text-terminal-yellow transition-colors"
            >
              <ZoomIn size={13} /> Preview
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 border border-white/20 bg-black/80 px-3 py-1.5 text-xs text-white hover:border-terminal-red hover:text-terminal-red transition-colors"
            >
              <X size={13} /> Remove
            </button>
          </div>
          <div className="px-2 py-1 text-[10px] text-white/36 font-mono border-t border-white/10 truncate">
            {value.split("/").pop()}
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-sm cursor-pointer py-8 px-4 transition-all select-none ${
            isDragging
              ? "border-terminal-yellow bg-terminal-yellow/5 scale-[1.01]"
              : state === "error"
              ? "border-terminal-red/50 bg-terminal-red/5"
              : "border-white/15 hover:border-terminal-yellow/50 hover:bg-white/3 bg-graphite-950/50"
          }`}
        >
          {state === "uploading" ? (
            <>
              <Loader2 size={28} className="animate-spin text-terminal-yellow" />
              <p className="text-xs text-white/60">Uploading chart...</p>
            </>
          ) : (
            <>
              <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                state === "error" ? "border-terminal-red/30 text-terminal-red" : "border-white/10 text-white/40"
              }`}>
                <ImagePlus size={22} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/80">
                  {state === "error" ? "Upload Failed — Try Again" : "Click or drag image here"}
                </p>
                <p className="mt-1 text-xs text-white/36">
                  {state === "error"
                    ? errorMsg
                    : "JPEG · PNG · WebP · GIF · Max 10 MB"}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Lightbox overlay */}
      {lightbox && value && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur p-4"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Chart full view"
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center border border-white/20 bg-black/80 text-white hover:text-terminal-yellow transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
