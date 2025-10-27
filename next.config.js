/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com', // Ersetzen Sie dies durch Ihre tatsächliche Domain
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  webpack: (config, { isServer }) => {
    // Optimize for mobile
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroup: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },
  // PWA configuration
  async rewrites() {
    return [
      {
        source: '/manifest.json',
        destination: '/manifest.json',
      },
    ];
  },
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
};

module.exports = nextConfig;