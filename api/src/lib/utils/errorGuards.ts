export function isNativeError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (typeof (error as any).name === 'string' && (error as any).name === 'AbortError') {
    return true;
  }
  const msg = (error as any)?.message;
  return typeof msg === 'string' && /abort/iu.test(msg);
}
