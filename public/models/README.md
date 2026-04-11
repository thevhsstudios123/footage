# face-api.js model weights

These files back the client-side `ssdMobilenetv1` face detector used by
`components/upload-screen.tsx`. They are loaded from `/models` at runtime via
`faceapi.nets.ssdMobilenetv1.loadFromUri("/models")`.

Files:

- `ssd_mobilenetv1_model-weights_manifest.json`
- `ssd_mobilenetv1_model-shard1`
- `ssd_mobilenetv1_model-shard2`

Source: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

License: MIT (same as face-api.js).

If you ever need to re-download them:

```
curl -LO https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json
curl -LO https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1
curl -LO https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard2
```
