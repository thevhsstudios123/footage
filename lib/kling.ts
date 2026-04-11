/**
 * Minimal Kling AI image-to-video client.
 *
 * Kling uses JWT authentication: a short-lived HS256 JWT is signed with the
 * KLING_API_SECRET, using KLING_API_KEY as the issuer.
 *
 * Docs: https://docs.klingai.com/api-reference/image-to-video
 */

import crypto from "node:crypto";
import { sleep } from "./utils";
import type { KlingTaskResponse } from "@/types";

const KLING_BASE_URL = "https://api.klingai.com";

/** Build an HS256 JWT for Kling's auth scheme. */
function buildKlingJwt(): string {
  const apiKey = process.env.KLING_API_KEY;
  const apiSecret = process.env.KLING_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("KLING_API_KEY and KLING_API_SECRET must be set");
  }

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    exp: now + 1800, // 30 min
    nbf: now - 5,
  };

  const encode = (obj: Record<string, unknown>): string =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

export interface KlingImage2VideoParams {
  /** Data URL or https URL to the source image */
  image: string;
  /** Data URL for the static face/subject mask (PNG, same dimensions as image) */
  staticMask?: string;
  prompt: string;
  negativePrompt?: string;
  durationSec?: 5 | 10;
  cfgScale?: number;
  mode?: "std" | "pro";
  modelName?: string;
}

/** Strip `data:...;base64,` prefix since Kling expects raw base64. */
function stripDataUrl(maybeDataUrl: string): string {
  const m = maybeDataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return m ? m[1] : maybeDataUrl;
}

/**
 * Submit an image-to-video task to Kling. Returns the Kling task ID.
 */
export async function submitImage2Video(
  params: KlingImage2VideoParams
): Promise<string> {
  const body: Record<string, unknown> = {
    model_name: params.modelName ?? "kling-v1",
    image: stripDataUrl(params.image),
    prompt: params.prompt,
    negative_prompt:
      params.negativePrompt ??
      "face distortion, face morphing, face warp, identity change, blurry face, different person",
    cfg_scale: params.cfgScale ?? 0.5,
    mode: params.mode ?? "std",
    duration: String(params.durationSec ?? 5),
  };

  if (params.staticMask) {
    body.static_mask = stripDataUrl(params.staticMask);
  }

  const res = await fetch(`${KLING_BASE_URL}/v1/videos/image2video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${buildKlingJwt()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kling submit failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as KlingTaskResponse;
  if (json.code !== 0 || !json.data?.task_id) {
    throw new Error(`Kling submit error: ${json.message}`);
  }
  return json.data.task_id;
}

/**
 * Fetch the current status of a Kling task.
 */
export async function getTaskStatus(taskId: string): Promise<KlingTaskResponse["data"]> {
  const res = await fetch(`${KLING_BASE_URL}/v1/videos/image2video/${taskId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${buildKlingJwt()}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kling status failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as KlingTaskResponse;
  return json.data;
}

/**
 * Poll a Kling task until it finishes or times out. Default budget 3 minutes.
 */
export async function pollTaskUntilComplete(
  taskId: string,
  opts: { intervalMs?: number; timeoutMs?: number; onProgress?: (status: string) => void } = {}
): Promise<{ videoUrl: string; duration: string }> {
  const intervalMs = opts.intervalMs ?? 3_000;
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const data = await getTaskStatus(taskId);
    opts.onProgress?.(data.task_status);

    if (data.task_status === "succeed") {
      const video = data.task_result?.videos?.[0];
      if (!video?.url) throw new Error("Kling succeed but no video URL");
      return { videoUrl: video.url, duration: video.duration };
    }
    if (data.task_status === "failed") {
      throw new Error(`Kling task failed: ${data.task_status_msg ?? "unknown"}`);
    }
    await sleep(intervalMs);
  }
  throw new Error("Kling task timed out after 3 minutes");
}
