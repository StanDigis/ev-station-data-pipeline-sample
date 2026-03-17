export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  factor?: number;
  jitter?: boolean;
}

export async function withRetry<T>(task: () => Promise<T>, options: RetryOptions): Promise<T> {
  const factor = options.factor ?? 2;
  const jitter = options.jitter !== false;
  let attempt = 0;
  let delayMs = options.initialDelayMs;
  let lastError: unknown;

  while (attempt < options.maxAttempts) {
    attempt += 1;
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= options.maxAttempts) {
        break;
      }
      const actualDelay = jitter ? delayMs * (0.5 + Math.random()) : delayMs;
      await sleep(actualDelay);
      delayMs *= factor;
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
