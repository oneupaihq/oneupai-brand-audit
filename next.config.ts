import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite is only used for local development and tests (DATABASE_URL=pglite:...).
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
