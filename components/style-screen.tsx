"use client";

import { useState } from "react";
import { STYLES, type StyleId } from "@/lib/types";

export interface StyleScreenProps {
  onBack: () => void;
  onNext: (style: StyleId) => void;
}

export default function StyleScreen({ onBack, onNext }: StyleScreenProps) {
  const [selected, setSelected] = useState<StyleId | null>(null);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-8 sm:max-w-2xl">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-gray-200 p-2 text-gray-500"
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M12.78 4.22a.75.75 0 0 1 0 1.06L8.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06l-5.25-5.25a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Pick your style
          </h2>
          <p className="text-xs text-gray-500">
            Choose the drone shot you want generated.
          </p>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        {STYLES.map((style) => {
          const isSelected = selected === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => setSelected(style.id)}
              className={`flex h-full flex-col items-start rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? "border-brand-accent bg-indigo-50 ring-2 ring-brand-accent"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
              aria-pressed={isSelected}
            >
              <div className="text-3xl" aria-hidden>
                {style.emoji}
              </div>
              <div className="mt-2 text-sm font-semibold">{style.name}</div>
              <div className="mt-1 text-xs text-gray-500">{style.short}</div>
            </button>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-md sm:max-w-2xl">
          <button
            type="button"
            onClick={() => {
              if (selected) onNext(selected);
            }}
            disabled={!selected}
            className="w-full rounded-xl bg-brand-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Generate My Video
          </button>
        </div>
      </div>
    </div>
  );
}
