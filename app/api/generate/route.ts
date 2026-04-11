import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import {
  buildStaticMaskDataUrl,
  createImageToVideoTask,
  pollUntilDone,
  type KlingImage2VideoBody,
} from "@/lib/kling";
import {
  NEGATIVE_PROMPT,
  STYLES,
  type GenerateErrorBody,
  type GenerateRequestBody,
  type GenerateResponseBody,
  type StyleId,
} from "@/lib/types";

export const runtime = "nodejs";
// Allow up to ~4 minutes (generation + polling).
export const maxDuration = 300;

const VALID_STYLES: StyleId[] = ["golden-hour", "city", "beach", "mountain"];

function err(message: string, status = 400) {
  return NextResponse.json<GenerateErrorBody>({ error: message }, { status });
}

function decodeDataUrl(dataUrl: string): { bytes: Buffer; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("imageBase64 must be a data URL");
  }
  const [, mime, base64] = match;
  return { bytes: Buffer.from(base64, "base64"), mime };
}

function mimeToExt(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "bin";
}

export async function POST(request: Request) {
  let body: GenerateRequestBody;
  try {
    body = (await request.json()) as GenerateRequestBody;
  } catch {
    return err("Invalid JSON body");
  }

  if (!body.imageBase64 || typeof body.imageBase64 !== "string") {
    return err("imageBase64 is required");
  }
  if (!VALID_STYLES.includes(body.style)) {
    return err("Invalid style");
  }

  const style = STYLES.find((s) => s.id === body.style);
  if (!style) {
    return err("Unknown style");
  }

  try {
    const { bytes, mime } = decodeDataUrl(body.imageBase64);

    // 1. Upload the source image to Vercel Blob so Kling can fetch it.
    const imageBlob = await put(
      `skysnap/${Date.now()}-source.${mimeToExt(mime)}`,
      bytes,
      {
        access: "public",
        contentType: mime,
        addRandomSuffix: true,
        // Vercel Blob doesn't expose a per-object TTL; cleanup happens via
        // a scheduled job or manual sweep. We tag the pathname with a
        // timestamp so an hourly sweep can delete anything older than 1h.
      },
    );

    // 2. Build the Kling request body.
    const klingBody: KlingImage2VideoBody = {
      model_name: "kling-v1",
      image: imageBlob.url,
      prompt: style.prompt,
      negative_prompt: NEGATIVE_PROMPT,
      cfg_scale: 0.5,
      mode: "std",
      duration: 5,
    };

    if (body.faceBoundingBox) {
      klingBody.static_mask = buildStaticMaskDataUrl(
        body.faceBoundingBox.imageWidth,
        body.faceBoundingBox.imageHeight,
        {
          x: body.faceBoundingBox.x,
          y: body.faceBoundingBox.y,
          width: body.faceBoundingBox.width,
          height: body.faceBoundingBox.height,
        },
      );
    }

    // 3. Create the task and poll until it finishes.
    const taskId = await createImageToVideoTask(klingBody);
    const videoUrl = await pollUntilDone(taskId, {
      intervalMs: 3000,
      timeoutMs: 3 * 60 * 1000,
    });

    // 4. Re-host the video on our own Blob so the Kling URL expiring doesn't
    //    break the UI, and so we control the ~1h lifetime.
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(
        `Failed to fetch generated video: ${videoResponse.status}`,
      );
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const hostedVideo = await put(
      `skysnap/${Date.now()}-result.mp4`,
      videoBuffer,
      {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: true,
      },
    );

    const payload: GenerateResponseBody = { videoUrl: hostedVideo.url };
    return NextResponse.json(payload);
  } catch (e) {
    console.error("generate error", e);
    const message =
      e instanceof Error ? e.message : "Unexpected error generating video";
    return err(message, 500);
  }
}
