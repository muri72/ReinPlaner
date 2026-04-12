/** @type {import('next').NextConfig} */
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // ============================================
  // IMAGE OPTIMIZATION
  // ============================================
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'svuwldxhgifuctfehfao.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // ============================================
  // OUTPUT CONFIGURATION
  // ============================================
  // Standalone output for Docker deployments (NOT used with Turbopack in dev)
  // Builds a minimal self-contained Next.js server for production Docker images
  output: process.env.NODE_ENV === 'production' && process.env.DOCKER_BUILD === 'true'
    ? 'standalone'
    : undefined,

  // ============================================
  // SERVER EXTERNAL PACKAGES
  // ============================================
  serverExternalPackages: ['@supabase/supabase-js', '@supabase/ssr'],

  // ============================================
  // SECURITY HEADERS
  // ============================================
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000' },
        ],
      },
    ];
  },

  // ============================================
  // WEBPACK OPTIMIZATION
  // ============================================
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // OPTIMIZE BUNDLE SPLITTING
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom|react-is)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            chunks: 'all',
            priority: 25,
          },
          ui: {
            name: 'ui',
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            chunks: 'all',
            priority: 20,
          },
          icons: {
            name: 'icons',
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            chunks: 'all',
            priority: 20,
          },
          recharts: {
            name: 'recharts',
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            chunks: 'all',
            priority: 20,
          },
          vendor: {
            name: 'vendors',
            test: /[\\/]node_modules[\\/]/,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };

      config.optimization.concatenateModules = true;
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      config.module.rules.push({
        test: /\.md$/,
        use: 'ignore-loader',
      });
    }

    if (isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-is)[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            supabase: {
              name: 'supabase',
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              chunks: 'all',
              priority: 25,
            },
          },
        },
      };

      config.experiments = {
        ...config.experiments,
        topLevelAwait: true,
      };
    }

    return {
      ...config,
      treeshake: {
        ...config.treeshake,
        removeDebugLogging: true,
      },
      automaticVercelMonitors: true,
    };
  },

  // ============================================
  // REDIRECTS & REWRITES
  // ============================================
  async redirects() {
    return [
      { source: '/', destination: '/dashboard', permanent: true },
    ];
  },

  async rewrites() {
    return [
      { source: '/manifest.json', destination: '/manifest.json' },
    ];
  },

  // ============================================
  // BASE PERFORMANCE SETTINGS
  // ============================================
  poweredByHeader: false,
  compress: true,
  generateEtags: false,

  // ============================================
  // EXPERIMENTAL FEATURES
  // ============================================
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'recharts',
      'date-fns',
      'jspdf',
      'html2canvas',
    ],
  },

  // ============================================
  // COMPILER OPTIMIZATIONS
  // ============================================
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    reactRemoveProperties: process.env.NODE_ENV === 'production',
    styledComponents: true,
  },
};

// ============================================
// SENTRY WEBPACK PLUGIN CONFIGURATION
// ============================================
const sentryWebpackPluginOptions = {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
