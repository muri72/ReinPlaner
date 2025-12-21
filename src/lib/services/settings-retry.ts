/**
 * Retry Logic Utility
 *
 * Extracted from settings-service.ts to handle retry logic
 * separately from business logic.
 */

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffFactor: number;
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  context: string = "operation"
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(
        `SettingsService: Attempt ${attempt}/${config.maxRetries} failed for ${context}: ${error.message}`
      );

      if (attempt === config.maxRetries) {
        console.error(
          `SettingsService: All ${config.maxRetries} attempts failed for ${context}`
        );
        throw error;
      }

      // Wait before retrying with exponential backoff
      const delay = config.retryDelay * Math.pow(config.backoffFactor, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffFactor: 2,
};
