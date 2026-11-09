import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Salida autocontenida para la imagen de Docker.
  output: 'standalone',
  serverExternalPackages: ['pg'],
  poweredByHeader: false,
};

export default nextConfig;
