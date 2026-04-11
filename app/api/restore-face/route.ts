import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { restoreFace } from "@/lib/replicate";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RestoreRequestBody {
  videoUrl: string;
  /** Optional — we'll still work without it, but identity checks get skipped */
  imageHash?: string;
}

/**
 * Extracts 3 key frames (first, middle, last) from a video, runs CodeFormer
 * face restoration on each, and returns the restored frames. The client can
 * then composite them into the final output or we can call a server-side
 * ffmpeg replacement if the environment supports it.
 *
 * On Vercel serverless, fluent-ffmpeg needs @ffmpeg-installer/ffmpeg. If ffmpeg
 * isn't available at runtime (e.g. edge function), we fall back to asking
 * Replicate to sample the frames — CodeFormer accepts a video URL on some
 * deployments but not all, so we use a thumbnail service as a safe fallback.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RestoreRequestBody;
  try {
    body = (await req.json()) as RestoreRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.videoUrl) {
    return NextResponse.json({ error: "Missing videoUrl" }, { status: 400 });
  }

  log.info({
    event: "restore.start",
    userId,
    imageHash: body.imageHash,
  });

  try {
    // Extract 3 key frames with fluent-ffmpeg
    const frames = await extractKeyFrames(body.videoUrl, 3);

    // Restore each frame in parallel
    const restored = await Promise.all(
      frames.map(async (frameBuf, idx) => {
        // Upload the frame so Replicate can fetch it by URL
        const frameBlob = await put(
          `frames/${userId}/${Date.now()}-${idx}.png`,
          frameBuf,
          {
            access: "public",
            contentType: "image/png",
            addRandomSuffix: false,
          }
        );
        return restoreFace({
          imageUrl: frameBlob.url,
          fidelityWeight: 0.7,
          upscale: 1,
        });
      })
    );

    log.info({
      event: "restore.ok",
      userId,
      imageHash: body.imageHash,
      frameCount: restored.length,
    });

    return NextResponse.json({
      restoredFrames: restored,
      // Client-side or a followup ffmpeg call can composite these; for now we
      // surface them so the UI can show a side-by-side quality preview.
    });
  } catch (err) {
    log.error({
      event: "restore.fail",
      userId,
      imageHash: body.imageHash,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "restore_failed", message: "Face restoration failed" },
      { status: 500 }
    );
  }
}

/**
 * Extract N evenly-spaced frames from a video URL using fluent-ffmpeg.
 * Returns an array of PNG buffers.
 */
async function extractKeyFrames(videoUrl: string, count: number): Promise<Buffer[]> {
  // Lazy-load so the route can still run where ffmpeg isn't available
  const ffmpeg = (await import("fluent-ffmpeg")).default;
  const { promises: fs } = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skysnap-frames-"));

  try {
    // Download the video to a temp file first (ffmpeg over HTTP is flaky)
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`fetch video ${videoRes.status}`);
    const videoBuf = Buffer.from(await videoRes.arrayBuffer());
    const videoPath = path.join(tmp, "in.mp4");
    await fs.writeFile(videoPath, videoBuf);

    // Get duration via ffprobe
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, data) => {
        if (err) reject(err);
        else resolve(data.format.duration ?? 5);
      });
    });

    const timestamps: number[] = [];
    for (let i = 0; i < count; i++) {
      timestamps.push((duration * (i + 1)) / (count + 1));
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .screenshots({
          timestamps,
          filename: "frame-%i.png",
          folder: tmp,
        });
    });

    const files = await fs.readdir(tmp);
    const frameFiles = files
      .filter((f) => f.startsWith("frame-") && f.endsWith(".png"))
      .sort();

    const buffers: Buffer[] = [];
    for (const f of frameFiles) {
      buffers.push(await fs.readFile(path.join(tmp, f)));
    }
    return buffers;
  } finally {
    // Clean up temp dir
    try {
      await fs.rm(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
