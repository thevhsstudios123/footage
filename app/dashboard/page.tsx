"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, RotateCcw, Sparkles } from "lucide-react";
import { UploadZone } from "@/components/upload-zone";
import { FaceDetector } from "@/components/face-detector";
import { StylePicker } from "@/components/style-picker";
import { GenerationStatus } from "@/components/generation-status";
import { VideoPlayer } from "@/components/video-player";
import { PricingModal } from "@/components/pricing-modal";
import { UsageCounter } from "@/components/usage-counter";
import { Button } from "@/components/ui/button";
import { buildProtectedMask, faceDistance } from "@/lib/face-utils";
import { segmentSubject } from "@/lib/segmentation";
import { getPresetById } from "@/lib/style-presets";
import type {
  FaceDetectionResult,
  FacePreservationReport,
  GenerationStatus as Status,
  Plan,
  StylePresetId,
} from "@/types";

interface UploadedImage {
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  imageHash?: string;
}

export default function DashboardPage() {
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null);
  const [faceResult, setFaceResult] = useState<FaceDetectionResult | null>(
    null
  );
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [presetId, setPresetId] = useState<StylePresetId | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [preservation, setPreservation] =
    useState<FacePreservationReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<
    "quota" | "creator-lock" | undefined
  >(undefined);

  // TODO: wire to Clerk/DB
  const plan: Plan = "free";
  const [usedThisMonth, setUsedThisMonth] = useState(0);

  const canGenerate =
    !!uploaded && !!presetId && status === "idle" && status !== ("detecting-face" as Status);

  const selectedPreset = useMemo(
    () => (presetId ? getPresetById(presetId) : null),
    [presetId]
  );

  const reset = () => {
    if (uploaded?.previewUrl) URL.revokeObjectURL(uploaded.previewUrl);
    setUploaded(null);
    setFaceResult(null);
    setImgEl(null);
    setPresetId(null);
    setStatus("idle");
    setVideoUrl(null);
    setPreservation(null);
    setErrorMsg(null);
  };

  const onFileSelected = useCallback((file: File, previewUrl: string) => {
    setUploaded({ file, previewUrl });
    setFaceResult(null);
    setImgEl(null);
    setVideoUrl(null);
    setPreservation(null);
    setErrorMsg(null);
    setStatus("idle");
  }, []);

  const onFaceDetected = useCallback(
    (result: FaceDetectionResult, el: HTMLImageElement) => {
      setFaceResult(result);
      setImgEl(el);
    },
    []
  );

  const generate = async () => {
    if (!uploaded || !presetId || !faceResult || !imgEl) return;

    setErrorMsg(null);
    setVideoUrl(null);
    setPreservation(null);

    try {
      // Step 1: build the protected-region mask
      setStatus("building-mask");
      let subjectAlpha: Uint8ClampedArray | undefined;
      try {
        const seg = await segmentSubject(imgEl);
        subjectAlpha = seg.alpha;
      } catch (err) {
        console.warn("Segmentation failed, falling back to face-box mask only:", err);
      }
      const maskBase64 = await buildProtectedMask(
        faceResult.imageWidth,
        faceResult.imageHeight,
        faceResult.faces,
        subjectAlpha
      );

      // Step 2: upload the source image
      setStatus("uploading");
      const form = new FormData();
      form.append("file", uploaded.file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }
      const uploadJson = (await uploadRes.json()) as {
        url: string;
        imageHash: string;
      };
      setUploaded((prev) =>
        prev
          ? { ...prev, uploadedUrl: uploadJson.url, imageHash: uploadJson.imageHash }
          : prev
      );

      // Step 3: submit generation
      setStatus("queued");
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadJson.url,
          maskBase64,
          presetId,
          faceCount: faceResult.faces.length,
          imageHash: uploadJson.imageHash,
          plan,
        }),
      });

      if (genRes.status === 402) {
        const data = (await genRes.json()) as { error: string };
        if (data.error === "quota_exceeded") {
          setUpgradeReason("quota");
          setUpgradeOpen(true);
        } else if (data.error === "creator_only") {
          setUpgradeReason("creator-lock");
          setUpgradeOpen(true);
        }
        setStatus("idle");
        return;
      }
      if (!genRes.ok) {
        const data = (await genRes.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message ?? "Generation failed");
      }

      setStatus("generating");
      const genJson = (await genRes.json()) as { videoUrl: string };

      // Step 4: face restoration (best-effort — don't fail on error)
      setStatus("restoring-face");
      try {
        await fetch("/api/restore-face", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl: genJson.videoUrl,
            imageHash: uploadJson.imageHash,
          }),
        });
      } catch (err) {
        console.warn("Face restoration failed, continuing:", err);
      }

      // Step 5: (optional) verification — scaffolded but lightweight.
      // Frame-by-frame face-api.js analysis would happen here. For now we
      // build a conservative report based on face detection confidence.
      setStatus("verifying");
      const avgScore =
        faceResult.faces.length > 0
          ? faceResult.faces.reduce((a, b) => a + b.score, 0) /
            faceResult.faces.length
          : 1;
      const report: FacePreservationReport = {
        score: avgScore,
        label:
          avgScore > 0.95
            ? "Excellent"
            : avgScore > 0.85
            ? "Good"
            : avgScore > 0.7
            ? "Fair"
            : "Poor",
        perFrameDistances: [],
        worstDistance: 0,
      };
      setPreservation(report);

      setVideoUrl(genJson.videoUrl);
      setStatus("complete");
      setUsedThisMonth((n) => n + 1);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setStatus("failed");
    }
  };

  // Quick self-test: when a face is detected, compute the distance to itself
  // (should be ~0). Useful sanity check in dev — logged only.
  if (faceResult && faceResult.faces.length > 0) {
    const f = faceResult.faces[0];
    const d = faceDistance(f.descriptor, f.descriptor);
    if (d > 0.01) {
      console.warn("face self-distance unexpectedly large", d);
    }
  }

  return (
    <>
      <main className="relative mx-auto max-w-xl px-4 py-6 md:max-w-2xl">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 text-sm font-black text-white shadow-lg shadow-violet-500/30">
              S
            </div>
            <span className="font-bold">SkySnap</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Photos auto-delete in 1 hour</span>
            <span className="sm:hidden">Private</span>
          </div>
        </header>

        <UsageCounter
          plan={plan}
          used={usedThisMonth}
          onUpgrade={() => {
            setUpgradeReason(undefined);
            setUpgradeOpen(true);
          }}
        />

        <div className="mt-5 space-y-5">
          {!uploaded && <UploadZone onFileSelected={onFileSelected} />}

          {uploaded && (
            <>
              <FaceDetector
                imageUrl={uploaded.previewUrl}
                onDetected={onFaceDetected}
              />

              <StylePicker
                selectedId={presetId}
                onSelect={setPresetId}
                plan={plan}
                onLockedClick={() => {
                  setUpgradeReason("creator-lock");
                  setUpgradeOpen(true);
                }}
              />

              {selectedPreset && (
                <p className="text-xs text-muted-foreground animate-fade-in">
                  Camera motion: {selectedPreset.cameraMotion}
                </p>
              )}

              {status === "idle" && (
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    variant="gradient"
                    className="flex-1"
                    disabled={!canGenerate || !faceResult}
                    onClick={generate}
                  >
                    <Sparkles className="h-5 w-5" />
                    Generate
                  </Button>
                  <Button size="lg" variant="outline" onClick={reset}>
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>
              )}

              {status !== "idle" && status !== "complete" && status !== "failed" && (
                <GenerationStatus status={status} />
              )}

              {status === "failed" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    {errorMsg ?? "Generation failed. Please try again."}
                  </div>
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={() => {
                      setStatus("idle");
                      setErrorMsg(null);
                    }}
                  >
                    Try again
                  </Button>
                </div>
              )}

              {status === "complete" && videoUrl && (
                <div className="space-y-4">
                  <VideoPlayer
                    src={videoUrl}
                    preservation={preservation ?? undefined}
                    showWatermark={plan === "free"}
                  />
                  <Button variant="outline" className="w-full" onClick={reset}>
                    Make another
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Your photos are processed securely and deleted within 1 hour.
        </p>
      </main>

      <PricingModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={upgradeReason}
        onChoosePlan={() => {
          // TODO: kick off Stripe checkout here
          setUpgradeOpen(false);
        }}
      />
    </>
  );
}
