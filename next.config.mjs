/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@tensorflow/tfjs", "nsfwjs", "@mediapipe/tasks-vision"],
};

export default nextConfig;
