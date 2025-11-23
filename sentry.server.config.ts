// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server SDK is initialized
// on the server side. The config you add here will be used whenever the
// server-side SDK handles a request.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.2,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: process.env.NODE_ENV || 'development',

  // Add custom tags
  initialScope: {
    tags: {
      component: 'server',
    },
  },

  // Performance monitoring
  profilesSampleRate: 0.1,

  // Add server-side context
  beforeSend: (event, hint) => {
    // Add custom filtering here if needed
    if (event.exception) {
      console.error('Server Error:', event.exception.values?.[0]?.value);
    }
    return event;
  },

  // Extra error data
  beforeSendTransaction: (event) => {
    // Sanitize transaction names
    if (event.transaction) {
      event.transaction = event.transaction.replace(/\/\[[^\/]+\]/g, '/:param');
    }

    // Add database-related transaction metadata
    if (event.transaction?.includes('/api/')) {
      event.tags = {
        ...event.tags,
        type: 'api',
      };
    }

    return event;
  },

  // Integration for handling Supabase errors
  integrations: [
    // You can add custom integrations here
  ],
});
