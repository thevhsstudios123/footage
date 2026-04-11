"use client";

import { useRef } from "react";
import { Download, Share2, Instagram, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FacePreservationReport } from "@/types";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  preservation?: FacePreservationReport;
  showWatermark?: boolean;
  className?: string;
}

export function VideoPlayer({
  src,
  preservation,
  showWatermark,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `skysnap-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fall back to opening in a new tab
      window.open(src, "_blank");
    }
  };

  const handleShare = async () => {
    if (typeof navigator === "undefined") return;
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({
          title: "Made with SkySnap",
          text: "Look at this cinematic drone shot I just made with SkySnap!",
          url: src,
        });
        return;
      } catch {
        /* user cancelled — fall through to clipboard copy */
      }
    }
    try {
      await nav.clipboard.writeText(src);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-2xl shadow-black/40">
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted
          playsInline
          controls
          className="h-auto w-full max-h-[70vh]"
        />
        {showWatermark && (
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/50 px-2 py-1 text-[11px] font-semibold text-white/90 backdrop-blur">
            SkySnap
          </div>
        )}
        {preservation && (
          <div className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
            Face preservation:{" "}
            <span
              className={cn(
                preservation.label === "Excellent" && "text-green-400",
                preservation.label === "Good" && "text-green-300",
                preservation.label === "Fair" && "text-yellow-300",
                preservation.label === "Poor" && "text-red-400"
              )}
            >
              {preservation.label}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleDownload} variant="default" className="flex-1 min-w-[9rem]">
          <Download className="h-4 w-4" /> Download MP4
        </Button>
        <Button onClick={handleShare} variant="outline">
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          aria-label="Share to Instagram Reels"
        >
          <Instagram className="h-4 w-4" /> Reels
        </Button>
        <Button onClick={handleShare} variant="outline" aria-label="Share to TikTok">
          <Music2 className="h-4 w-4" /> TikTok
        </Button>
      </div>
    </div>
  );
}
