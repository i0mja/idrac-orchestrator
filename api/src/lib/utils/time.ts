export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function exponentialBackoff(attempt: number, baseDelayMs = 1000, maxDelayMs = 60_000) {
  const jitter = Math.random() * baseDelayMs;
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  return Math.round(delay + jitter);
}
