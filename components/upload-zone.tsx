"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Image as ImageIcon, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelected: (file: File, previewUrl: string) => void;
  disabled?: boolean;
}

export function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) return;
      const previewUrl = URL.createObjectURL(file);
      onFileSelected(file, previewUrl);
    },
    [onFileSelected]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 p-8 text-center transition-all hover:border-primary/60 hover:bg-card",
        isDragging && "border-primary bg-primary/5 scale-[1.01]",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary group-hover:scale-110 transition-transform">
        <Upload className="h-6 w-6" />
      </div>
      <div>
        <p className="text-base font-semibold">Drop a photo or tap to upload</p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG, HEIC · up to 15MB · your face stays protected
        </p>
      </div>
      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5" /> Gallery
        </span>
        <span className="inline-flex items-center gap-1">
          <Camera className="h-3.5 w-3.5" /> Camera
        </span>
      </div>
    </div>
  );
}
