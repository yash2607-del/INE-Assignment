import { config } from '../../config/env.js';

/**
 * Utility to pause execution for given milliseconds
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes an async scraping function with bounded exponential backoff retries.
 * Never retries indefinitely. Logs every attempt and records outcomes honestly.
 *
 * @param {Function} fn - Async operation function receiving attempt number (1..maxRetries)
 * @param {Object} options - Custom options (maxRetries, baseDelayMs, onAttemptLog)
 */
export async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || config.scrapeMaxRetries;
  const baseDelayMs = options.baseDelayMs || config.scrapeRetryBaseDelayMs;
  const onAttemptLog = options.onAttemptLog || (() => {});

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      onAttemptLog({
        attempt,
        maxRetries,
        status: 'STARTING',
        message: `Attempt ${attempt}/${maxRetries} starting...`,
      });

      const result = await fn(attempt);
      const durationMs = Date.now() - startTime;

      onAttemptLog({
        attempt,
        maxRetries,
        status: attempt > 1 ? 'RETRIED' : 'SUCCESS',
        durationMs,
        message: `Attempt ${attempt} succeeded in ${durationMs}ms`,
      });

      return {
        ...result,
        attempts: attempt,
        finalStatus: attempt > 1 ? 'RETRIED' : 'SUCCESS',
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      lastError = err;

      onAttemptLog({
        attempt,
        maxRetries,
        status: 'FAILED',
        durationMs,
        error: err.message,
        message: `Attempt ${attempt} failed: ${err.message}`,
      });

      if (attempt < maxRetries) {
        // Calculate bounded exponential backoff delay with jitter
        const backoffDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), 10000);
        const jitter = Math.floor(Math.random() * 200);
        const totalDelay = backoffDelay + jitter;

        onAttemptLog({
          attempt,
          maxRetries,
          status: 'BACKOFF',
          delayMs: totalDelay,
          message: `Retrying in ${totalDelay}ms...`,
        });

        await delay(totalDelay);
      }
    }
  }

  throw lastError;
}
