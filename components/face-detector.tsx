"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  detectFaces,
  drawFaceOverlay,
  loadFaceApiModels,
  loadImage,
} from "@/lib/face-utils";
import type { FaceDetectionResult } from "@/types";
import { cn } from "@/lib/utils";

interface FaceDetectorProps {
  imageUrl: string | null;
  onDetected: (result: FaceDetectionResult, imgEl: HTMLImageElement) => void;
  className?: string;
}

type Phase = "idle" | "loading-models" | "detecting" | "done" | "error";

export function FaceDetector({
  imageUrl,
  onDetected,
  className,
}: FaceDetectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const run = useCallback(
    async (url: string) => {
      setPhase("loading-models");
      setErrorMsg(null);
      setFaceCount(null);

      try {
        await loadFaceApiModels();
        setPhase("detecting");

        const img = await loadImage(url);
        const result = await detectFaces(img);

        if (canvasRef.current) {
          drawFaceOverlay(canvasRef.current, img, result.faces);
        }

        setFaceCount(result.faces.length);
        setPhase("done");
        onDetected(result, img);
      } catch (err) {
        console.error(err);
        setErrorMsg(err instanceof Error ? err.message : "Detection failed");
        setPhase("error");
      }
    },
    [onDetected]
  );

  useEffect(() => {
    if (!imageUrl) {
      setPhase("idle");
      setFaceCount(null);
      return;
    }
    void run(imageUrl);
  }, [imageUrl, run]);

  if (!imageUrl) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
        <canvas
          ref={canvasRef}
          className="w-full h-auto max-h-[60vh] object-contain"
        />
        {(phase === "loading-models" || phase === "detecting") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-white/90">
              {phase === "loading-models"
                ? "Loading face detection model…"
                : "Detecting your face…"}
            </p>
          </div>
        )}
      </div>

      {phase === "done" && faceCount !== null && faceCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200 animate-fade-in">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
          <div>
            <p className="font-semibold">
              {faceCount === 1
                ? "Face detected — protection active"
                : `${faceCount} faces detected — all protected`}
            </p>
            <p className="text-xs text-green-200/80">
              Your face will be masked during AI generation so it stays exactly
              as it is in your photo.
            </p>
          </div>
        </div>
      )}

      {phase === "done" && faceCount === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200 animate-fade-in">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
          <div>
            <p className="font-semibold">No face detected</p>
            <p className="text-xs text-yellow-200/80">
              Your video will still look amazing, but face protection won&apos;t
              apply.
            </p>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-semibold">Detection failed</p>
            <p className="text-xs text-red-200/80">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
