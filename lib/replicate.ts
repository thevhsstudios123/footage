/**
 * Replicate client — used for CodeFormer face restoration on key video frames.
 *
 * We use the `replicate` npm package which handles the polling loop internally.
 * Model: sczhou/codeformer — restores face detail while preserving identity.
 */

import Replicate from "replicate";

let cached: Replicate | null = null;

export function getReplicate(): Replicate {
  if (cached) return cached;
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  cached = new Replicate({ auth: token });
  return cached;
}

/**
 * Run CodeFormer face restoration on a single image.
 * fidelityWeight: 0.0 = max restoration quality, 1.0 = max fidelity to input.
 * 0.7 is the sweet spot for identity-preserving restoration.
 */
export async function restoreFace(params: {
  imageUrl: string;
  fidelityWeight?: number;
  upscale?: 1 | 2 | 4;
}): Promise<string> {
  const client = getReplicate();

  const output = await client.run(
    "sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b76b1b57f55c7ba7f19ce2f2e7a6b63",
    {
      input: {
        image: params.imageUrl,
        codeformer_fidelity: params.fidelityWeight ?? 0.7,
        background_enhance: false,
        face_upsample: true,
        upscale: params.upscale ?? 1,
      },
    }
  );

  // Replicate returns a URL string or an array depending on the model
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  if (output && typeof output === "object" && "url" in output) {
    const url = (output as { url: unknown }).url;
    return typeof url === "function" ? String((url as () => unknown)()) : String(url);
  }
  throw new Error("Replicate CodeFormer returned unexpected output shape");
}
