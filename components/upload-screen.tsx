"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceBoundingBox } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

type DetectionState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "detecting" }
  | { kind: "done"; hasFace: boolean }
  | { kind: "error"; message: string };

export interface UploadScreenProps {
  onNext: (payload: {
    imageBase64: string;
    faceBoundingBox: FaceBoundingBox | null;
  }) => void;
}

export default function UploadScreen({ onNext }: UploadScreenProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [faceBox, setFaceBox] = useState<FaceBoundingBox | null>(null);
  const [detection, setDetection] = useState<DetectionState>({ kind: "idle" });
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Revoke object URLs when they change / on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const runFaceDetection = useCallback(async () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    setDetection({ kind: "loading" });
    try {
      const faceapi = await import("face-api.js");
      // Load the ssdMobilenetv1 model from /public/models on first use.
      if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
        await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      }
      setDetection({ kind: "detecting" });

      const detections = await faceapi.detectAllFaces(
        img,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }),
      );

      // Resize canvas to match the rendered (displayed) image size.
      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setDetection({ kind: "error", message: "Canvas unavailable" });
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length === 0) {
        setFaceBox(null);
        setDetection({ kind: "done", hasFace: false });
        return;
      }

      // Pick the largest face by area.
      const best = detections.reduce((a, b) =>
        a.box.area > b.box.area ? a : b,
      );
      const { x, y, width, height } = best.box;

      // face-api.js returns coordinates in the image's natural pixel space
      // (since we passed the <img> element directly). Convert to the
      // displayed canvas coordinates for drawing.
      const scaleX = displayWidth / img.naturalWidth;
      const scaleY = displayHeight / img.naturalHeight;

      ctx.lineWidth = Math.max(3, Math.round(displayWidth * 0.008));
      ctx.strokeStyle = "#22c55e"; // green-500
      ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);

      setFaceBox({
        x,
        y,
        width,
        height,
        imageWidth: img.naturalWidth,
        imageHeight: img.naturalHeight,
      });
      setDetection({ kind: "done", hasFace: true });
    } catch (err) {
      console.error(err);
      setDetection({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Face detection failed. You can still continue.",
      });
    }
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setFileError(null);
      setFaceBox(null);
      setDetection({ kind: "idle" });

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setFileError("Please upload a JPG or PNG image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setFileError("That file is too big. Max size is 10 MB.");
        return;
      }

      // Read as data URL so we have both a preview source and a base64 to hand off.
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      setImageBase64(dataUrl);
      // Revoke any previous object URL before replacing.
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    },
    [],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onImageLoad = () => {
    void runFaceDetection();
  };

  const canContinue = Boolean(imageBase64) && detection.kind !== "loading";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-5 pb-10 pt-8 sm:max-w-lg">
      <header className="w-full text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          SkySnap
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Turn your photo into a cinematic drone shot.
        </p>
      </header>

      {!previewUrl ? (
        <label
          htmlFor="skysnap-file"
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`mt-8 flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
            dragActive
              ? "border-brand-accent bg-indigo-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
        >
          <div className="text-4xl" aria-hidden>
            📸
          </div>
          <div className="mt-3 text-base font-medium">
            Drop your photo here or tap to select
          </div>
          <div className="mt-1 text-xs text-gray-500">JPG or PNG · up to 10 MB</div>
          <input
            ref={inputRef}
            id="skysnap-file"
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={onInputChange}
          />
        </label>
      ) : (
        <div className="mt-8 w-full">
          <div className="relative w-full overflow-hidden rounded-2xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={previewUrl}
              alt="Uploaded preview"
              className="block h-auto w-full"
              onLoad={onImageLoad}
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
          </div>

          <div className="mt-4 text-center text-sm" aria-live="polite">
            {detection.kind === "loading" && (
              <span className="text-gray-500">Loading face detector…</span>
            )}
            {detection.kind === "detecting" && (
              <span className="text-gray-500">Looking for a face…</span>
            )}
            {detection.kind === "done" && detection.hasFace && (
              <span className="font-medium text-green-600">
                ✅ Face detected — we&rsquo;ll keep it untouched
              </span>
            )}
            {detection.kind === "done" && !detection.hasFace && (
              <span className="font-medium text-amber-600">
                ⚠️ No face detected — video will still look great
              </span>
            )}
            {detection.kind === "error" && (
              <span className="text-red-600">{detection.message}</span>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                if (imageBase64) {
                  onNext({ imageBase64, faceBoundingBox: faceBox });
                }
              }}
              disabled={!canContinue}
              className="w-full rounded-xl bg-brand-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
                setImageBase64(null);
                setFaceBox(null);
                setDetection({ kind: "idle" });
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="w-full rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600"
            >
              Pick a different photo
            </button>
          </div>
        </div>
      )}

      {fileError && (
        <div className="mt-4 w-full rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-600">
          {fileError}
        </div>
      )}
    </div>
  );
}
