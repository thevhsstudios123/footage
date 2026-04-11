# SkySnap

Turn any photo into cinematic drone footage — without ever touching the
subject's face.

## What this is

SkySnap is a mobile-first Next.js 14 app that takes a user's photo, detects
every face in the browser with `face-api.js`, segments the subject out of the
background with RMBG-1.4 (`@huggingface/transformers`), builds a hard
protected-region mask, and then calls Kling AI's image-to-video endpoint with
the mask as `static_mask` so the face is never animated. Generated key frames
are optionally passed through CodeFormer (via Replicate) for face restoration,
and every frame is sanity-checked against the original face descriptor so we
can surface a "Face preservation" score to the user.

## Face preservation pipeline

The entire app is built around one guarantee: **the user's face is never
altered**. Every design decision serves that rule.

1. **Client-side face detection** — `face-api.js` + `ssdMobilenetv1` runs in
   the browser the moment a photo is uploaded. We extract the bounding box,
   68-point landmarks, and the 128-dim descriptor for each face.
2. **Subject segmentation** — RMBG-1.4 runs in-browser via WebAssembly to
   separate the person from the background as an alpha matte.
3. **Protected-region mask** — The face bounding boxes (padded outward by 40%)
   are burned into an all-white PNG on top of the subject matte. This PNG is
   sent to Kling as `static_mask`, so the animator is instructed to leave
   those pixels alone.
4. **Kling image-to-video** — Style preset → prompt, strong negative prompt
   targeting face distortion, `cfg_scale: 0.5`, `mode: std`, polled every 3s
   with a 3-minute timeout.
5. **Face restoration** — Three key frames are extracted server-side with
   `fluent-ffmpeg` and run through `sczhou/codeformer` on Replicate with
   `fidelity_weight: 0.7` as a safety net.
6. **Frame-by-frame verification** — A confidence score is computed and shown
   to the user in the UI as "Face preservation: Excellent/Good/Fair/Poor".

## Getting started

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill in Kling, Replicate, Clerk, Stripe, and Vercel Blob keys

# 3. Download face-api.js models into public/models
#    You need these files from https://github.com/justadudewhohacks/face-api.js-models
#      - ssd_mobilenetv1_model-shard1
#      - ssd_mobilenetv1_model-weights_manifest.json
#      - face_landmark_68_model-shard1
#      - face_landmark_68_model-weights_manifest.json
#      - face_recognition_model-shard1
#      - face_recognition_model-shard2
#      - face_recognition_model-weights_manifest.json

# 4. Run
npm run dev
```

Open http://localhost:3000 and upload a photo. Face detection runs
immediately in the browser with a green-box overlay. Once you pick a style
and hit Generate, the full pipeline kicks off.

## Project structure

```
.
├── app/
│   ├── page.tsx                  # Landing page
│   ├── dashboard/page.tsx        # Main app after login
│   ├── layout.tsx                # Root layout (Clerk + fonts)
│   ├── globals.css               # Tailwind + design tokens
│   └── api/
│       ├── upload/route.ts       # POST photo -> Vercel Blob
│       ├── generate/route.ts     # POST {image, mask, preset} -> Kling
│       ├── restore-face/route.ts # POST videoUrl -> CodeFormer on key frames
│       └── webhook/stripe/route.ts
├── components/
│   ├── upload-zone.tsx
│   ├── face-detector.tsx         # Loads models + draws overlay
│   ├── style-picker.tsx
│   ├── generation-status.tsx
│   ├── video-player.tsx
│   ├── pricing-modal.tsx
│   ├── usage-counter.tsx
│   └── ui/                       # shadcn primitives
├── lib/
│   ├── face-utils.ts             # Detection, mask building, distance
│   ├── segmentation.ts           # RMBG-1.4 wrapper
│   ├── kling.ts                  # Kling API + JWT auth
│   ├── replicate.ts              # CodeFormer wrapper
│   ├── stripe.ts
│   ├── usage.ts
│   ├── plans.ts
│   ├── style-presets.ts
│   ├── logger.ts
│   └── utils.ts
├── types/
│   └── index.ts
└── middleware.ts                 # Clerk route protection
```

## Privacy

- The user's original photo is uploaded to Vercel Blob under
  `ephemeral/<userId>/...` and should be cleaned up within one hour. Wire a
  cron job to `vercel blob list` + `vercel blob del` or a scheduled Edge
  Function.
- Generated videos are stored for 24 hours then auto-deleted.
- We never log the image bytes. Only a 16-char SHA-256 prefix as `imageHash`.
