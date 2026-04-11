import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { submitImage2Video, pollTaskUntilComplete } from "@/lib/kling";
import { getPresetById, NEGATIVE_PROMPT } from "@/lib/style-presets";
import { hasQuotaRemaining, incrementUsage } from "@/lib/usage";
import { log } from "@/lib/logger";
import { sleep } from "@/lib/utils";
import type { Plan } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface GenerateRequestBody {
  imageUrl: string; // public URL from /api/upload
  imageBase64?: string; // data: URL fallback
  maskBase64?: string; // protected-region PNG
  presetId: string;
  faceCount: number;
  imageHash: string;
  plan?: Plan;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateRequestBody;
  try {
    body = (await req.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan: Plan = body.plan ?? "free";

  // Quota check BEFORE any billable work
  if (!hasQuotaRemaining(userId, plan)) {
    log.warn({ event: "generate.quota_exceeded", userId, plan });
    return NextResponse.json(
      { error: "quota_exceeded", message: "Free tier limit reached — upgrade to continue" },
      { status: 402 }
    );
  }

  const preset = getPresetById(body.presetId);
  if (!preset) {
    return NextResponse.json({ error: "Unknown preset" }, { status: 400 });
  }
  if (preset.creatorOnly && plan !== "creator") {
    return NextResponse.json(
      { error: "creator_only", message: "This style is a Creator-tier exclusive" },
      { status: 402 }
    );
  }

  const image = body.imageBase64 ?? body.imageUrl;
  if (!image) {
    return NextResponse.json({ error: "Missing image" }, { status: 400 });
  }

  log.info({
    event: "generate.start",
    userId,
    imageHash: body.imageHash,
    preset: preset.id,
    faceCount: body.faceCount,
    plan,
  });

  // Submit + poll Kling — retry once on submit failure
  let taskId: string;
  try {
    taskId = await submitImage2Video({
      image,
      staticMask: body.maskBase64,
      prompt: preset.prompt,
      negativePrompt: NEGATIVE_PROMPT,
      durationSec: 5,
      cfgScale: 0.5,
      mode: "std",
    });
  } catch (err) {
    log.warn({
      event: "generate.kling_submit_retry",
      userId,
      imageHash: body.imageHash,
      message: err instanceof Error ? err.message : String(err),
    });
    await sleep(1500);
    try {
      taskId = await submitImage2Video({
        image,
        staticMask: body.maskBase64,
        prompt: preset.prompt,
        negativePrompt: NEGATIVE_PROMPT,
        durationSec: 5,
        cfgScale: 0.5,
        mode: "std",
      });
    } catch (err2) {
      log.error({
        event: "generate.kling_submit_fail",
        userId,
        imageHash: body.imageHash,
        message: err2 instanceof Error ? err2.message : String(err2),
      });
      return NextResponse.json(
        {
          error: "server_busy",
          message: "Our servers are busy — try again in a moment",
        },
        { status: 503 }
      );
    }
  }

  let videoUrl: string;
  try {
    const result = await pollTaskUntilComplete(taskId, {
      intervalMs: 3000,
      timeoutMs: 180_000,
    });
    videoUrl = result.videoUrl;
  } catch (err) {
    log.error({
      event: "generate.kling_poll_fail",
      userId,
      taskId,
      imageHash: body.imageHash,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error: "generation_failed",
        message: "Video generation failed or timed out",
      },
      { status: 504 }
    );
  }

  // Mirror video to Vercel Blob so it survives Kling's short TTL
  let storedUrl = videoUrl;
  try {
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`fetch video ${videoRes.status}`);
    const buf = await videoRes.arrayBuffer();
    const stored = await put(
      `videos/${userId}/${Date.now()}-${taskId}.mp4`,
      buf,
      {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: false,
      }
    );
    storedUrl = stored.url;
  } catch (err) {
    log.warn({
      event: "generate.blob_mirror_fail",
      userId,
      taskId,
      message: err instanceof Error ? err.message : String(err),
    });
    // Continue with the original Kling URL — don't fail the request
  }

  incrementUsage(userId);

  log.info({
    event: "generate.ok",
    userId,
    imageHash: body.imageHash,
    taskId,
    preset: preset.id,
    plan,
  });

  return NextResponse.json({
    videoUrl: storedUrl,
    taskId,
    preset: preset.id,
  });
}
