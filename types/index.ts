export type Plan = "free" | "pro" | "creator";

export type StylePresetId =
  | "golden-hour-pullback"
  | "city-flyover"
  | "beach-reveal"
  | "mountain-sweep"
  | "twilight-orbit"
  | "forest-canopy-rise"
  // Creator-only:
  | "desert-dunes"
  | "neon-nightscape"
  | "arctic-flyover"
  | "volcano-descent";

export interface StylePreset {
  id: StylePresetId;
  emoji: string;
  name: string;
  tagline: string;
  prompt: string;
  cameraMotion: string;
  thumbnail: string;
  creatorOnly?: boolean;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedFace {
  box: FaceBox;
  /** 68-point facial landmarks as flat [x0,y0,x1,y1,...] array */
  landmarks: number[];
  /** 128-dim face descriptor for identity comparison */
  descriptor: number[];
  /** Detector confidence 0..1 */
  score: number;
}

export interface FaceDetectionResult {
  faces: DetectedFace[];
  imageWidth: number;
  imageHeight: number;
}

export type GenerationStatus =
  | "idle"
  | "detecting-face"
  | "building-mask"
  | "uploading"
  | "queued"
  | "generating"
  | "restoring-face"
  | "verifying"
  | "complete"
  | "failed";

export interface GenerationJob {
  id: string;
  userId: string;
  status: GenerationStatus;
  imageUrl: string;
  maskUrl?: string;
  videoUrl?: string;
  preset: StylePresetId;
  faceCount: number;
  preservationScore?: number;
  createdAt: number;
  error?: string;
}

export interface KlingTaskResponse {
  code: number;
  message: string;
  data: {
    task_id: string;
    task_status: "submitted" | "processing" | "succeed" | "failed";
    task_status_msg?: string;
    task_info?: {
      external_task_id?: string;
    };
    task_result?: {
      videos: Array<{
        id: string;
        url: string;
        duration: string;
      }>;
    };
    created_at: number;
    updated_at: number;
  };
}

export interface FacePreservationReport {
  /** 0..1 — higher is better */
  score: number;
  label: "Excellent" | "Good" | "Fair" | "Poor";
  perFrameDistances: number[];
  worstDistance: number;
}

export interface PlanLimits {
  generationsPerMonth: number;
  watermark: boolean;
  maxDurationSec: number;
  quality: "standard" | "hd" | "4k";
  priorityQueue: boolean;
  exclusiveStyles: boolean;
}
