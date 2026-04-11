# SkySnap MVP

Upload a photo → pick a drone shot style → get back a cinematic drone-style
video. Face preservation is the number one priority.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) for
  **client-side** face detection (the raw detection data never leaves the
  browser — only the bounding box coordinates are sent to our API)
- [Kling AI](https://klingai.com/) image-to-video API
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for temporary
  file storage
- Vercel for deployment

No auth. No payments. No database. Just the core flow.

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in KLING_API_KEY, KLING_API_SECRET, BLOB_READ_WRITE_TOKEN
npm run dev
```

Then open http://localhost:3000.

## Environment variables

```
KLING_API_KEY=
KLING_API_SECRET=
BLOB_READ_WRITE_TOKEN=
```

## Flow

`app/page.tsx` is a 4-state machine: `upload → style → generating → result`.

1. **Upload** (`components/upload-screen.tsx`)
   - User picks / drops a JPG or PNG (max 10 MB)
   - face-api.js `ssdMobilenetv1` runs **in the browser**
   - A green box is drawn over any detected face so the user can see it working
2. **Style** (`components/style-screen.tsx`)
   - 2×2 grid (mobile) / row (desktop) of 4 drone styles
   - "Generate My Video" is disabled until a style is selected
3. **Generating / Result** (`components/result-screen.tsx`)
   - Cycles through progress messages every 3s while the API is working
   - Shows the video (autoplay / muted / loop) on success
   - Shows a friendly error + "Try Again" on failure

## API route

`POST /api/generate` (`app/api/generate/route.ts`):

1. Decodes the base-64 image and uploads it to Vercel Blob
2. Builds the Kling request body from the style preset + hard-coded negative
   prompt
3. If a face bounding box was supplied, generates a `static_mask` PNG
   (white rectangle on black canvas sized to match the face position) and
   passes it to Kling to help preserve the face
4. Creates the task, polls `image2video/{task_id}` every 3 s, gives up after
   3 minutes
5. Re-hosts the resulting video on Vercel Blob and returns its URL

## Face-api.js model weights

The `ssdMobilenetv1` weights live under `public/models/`. They are checked in
so the app works on a fresh clone. See `public/models/README.md` for the
source URLs if they ever need to be regenerated.
