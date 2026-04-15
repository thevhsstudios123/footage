# SkySnap MVP — Complete Setup Guide

End-to-end instructions to get SkySnap running locally. No steps skipped.

---

## 1. Prerequisites

- **Node.js 18.17+** (Next.js 14 requires it). Check with `node --version`. If missing, install from <https://nodejs.org/> or via `nvm`.
- **Git** installed.
- A browser.

## 2. Clone the repo

```bash
git clone https://github.com/thevhsstudios123/footage.git
cd footage
git checkout claude/skysnap-mvp-app-VmF0f
```

## 3. Install dependencies

```bash
npm install
```

This installs Next.js, Tailwind, face-api.js, jose, and @vercel/blob.

## 4. Get a Kling AI API key + secret

SkySnap uses Kling's image-to-video API. You need an **AccessKey** and **SecretKey** (these become `KLING_API_KEY` and `KLING_API_SECRET`).

1. Go to <https://klingai.com/> and click **Sign up / 登录**. Sign up with email or a supported social login.
2. Verify your email / phone.
3. Once logged in, open the developer portal. Depending on which region served you, it's one of:
   - <https://klingai.com/dev-center> (global)
   - <https://app.klingai.com/global/dev-center> (alt global URL)
   - From the logged-in dashboard, look for **API** / **Developer** / **开放平台** in the top nav or sidebar.
4. In the dev center, click **Create API Key** (or **创建 API Key**). You'll get two values:
   - **AccessKey** (a long string) → this is `KLING_API_KEY`
   - **SecretKey** (another long string) → this is `KLING_API_SECRET`

   **Copy both immediately.** SecretKey is usually shown **only once**. Store it somewhere safe.
5. Make sure your account has **image-to-video credits/quota**. Free accounts sometimes come with a small trial quota; if not, you'll need to top up. Without credits, the API will return an error when SkySnap tries to generate.
6. (Optional, good to verify): Kling's API docs live at <https://docs.qingque.cn/d/home/eZQCpSfzwN4vZC6-_BU3wMfuZ> (or linked from the dev center). The endpoint SkySnap uses is:
   ```
   POST https://api.kwaikolors.com/kling/v1/videos/image2video
   GET  https://api.kwaikolors.com/kling/v1/videos/image2video/{task_id}
   ```
   If your account's API host is different (Kling has region-specific hosts like `api-singapore.klingai.com`), note it — you'll need to update `KLING_BASE_URL` in `lib/kling.ts`.

## 5. Get a Vercel Blob token

SkySnap stores the uploaded photo and the generated MP4 temporarily on Vercel Blob.

1. Go to <https://vercel.com/signup> and sign up (free Hobby tier is fine for testing).
2. Create or pick a project. Even for local dev you need a Vercel project to own the Blob store:
   - On the dashboard, click **Add New… → Project**.
   - You can connect any placeholder repo, or skip import and just use the project as a container.
3. Open the project, click the **Storage** tab → **Create Database** → **Blob**.
4. Give the store a name (e.g. `skysnap-blob`) and click **Create**.
5. Once the store exists, click **.env.local** or **Quickstart** inside the store. You'll see a value labeled **`BLOB_READ_WRITE_TOKEN`** — copy it. It looks like `vercel_blob_rw_xxxxxxxxxxxxxxxx`.

## 6. Create your `.env.local`

In the repo root:

```bash
cp .env.example .env.local
```

Now edit `.env.local` so it looks like this (paste the three values you just collected):

```env
KLING_API_KEY=your_kling_accesskey_here
KLING_API_SECRET=your_kling_secretkey_here
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxx
```

**These are the only values you need to edit.** Do **not** commit `.env.local` — it's already in `.gitignore`.

## 7. (Only if Kling gives you a different API host)

If your Kling account's API host isn't `api.kwaikolors.com`, open **`lib/kling.ts`** and change this line near the top:

```ts
const KLING_BASE_URL = "https://api.kwaikolors.com/kling/v1";
```

to whatever host the Kling dev center shows for your account (e.g. `https://api-singapore.klingai.com/v1`). Nothing else in that file needs changing.

## 8. Run the dev server

