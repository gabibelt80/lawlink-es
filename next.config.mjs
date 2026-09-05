/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  reactStrictMode: false,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  typedRoutes: false,
  allowedDevOrigins: ["127.0.0.1", "192.168.0.136"],
  serverExternalPackages: ["@napi-rs/canvas", "unpdf"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb"
    }
  }
};

export default nextConfig;