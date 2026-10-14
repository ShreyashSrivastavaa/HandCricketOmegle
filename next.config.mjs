/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@tensorflow/tfjs", "nsfwjs"],
};

export default nextConfig;
