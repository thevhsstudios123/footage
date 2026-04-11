import type { StylePreset } from "@/types";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "golden-hour-pullback",
    emoji: "🌅",
    name: "Golden Hour Pullback",
    tagline: "Epic sunset pullback",
    prompt:
      "Smooth cinematic drone pullback shot rising into the sky, golden hour warm lighting, sun flare, wide aerial view expanding around the subject, epic landscape reveal",
    cameraMotion: "pull back + rise",
    thumbnail: "/thumbnails/golden-hour.jpg",
  },
  {
    id: "city-flyover",
    emoji: "🌆",
    name: "City Flyover",
    tagline: "Urban blue hour",
    prompt:
      "Cinematic FPV drone flyover urban cityscape, blue hour lighting, city lights below, smooth forward motion, skyscrapers in background, cinematic color grade",
    cameraMotion: "forward + slight rise",
    thumbnail: "/thumbnails/city-flyover.jpg",
  },
  {
    id: "beach-reveal",
    emoji: "🏝️",
    name: "Beach Reveal",
    tagline: "Tropical paradise",
    prompt:
      "Aerial drone reveal shot over ocean beach, turquoise water, white sand, camera tilts down from horizon to subject, tropical paradise, cinematic",
    cameraMotion: "tilt down + push in",
    thumbnail: "/thumbnails/beach-reveal.jpg",
  },
  {
    id: "mountain-sweep",
    emoji: "🏔️",
    name: "Mountain Sweep",
    tagline: "360° summit orbit",
    prompt:
      "Epic mountain landscape drone orbit shot, snow-capped peaks, dramatic clouds, 360 degree sweep around subject, golden light, cinematic scale",
    cameraMotion: "orbit",
    thumbnail: "/thumbnails/mountain-sweep.jpg",
  },
  {
    id: "twilight-orbit",
    emoji: "🌃",
    name: "Twilight Orbit",
    tagline: "Dreamy dusk rotation",
    prompt:
      "Smooth drone orbit shot at twilight, purple and orange sky gradient, stars beginning to appear, slow rotation around subject, dreamy cinematic atmosphere",
    cameraMotion: "slow orbit",
    thumbnail: "/thumbnails/twilight-orbit.jpg",
  },
  {
    id: "forest-canopy-rise",
    emoji: "🌲",
    name: "Forest Canopy Rise",
    tagline: "God rays + greenery",
    prompt:
      "Drone rising through forest canopy, sunlight breaking through leaves, god rays, smooth vertical ascent, lush green nature, cinematic",
    cameraMotion: "vertical rise",
    thumbnail: "/thumbnails/forest-canopy.jpg",
  },
  {
    id: "desert-dunes",
    emoji: "🏜️",
    name: "Desert Dunes",
    tagline: "Sahara golden sweep",
    prompt:
      "Cinematic drone shot over endless desert sand dunes, warm golden light, long shadows, slow camera push toward subject, epic scale, cinematic grade",
    cameraMotion: "push in + sweep",
    thumbnail: "/thumbnails/desert-dunes.jpg",
    creatorOnly: true,
  },
  {
    id: "neon-nightscape",
    emoji: "🌆",
    name: "Neon Nightscape",
    tagline: "Cyberpunk flyover",
    prompt:
      "Cinematic drone orbit through neon-lit futuristic city at night, rain-slicked streets, reflective surfaces, cyberpunk color palette, cinematic",
    cameraMotion: "orbit + dive",
    thumbnail: "/thumbnails/neon-nightscape.jpg",
    creatorOnly: true,
  },
  {
    id: "arctic-flyover",
    emoji: "🧊",
    name: "Arctic Flyover",
    tagline: "Frozen wilderness",
    prompt:
      "Aerial drone flyover arctic ice fields, icebergs, deep blue water, cold daylight, slow cinematic camera push, epic scale",
    cameraMotion: "forward + rise",
    thumbnail: "/thumbnails/arctic-flyover.jpg",
    creatorOnly: true,
  },
  {
    id: "volcano-descent",
    emoji: "🌋",
    name: "Volcano Descent",
    tagline: "Lava + ember haze",
    prompt:
      "Cinematic drone descent toward active volcano, glowing lava, volcanic smoke and embers, dramatic red lighting, cinematic scale",
    cameraMotion: "descent + approach",
    thumbnail: "/thumbnails/volcano-descent.jpg",
    creatorOnly: true,
  },
];

export const FREE_PRESETS = STYLE_PRESETS.filter((p) => !p.creatorOnly);

export function getPresetById(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((p) => p.id === id);
}

export const NEGATIVE_PROMPT =
  "face distortion, face morphing, face warp, identity change, blurry face, different person, extra fingers, mutated hands, deformed";
