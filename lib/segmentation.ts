/**
 * Client-side subject segmentation using RMBG-1.4 from HuggingFace.
 * Produces an alpha matte where subject = opaque, background = transparent.
 *
 * We load @huggingface/transformers from the jsDelivr CDN at runtime with a
 * `webpackIgnore` comment so webpack never bundles it — this avoids pulling
 * in the `onnxruntime-node` native addon into the client chunk. The ONNX
 * model weights themselves are fetched from the HuggingFace hub on first use.
 */

type RemoveBackgroundPipeline = (
  image: string | HTMLImageElement | ImageData
) => Promise<Array<{ mask: { data: Uint8ClampedArray; width: number; height: number } }>>;

interface TransformersModule {
  pipeline: (
    task: string,
    model: string,
    opts?: Record<string, unknown>
  ) => Promise<RemoveBackgroundPipeline>;
  env: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
  };
}

const TRANSFORMERS_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@huggingface/[email protected]";

let segmenter: RemoveBackgroundPipeline | null = null;
let loadingPromise: Promise<RemoveBackgroundPipeline> | null = null;

async function loadTransformers(): Promise<TransformersModule> {
  // The webpackIgnore magic comment prevents webpack from attempting to
  // bundle this dynamic import — it's loaded as a raw ESM fetch at runtime.
  const mod = (await import(
    /* webpackIgnore: true */ TRANSFORMERS_CDN_URL
  )) as TransformersModule;
  return mod;
}

export async function getSegmenter(): Promise<RemoveBackgroundPipeline> {
  if (typeof window === "undefined") {
    throw new Error("Segmentation can only run in the browser");
  }
  if (segmenter) return segmenter;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const { pipeline, env } = await loadTransformers();
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    const pipe = await pipeline("image-segmentation", "briaai/RMBG-1.4");
    segmenter = pipe;
    return pipe;
  })();

  return loadingPromise;
}

/**
 * Returns a Uint8ClampedArray of length (width * height) where each byte is
 * the alpha value of the subject at that pixel (0 = background, 255 = subject).
 */
export async function segmentSubject(
  img: HTMLImageElement
): Promise<{ alpha: Uint8ClampedArray; width: number; height: number }> {
  const pipe = await getSegmenter();

  // Convert the image to a data URL so transformers.js can load it
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");

  const result = await pipe(dataUrl);
  const mask = result[0]?.mask;
  if (!mask) throw new Error("Segmentation returned no mask");

  // If mask resolution differs from image, resize it onto a canvas
  if (mask.width === canvas.width && mask.height === canvas.height) {
    return { alpha: mask.data, width: mask.width, height: mask.height };
  }

  const tmp = document.createElement("canvas");
  tmp.width = mask.width;
  tmp.height = mask.height;
  const tctx = tmp.getContext("2d");
  if (!tctx) throw new Error("Could not get 2D context");
  const id = tctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) {
    id.data[i * 4] = 255;
    id.data[i * 4 + 1] = 255;
    id.data[i * 4 + 2] = 255;
    id.data[i * 4 + 3] = mask.data[i];
  }
  tctx.putImageData(id, 0, 0);

  const dest = document.createElement("canvas");
  dest.width = canvas.width;
  dest.height = canvas.height;
  const dctx = dest.getContext("2d");
  if (!dctx) throw new Error("Could not get 2D context");
  dctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  const out = dctx.getImageData(0, 0, canvas.width, canvas.height);

  const alpha = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = out.data[i * 4 + 3];
  return { alpha, width: canvas.width, height: canvas.height };
}
