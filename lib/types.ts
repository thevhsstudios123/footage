export type StyleId = "golden-hour" | "city" | "beach" | "mountain";

export interface FaceBoundingBox {
  /** X coordinate (px) of the top-left of the face, in the image's natural pixel space. */
  x: number;
  /** Y coordinate (px) of the top-left of the face, in the image's natural pixel space. */
  y: number;
  /** Face width in pixels (natural). */
  width: number;
  /** Face height in pixels (natural). */
  height: number;
  /** Natural width of the source image in pixels. */
  imageWidth: number;
  /** Natural height of the source image in pixels. */
  imageHeight: number;
}

export interface StyleOption {
  id: StyleId;
  emoji: string;
  name: string;
  short: string;
  prompt: string;
}

export const STYLES: StyleOption[] = [
  {
    id: "golden-hour",
    emoji: "🌅",
    name: "Golden Hour",
    short: "Warm sunset pullback with an epic landscape reveal.",
    prompt:
      "Cinematic drone pullback at sunset, warm golden light, sky expanding behind subject, epic landscape reveal, smooth camera rise",
  },
  {
    id: "city",
    emoji: "🌆",
    name: "City Flyover",
    short: "FPV drone rushing over a glowing blue-hour skyline.",
    prompt:
      "FPV drone flying over city at blue hour, city lights, smooth forward motion, urban skyline, cinematic",
  },
  {
    id: "beach",
    emoji: "🏝️",
    name: "Beach Reveal",
    short: "Tropical aerial, turquoise water, tilting down to the subject.",
    prompt:
      "Aerial drone over tropical beach, turquoise ocean, camera tilting down to reveal subject, paradise vibes",
  },
  {
    id: "mountain",
    emoji: "🏔️",
    name: "Mountain Sweep",
    short: "Slow orbit around dramatic snow peaks and sky.",
    prompt:
      "Epic drone orbit around mountain landscape, snow peaks, dramatic sky, slow 360 sweep, cinematic scale",
  },
];

export const NEGATIVE_PROMPT =
  "face distortion, face morphing, face warp, identity change, blurry face, different person, ugly, deformed";

export interface GenerateRequestBody {
  imageBase64: string;
  faceBoundingBox: FaceBoundingBox | null;
  style: StyleId;
}

export interface GenerateResponseBody {
  videoUrl: string;
}

export interface GenerateErrorBody {
  error: string;
}
