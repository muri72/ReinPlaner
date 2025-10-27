/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['example.com'],
    formats: {
      image: [
        {
          url: '/_next/image',
          loader: 'custom',
          loaderFile: './lib/image-loader.js',
        },
      ],
    },
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
  // Mobile-specific optimizations
  mobile: {
    friendly: true,
  },
};

module.exports = nextConfig;