```bash
npm run dev
```

You should see:

```
▲ Next.js 14.2.15
- Local:        http://localhost:3000
✓ Ready in XXXms
```

Open <http://localhost:3000> in your browser.

## 9. Walk through the flow and verify each piece

1. **Upload screen** — drop a JPG/PNG under 10 MB (try one with a clearly visible face).
2. Within 1–3 s, you should see:
   - A preview of your photo
   - A **green rectangle** drawn over the detected face
   - The text ✅ *"Face detected — we'll keep it untouched"*
3. If it says ⚠️ *"No face detected"*, face-api.js didn't find one — either use a clearer face photo, or proceed anyway.
4. Click **Next**.
5. **Style screen** — tap one of the four cards. A purple ring appears around the selected one. Click **Generate My Video**.
6. **Loading screen** — you'll see cycling messages every 3 s (🛡️ → 🚁 → 🎬 → ✨).
7. After 1–3 minutes, the video plays back, autoplaying/muted/looping. You can **Download MP4** or **Start Over**.

## 10. Common failures and fixes

| What you see | What it means | Fix |
|---|---|---|
| "Something went wrong. Please try again." and the server log says `Kling create task failed: 401/403` | Bad AccessKey/SecretKey, or they're swapped | Re-copy both values into `.env.local` and restart `npm run dev` |
| Server log: `Kling create task failed: 429` or `"insufficient quota"` | Your Kling account has no image-to-video credits | Top up in the Kling dashboard |
| Server log: `Kling task timed out after 3 minutes` | Kling took longer than 3 min | Retry; if it keeps happening, bump the timeout in `app/api/generate/route.ts` (`timeoutMs`) |
| Server log: `BLOB_READ_WRITE_TOKEN is not set` / `403 from blob.vercel-storage.com` | Missing or invalid Vercel Blob token | Re-copy token from the Vercel Storage tab |
| Upload screen stuck on "Loading face detector…" | face-api.js couldn't load the model weights from `/models` | Make sure `public/models/ssd_mobilenetv1_model-weights_manifest.json` and the two `ssd_mobilenetv1_model-shard*` files exist. If missing, re-download per `public/models/README.md`. |
| Kling endpoint returns 404 | Your account uses a different API host | See step 7 — update `KLING_BASE_URL` in `lib/kling.ts` |

**Where to look for errors:** the terminal where `npm run dev` is running will show all server-side errors (Kling responses, Blob uploads). The browser DevTools Console will show client-side face-detection errors.

## 11. (Optional) Deploy to Vercel

Local dev has no function-timeout limit, but Vercel does:

- **Hobby (free):** 60 s max per request → **too short** for Kling's 1–3 min generation time. You'll get 504s.
- **Pro:** 300 s max → works.

If you deploy to Hobby you have two options:

1. Upgrade to Pro, **or**
2. Change the flow to return the `task_id` immediately, poll from the client instead of the server, and add a second endpoint `/api/generate/status?taskId=…`. Ask and this can be refactored.

To deploy as-is:

1. Push the branch to a GitHub repo Vercel has access to (it already is).
2. In Vercel: **Add New… → Project → Import** `thevhsstudios123/footage`.
3. Under **Environment Variables**, add the same three keys as in `.env.local`:
   - `KLING_API_KEY`
   - `KLING_API_SECRET`
   - `BLOB_READ_WRITE_TOKEN` *(Vercel will actually auto-inject this one once you attach the Blob store to the project in the Storage tab — prefer that over pasting by hand)*
4. Set the production branch to `claude/skysnap-mvp-app-VmF0f` (or merge it into `main` first and deploy from `main`).
5. Click **Deploy**.

---

## TL;DR — which files do I touch?

- **`.env.local`** — create it, paste your three keys. **This is the only file you normally need to edit.**
- **`lib/kling.ts`** — only if your Kling account's API host isn't `api.kwaikolors.com`.
- Everything else — untouched. The app is a state machine in `app/page.tsx` pulling in `components/upload-screen.tsx`, `components/style-screen.tsx`, `components/result-screen.tsx`, with `app/api/generate/route.ts` as the backend.
