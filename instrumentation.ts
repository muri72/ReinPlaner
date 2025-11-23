export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }

  // Client-side instrumentation is handled by instrumentation-client.ts
  // No need to import here - Next.js automatically calls it on the client
}
