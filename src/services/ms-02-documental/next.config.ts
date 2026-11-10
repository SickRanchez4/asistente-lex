import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Salida autocontenida para la imagen de Docker.
  output: 'standalone',
  serverExternalPackages: ['pg', 'sharp', 'pdfjs-dist'],
  experimental: { proxyClientMaxBodySize: '15mb' },
  poweredByHeader: false,
};

export default nextConfig;
