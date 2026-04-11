import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { log } from "@/lib/logger";
import { sha256Hex } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Uploads the user's source photo to Vercel Blob and returns the public URL.
 *
 * The object key embeds a 1-hour expiry tag. A separate cron or on-read filter
 * should clean up keys older than 1 hour to honor the privacy promise.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image too large (max 15MB)" },
      { status: 413 }
    );
  }

  const arrayBuf = await file.arrayBuffer();
  const imageHash = (await sha256Hex(arrayBuf)).slice(0, 16);
  const ts = Date.now();
  // Key format: ephemeral/<userId>/<ts>-<hash>.ext  — ts lets cleanup jobs
  // filter by age.
  const ext = (file.type.split("/")[1] ?? "png").replace(/[^a-z0-9]/gi, "");
  const key = `ephemeral/${userId}/${ts}-${imageHash}.${ext}`;

  try {
    const blob = await put(key, arrayBuf, {
      access: "public",
      contentType: file.type || "image/png",
      addRandomSuffix: false,
    });

    log.info({
      event: "upload.ok",
      userId,
      imageHash,
      size: file.size,
    });

    return NextResponse.json({
      url: blob.url,
      key,
      imageHash,
      expiresAt: ts + 60 * 60 * 1000,
    });
  } catch (err) {
    log.error({
      event: "upload.fail",
      userId,
      imageHash,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
