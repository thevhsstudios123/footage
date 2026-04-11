/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "*.replicate.delivery" },
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    // @huggingface/transformers pulls in the node-only onnxruntime-node
    // backend by default. We only want the WASM/browser path on the client,
    // so alias the node backend to false and ignore .node binaries.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "onnxruntime-node$": false,
    };

    // Don't try to parse native .node addons as JavaScript.
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.node$/,
      loader: "ignore-loader",
    });

    // Also strip any leftover requires that webpack picks up from the
    // transformers dynamic backend loader.
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^onnxruntime-node$/,
      })
    );

    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      "fluent-ffmpeg",
      "@huggingface/transformers",
      "onnxruntime-node",
    ],
  },
};

export default nextConfig;
