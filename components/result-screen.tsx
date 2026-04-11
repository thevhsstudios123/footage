"use client";

import { useEffect, useState } from "react";

export type ResultScreenState =
  | { kind: "loading" }
  | { kind: "done"; videoUrl: string }
  | { kind: "error"; message: string };

export interface ResultScreenProps {
  state: ResultScreenState;
  onStartOver: () => void;
  onRetry: () => void;
}

const LOADING_MESSAGES = [
  "Protecting your face... 🛡️",
  "Generating aerial footage... 🚁",
  "Adding cinematic touches... 🎬",
  "Almost ready... ✨",
];

export default function ResultScreen({
  state,
  onStartOver,
  onRetry,
}: ResultScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (state.kind !== "loading") return;
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, [state.kind]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-between px-5 pb-10 pt-8 sm:max-w-lg">
      {state.kind === "loading" && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-brand-accent/20" />
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-brand-accent text-2xl text-white">
              🚁
            </div>
          </div>
          <div
            className="mt-8 text-center text-base font-medium text-gray-700"
            aria-live="polite"
          >
            {LOADING_MESSAGES[messageIndex]}
          </div>
          <div className="mt-2 text-center text-xs text-gray-400">
            This usually takes 1–3 minutes.
          </div>
        </div>
      )}

      {state.kind === "done" && (
        <div className="flex w-full flex-1 flex-col items-center">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Your cinematic drone shot
          </h2>
          <div className="mt-5 w-full overflow-hidden rounded-2xl bg-black">
            <video
              src={state.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="block h-auto w-full"
            />
          </div>
          <div className="mt-6 flex w-full flex-col gap-3">
            <a
              href={state.videoUrl}
              download="skysnap.mp4"
              className="w-full rounded-xl bg-brand-accent px-5 py-3 text-center text-sm font-semibold text-white shadow-sm"
            >
              Download MP4
            </a>
            <button
              type="button"
              onClick={onStartOver}
              className="w-full rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <div className="text-4xl" aria-hidden>
            😕
          </div>
          <div className="mt-4 text-center text-base font-medium">
            Something went wrong. Please try again.
          </div>
          <div className="mt-1 text-center text-xs text-gray-400">
            {state.message}
          </div>
          <div className="mt-6 flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-xl bg-brand-accent px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={onStartOver}
              className="w-full rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        Photos deleted automatically after 1 hour
      </p>
    </div>
  );
}
