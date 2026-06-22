/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' is for the Docker image (CMD runs server.js). On Netlify/Vercel
  // the platform's own Next runtime handles output, so leave it default there.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};
module.exports = nextConfig;
