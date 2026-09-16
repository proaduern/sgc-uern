/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Standalone container build for zero lock-in deployment (Docker on UERN servers or Vercel)
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

export default nextConfig;
