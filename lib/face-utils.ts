import type { DetectedFace, FaceBox, FaceDetectionResult } from "@/types";

/**
 * Lazy loads face-api.js models from /public/models.
 * Must only run in the browser.
 */
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceApiModels(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("loadFaceApiModels can only run in the browser");
  }
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const faceapi = await import("face-api.js");
    const MODEL_URL = "/models";
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();
  return loadingPromise;
}

/**
 * Runs face detection on an image element and returns all detected faces with
 * bounding box, 68-point landmarks, and 128-dim descriptors.
 */
export async function detectFaces(
  img: HTMLImageElement
): Promise<FaceDetectionResult> {
  if (typeof window === "undefined") {
    throw new Error("detectFaces can only run in the browser");
  }
  await loadFaceApiModels();
  const faceapi = await import("face-api.js");

  const detections = await faceapi
    .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  const faces: DetectedFace[] = detections.map((d) => {
    const box = d.detection.box;
    const landmarks: number[] = [];
    for (const pt of d.landmarks.positions) {
      landmarks.push(pt.x, pt.y);
    }
    return {
      box: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
      landmarks,
      descriptor: Array.from(d.descriptor),
      score: d.detection.score,
    };
  });

  return {
    faces,
    imageWidth: img.naturalWidth || img.width,
    imageHeight: img.naturalHeight || img.height,
  };
}

/**
 * Expands a tight face bounding box outward by `padRatio` on each side, so that
 * the protected region includes hair, ears, and neck — not just the forehead
 * to chin crop that face-api.js returns.
 */
export function padFaceBox(
  box: FaceBox,
  imageWidth: number,
  imageHeight: number,
  padRatio = 0.35
): FaceBox {
  const padX = box.width * padRatio;
  const padY = box.height * padRatio;
  const x = Math.max(0, Math.round(box.x - padX));
  const y = Math.max(0, Math.round(box.y - padY * 1.5)); // extra top pad for hair
  const right = Math.min(imageWidth, Math.round(box.x + box.width + padX));
  const bottom = Math.min(imageHeight, Math.round(box.y + box.height + padY));
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

/**
 * Euclidean distance between two 128-dim face descriptors.
 * face-api.js convention: < 0.6 = same person, < 0.4 = very high confidence.
 */
export function faceDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Draws the face detection overlay (green boxes + landmarks) on top of an image.
 * Used by the FaceDetector component for visual feedback.
 */
export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  faces: DetectedFace[]
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(img, 0, 0, w, h);

  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = Math.max(3, Math.round(w / 400));
  ctx.fillStyle = "rgba(34, 197, 94, 0.15)";

  for (const face of faces) {
    const padded = padFaceBox(face.box, w, h, 0.25);
    ctx.fillRect(padded.x, padded.y, padded.width, padded.height);
    ctx.strokeRect(padded.x, padded.y, padded.width, padded.height);

    // Draw landmarks as small dots
    ctx.fillStyle = "#22c55e";
    for (let i = 0; i < face.landmarks.length; i += 2) {
      const x = face.landmarks[i];
      const y = face.landmarks[i + 1];
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, w / 500), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
  }
}

/**
 * Builds a protected-region PNG mask from detected faces + (optional) subject
 * alpha matte. White pixels = protect (don't animate). Transparent = animate.
 *
 * The mask is constructed at the original image resolution and returned as a
 * base64-encoded PNG, ready to be sent to Kling's `static_mask` parameter.
 */
export async function buildProtectedMask(
  imageWidth: number,
  imageHeight: number,
  faces: DetectedFace[],
  subjectAlpha?: Uint8ClampedArray
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("buildProtectedMask must run in the browser");
  }

  const canvas = document.createElement("canvas");
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  // Start fully transparent
  ctx.clearRect(0, 0, imageWidth, imageHeight);

  // Layer 1: subject matte (if provided) — covers the whole person softly
  if (subjectAlpha && subjectAlpha.length === imageWidth * imageHeight) {
    const imageData = ctx.createImageData(imageWidth, imageHeight);
    for (let i = 0; i < subjectAlpha.length; i++) {
      const a = subjectAlpha[i];
      imageData.data[i * 4] = 255;
      imageData.data[i * 4 + 1] = 255;
      imageData.data[i * 4 + 2] = 255;
      imageData.data[i * 4 + 3] = a;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Layer 2: face regions — always fully opaque white so faces are hard-protected
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  for (const face of faces) {
    const padded = padFaceBox(face.box, imageWidth, imageHeight, 0.4);
    // Fill as rounded rectangle for a softer edge
    const r = Math.min(padded.width, padded.height) * 0.15;
    roundRect(ctx, padded.x, padded.y, padded.width, padded.height, r);
    ctx.fill();
  }

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Loads an image from a URL or blob into an HTMLImageElement.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
