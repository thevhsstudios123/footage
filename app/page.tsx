"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UploadScreen from "@/components/upload-screen";
import StyleScreen from "@/components/style-screen";
import ResultScreen, {
  type ResultScreenState,
} from "@/components/result-screen";
import type {
  FaceBoundingBox,
  GenerateErrorBody,
  GenerateRequestBody,
  GenerateResponseBody,
  StyleId,
} from "@/lib/types";

type Step = "upload" | "style" | "generating" | "result";

interface UploadedPhoto {
  imageBase64: string;
  faceBoundingBox: FaceBoundingBox | null;
}

export default function Page() {
  const [step, setStep] = useState<Step>("upload");
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [style, setStyle] = useState<StyleId | null>(null);
  const [result, setResult] = useState<ResultScreenState>({ kind: "loading" });

  // Guard against double-firing generate() in StrictMode dev.
  const generatingRef = useRef(false);

  const generate = useCallback(
    async (current: UploadedPhoto, currentStyle: StyleId) => {
      if (generatingRef.current) return;
      generatingRef.current = true;
      setResult({ kind: "loading" });
      try {
        const body: GenerateRequestBody = {
          imageBase64: current.imageBase64,
          faceBoundingBox: current.faceBoundingBox,
          style: currentStyle,
        };
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => null)) as
            | GenerateErrorBody
            | null;
          throw new Error(errBody?.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as GenerateResponseBody;
        setResult({ kind: "done", videoUrl: data.videoUrl });
      } catch (e) {
        setResult({
          kind: "error",
          message:
            e instanceof Error ? e.message : "Unexpected error — try again.",
        });
      } finally {
        generatingRef.current = false;
      }
    },
    [],
  );

  // Kick off generation when we enter the generating step.
  useEffect(() => {
    if (step !== "generating") return;
    if (!photo || !style) {
      setStep("upload");
      return;
    }
    void generate(photo, style).then(() => setStep("result"));
  }, [step, photo, style, generate]);

  const resetAll = () => {
    setPhoto(null);
    setStyle(null);
    setResult({ kind: "loading" });
    setStep("upload");
  };

  if (step === "upload") {
    return (
      <UploadScreen
        onNext={(payload) => {
          setPhoto(payload);
          setStep("style");
        }}
      />
    );
  }

  if (step === "style") {
    return (
      <StyleScreen
        onBack={() => setStep("upload")}
        onNext={(chosen) => {
          setStyle(chosen);
          setStep("generating");
        }}
      />
    );
  }

  // generating + result share the same component; generating shows loading state.
  return (
    <ResultScreen
      state={step === "generating" ? { kind: "loading" } : result}
      onStartOver={resetAll}
      onRetry={() => {
        if (photo && style) {
          setStep("generating");
        } else {
          resetAll();
        }
      }}
    />
  );
}
