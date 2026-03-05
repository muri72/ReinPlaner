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
  // Optimize for CDN deployment
  // Temporarily disabled due to Turbopack .nft.json issue
  // output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // ============================================
  // SERVER EXTERNAL PACKAGES
  // ============================================
  // Specify packages that should be processed server-side
  serverExternalPackages: ['@supabase/supabase-js', '@supabase/ssr'],

  // ============================================
  // SECURITY HEADERS
  // ============================================
  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Cache static assets for 1 year
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images for 30 days
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000',
          },
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
      // ============================================
      // OPTIMIZE BUNDLE SPLITTING
      // ============================================
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // React and related libraries
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom|react-is)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Supabase client libraries
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            chunks: 'all',
            priority: 25,
          },
          // UI component libraries
          ui: {
            name: 'ui',
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            chunks: 'all',
            priority: 20,
          },
          // Icons and fonts
          icons: {
            name: 'icons',
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            chunks: 'all',
            priority: 20,
          },
          // Large vendor libraries
          vendor: {
            name: 'vendors',
            test: /[\\/]node_modules[\\/]/,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Common patterns
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };

      // ============================================
      // OPTIMIZE MODULE CONCATENATION
      // ============================================
      config.optimization.concatenateModules = true;

      // ============================================
      // IMPROVE TREE SHAKING
      // ============================================
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // ============================================
      // COMPILATION OPTIMIZATION
      // ============================================
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // ============================================
      // IGNORE UNUSED FILES
      // ============================================
      config.module.rules.push({
        test: /\.md$/,
        use: 'ignore-loader',
      });
    }

    // ============================================
    // PERFORMANCE OPTIMIZATIONS FOR SERVER
    // ============================================
    if (isServer) {
      // Optimize for server-side rendering
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

      // Reduce memory usage on server
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
  // REDIRECTS FOR SEO AND UX
  // ============================================
  async redirects() {
    return [
      // Redirect root to dashboard
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },

  // ============================================
  // REWRITES FOR API AND ASSETS
  // ============================================
  async rewrites() {
    return [
      // PWA manifest
      {
        source: '/manifest.json',
        destination: '/manifest.json',
      },
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
    // CSS optimization
    optimizeCss: true,

    // Optimize package imports
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },

  // ============================================
  // TYPESCRIPT OPTIMIZATION
  // ============================================
  typescript: {
    // Ignore build errors in development
    ignoreBuildErrors: false,
  },

  // ============================================
  // SWC OPTIMIZATION
  // ============================================
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,

    // React optimization
    reactRemoveProperties: process.env.NODE_ENV === 'production',

    // Styled components
    styledComponents: true,
  },

  // ============================================
  // ON-DEMAND REVALIDATION
  // ============================================
  // Enable on-demand revalidation for better performance
  // revalidate: 60, // Revalidate every minute
};

// ============================================
// SENTRY WEBPACK PLUGIN CONFIGURATION
// ============================================
const sentryWebpackPluginOptions = {
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Transpiles SDK to be compatible with IE11
  transpileClientSDK: true,

  // Routes browser requests through Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Hides source maps from client browser
  hideSourceMaps: true,

  // Supabase authentication for sourcemap uploads
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Organization and project
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

// Export with Sentry configuration
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
