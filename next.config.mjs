/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Standalone container build for zero lock-in deployment (Docker on UERN servers or Vercel)
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
