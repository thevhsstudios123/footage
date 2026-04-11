# face-api.js models

This directory is served at `/models` and is where `face-api.js` looks for the
pretrained weights the client needs. You need to place the following files
here before face detection will work at runtime:

- `ssd_mobilenetv1_model-weights_manifest.json`
- `ssd_mobilenetv1_model-shard1`
- `ssd_mobilenetv1_model-shard2`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

Download them from:
https://github.com/justadudewhohacks/face-api.js-models

Or pull just the three models we use:

```bash
cd public/models
BASE=https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master

for f in \
  ssd_mobilenetv1/ssd_mobilenetv1_model-weights_manifest.json \
  ssd_mobilenetv1/ssd_mobilenetv1_model-shard1 \
  ssd_mobilenetv1/ssd_mobilenetv1_model-shard2 \
  face_landmark_68/face_landmark_68_model-weights_manifest.json \
  face_landmark_68/face_landmark_68_model-shard1 \
  face_recognition/face_recognition_model-weights_manifest.json \
  face_recognition/face_recognition_model-shard1 \
  face_recognition/face_recognition_model-shard2; do
  curl -sSL -o "$(basename "$f")" "$BASE/$f"
done
```

These model files are ~10MB total. Face detection runs entirely in the
browser — the photo never leaves the user's device until after face
protection is complete.
