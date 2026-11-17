/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', 'sharp', 'archiver'],
  experimental: {
    serverActions: { bodySizeLimit: '8mb' },
  },
};
export default nextConfig;
