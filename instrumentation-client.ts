// Client-side instrumentation for Sentry
// This file replaces the deprecated sentry.client.config.ts
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

import * as Sentry from "@sentry/nextjs";

export async function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.2,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Session Replay configuration
    // When these are set, Sentry automatically creates the replay integration
    replaysOnErrorSampleRate: 1.0,

    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // Capture unhandled promise rejections
    environment: process.env.NODE_ENV || 'development',

    // Capture additional context
    initialScope: {
      tags: {
        component: 'client',
      },
    },

    // Add custom tags
    beforeSendTransaction: (event) => {
      // Add custom transaction tags
      if (event.transaction) {
        event.transaction = event.transaction.replace(/\/\[[^\/]+\]/g, '/:param');
      }
      return event;
    },
  });
}
