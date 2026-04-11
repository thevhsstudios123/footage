"use client";

import { Lock } from "lucide-react";
import { STYLE_PRESETS } from "@/lib/style-presets";
import type { StylePreset, StylePresetId, Plan } from "@/types";
import { cn } from "@/lib/utils";

interface StylePickerProps {
  selectedId: StylePresetId | null;
  onSelect: (id: StylePresetId) => void;
  plan: Plan;
  onLockedClick?: () => void;
}

export function StylePicker({
  selectedId,
  onSelect,
  plan,
  onLockedClick,
}: StylePickerProps) {
  return (
    <div className="w-full">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Pick a style</h2>
        <p className="text-xs text-muted-foreground">Swipe to browse</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none">
        <div className="flex min-w-max gap-3 pb-2">
          {STYLE_PRESETS.map((preset) => (
            <StyleCard
              key={preset.id}
              preset={preset}
              selected={preset.id === selectedId}
              locked={!!preset.creatorOnly && plan !== "creator"}
              onClick={() => {
                if (preset.creatorOnly && plan !== "creator") {
                  onLockedClick?.();
                  return;
                }
                onSelect(preset.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface StyleCardProps {
  preset: StylePreset;
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}

function StyleCard({ preset, selected, locked, onClick }: StyleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-32 w-36 flex-shrink-0 flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left transition-all",
        "bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-indigo-500/20",
        selected
          ? "border-primary ring-2 ring-primary/60 scale-[1.02]"
          : "border-border hover:border-primary/50",
        locked && "opacity-60"
      )}
      aria-pressed={selected}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
      <div className="relative text-2xl">{preset.emoji}</div>
      <div className="relative">
        <p className="text-sm font-semibold leading-tight">{preset.name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {preset.tagline}
        </p>
      </div>
      {locked && (
        <div className="absolute right-2 top-2 rounded-full bg-black/60 p-1 backdrop-blur">
          <Lock className="h-3 w-3 text-white/90" />
        </div>
      )}
    </button>
  );
}
