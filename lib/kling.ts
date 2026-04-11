import { SignJWT } from "jose";

const KLING_BASE_URL = "https://api.kwaikolors.com/kling/v1";

export interface KlingImage2VideoBody {
  model_name: string;
  image: string;
  prompt: string;
  negative_prompt: string;
  cfg_scale: number;
  mode: "std" | "pro";
  duration: number;
  static_mask?: string;
}

export interface KlingCreateTaskResponse {
  code: number;
  message: string;
  request_id?: string;
  data?: {
    task_id: string;
    task_status: KlingTaskStatus;
  };
}

export type KlingTaskStatus =
  | "submitted"
  | "processing"
  | "succeed"
  | "failed";

export interface KlingTaskResponse {
  code: number;
  message: string;
  request_id?: string;
  data?: {
    task_id: string;
    task_status: KlingTaskStatus;
    task_status_msg?: string;
    task_result?: {
      videos?: Array<{
        id: string;
        url: string;
        duration: string;
      }>;
    };
  };
}

function getCredentials(): { key: string; secret: string } {
  const key = process.env.KLING_API_KEY;
  const secret = process.env.KLING_API_SECRET;
  if (!key || !secret) {
    throw new Error("KLING_API_KEY and KLING_API_SECRET must be set");
  }
  return { key, secret };
}

/**
 * Generates a short-lived Kling JWT signed with HS256.
 *
 * Header: { alg: "HS256", typ: "JWT" }
 * Payload: { iss: KLING_API_KEY, exp: now + 1800, nbf: now - 5 }
 */
export async function createKlingJwt(): Promise<string> {
  const { key, secret } = getCredentials();
  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  return await new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(key)
    .setNotBefore(now - 5)
    .setExpirationTime(now + 1800)
    .sign(encoder.encode(secret));
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await createKlingJwt();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createImageToVideoTask(
  body: KlingImage2VideoBody,
): Promise<string> {
  const res = await fetch(`${KLING_BASE_URL}/videos/image2video`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Kling create task failed: ${res.status} ${res.statusText} — ${text}`,
    );
  }

  const json = (await res.json()) as KlingCreateTaskResponse;
  if (json.code !== 0 || !json.data?.task_id) {
    throw new Error(
      `Kling create task rejected: ${json.message || "unknown error"}`,
    );
  }
  return json.data.task_id;
}

export async function getImageToVideoTask(
  taskId: string,
): Promise<KlingTaskResponse> {
  const res = await fetch(`${KLING_BASE_URL}/videos/image2video/${taskId}`, {
    method: "GET",
    headers: await authHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Kling fetch task failed: ${res.status} ${res.statusText} — ${text}`,
    );
  }

  return (await res.json()) as KlingTaskResponse;
}

/**
 * Polls a Kling task until it reaches a terminal state.
 * Polls every `intervalMs` ms, gives up after `timeoutMs` ms.
 * Returns the final video URL on success, throws on failure / timeout.
 */
export async function pollUntilDone(
  taskId: string,
  {
    intervalMs = 3000,
    timeoutMs = 3 * 60 * 1000,
  }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const task = await getImageToVideoTask(taskId);
    const status = task.data?.task_status;

    if (status === "succeed") {
      const videoUrl = task.data?.task_result?.videos?.[0]?.url;
      if (!videoUrl) {
        throw new Error("Kling task succeeded but returned no video URL");
      }
      return videoUrl;
    }

    if (status === "failed") {
      throw new Error(
        `Kling task failed: ${task.data?.task_status_msg || "unknown reason"}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Kling task timed out after 3 minutes");
}

/**
 * Builds a 1x1 PNG data URL containing a white rectangle on a black canvas,
 * with the white rectangle positioned at the face bounding box in the
 * image's natural pixel space. The returned value is a base-64 PNG data URL
 * suitable for Kling's `static_mask` field.
 *
 * This runs server-side without a DOM, so we synthesize a PNG by hand
 * using a minimal encoder for an 8-bit grayscale image.
 */
export function buildStaticMaskDataUrl(
  imageWidth: number,
  imageHeight: number,
  box: { x: number; y: number; width: number; height: number },
): string {
  const w = Math.max(1, Math.floor(imageWidth));
  const h = Math.max(1, Math.floor(imageHeight));
  const bx = Math.max(0, Math.floor(box.x));
  const by = Math.max(0, Math.floor(box.y));
  const bw = Math.max(0, Math.min(w - bx, Math.floor(box.width)));
  const bh = Math.max(0, Math.min(h - by, Math.floor(box.height)));

  // Build raw grayscale pixel data: 0 = black, 255 = white.
  const raw = new Uint8Array(w * h);
  for (let y = by; y < by + bh; y++) {
    const rowStart = y * w;
    for (let x = bx; x < bx + bw; x++) {
      raw[rowStart + x] = 255;
    }
  }

  const png = encodeGrayscalePng(raw, w, h);
  const base64 = Buffer.from(png).toString("base64");
  return `data:image/png;base64,${base64}`;
}

// ---------- Minimal PNG encoder (8-bit grayscale, no alpha) ----------

function encodeGrayscalePng(
  raw: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  // PNG signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // color type: grayscale
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter: default
  ihdr[12] = 0; // interlace: none
  const ihdrChunk = buildChunk("IHDR", ihdr);

  // IDAT chunk: one filter byte (0 = None) per scanline, then raw pixels.
  const filtered = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) {
    filtered[y * (width + 1)] = 0; // filter: None
    filtered.set(raw.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }
  const compressed = zlibDeflate(filtered);
  const idatChunk = buildChunk("IDAT", compressed);

  // IEND
  const iendChunk = buildChunk("IEND", new Uint8Array(0));

  const total = new Uint8Array(
    signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length,
  );
  let offset = 0;
  total.set(signature, offset);
  offset += signature.length;
  total.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  total.set(idatChunk, offset);
  offset += idatChunk.length;
  total.set(iendChunk, offset);
  return total;
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const chunk = new Uint8Array(8 + len + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, len);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  view.setUint32(8 + len, crc);
  return chunk;
}

function zlibDeflate(data: Uint8Array): Uint8Array {
  // We use Node's zlib in the server; if unavailable fall back to a raw
  // stored-block deflate. Kling API calls only run on the server so Node's
  // zlib is always available there.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const zlib = require("node:zlib") as typeof import("node:zlib");
  return new Uint8Array(zlib.deflateSync(Buffer.from(data)));
}

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
