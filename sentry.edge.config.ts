// This file configures the initialization of Sentry for edge runtime.
// The config you add here will be used whenever the edge SDK handles a request.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.2,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  environment: process.env.NODE_ENV || 'development',

  initialScope: {
    tags: {
      component: 'edge',
    },
  },

  // Edge runtime is limited in what it can do
  integrations: [],
});
