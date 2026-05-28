/**
 * Debounced Realtime Manager
 * Prevents multiple rapid-fire refetches when realtime events come in bursts.
 * Also provides a centralized way to manage subscriptions.
 */

const pendingRefetches = new Map<string, NodeJS.Timeout>();

/**
 * Debounce a refetch callback. If called multiple times within the delay window,
 * only the last call will execute.
 * 
 * @param key - Unique key for this refetch operation
 * @param callback - The refetch function to call
 * @param delayMs - Debounce delay in milliseconds (default: 1000ms)
 */
export function debouncedRefetch(
  key: string,
  callback: () => void,
  delayMs: number = 1000
): void {
  const existing = pendingRefetches.get(key);
  if (existing) {
    clearTimeout(existing);
  }

  const timeout = setTimeout(() => {
    pendingRefetches.delete(key);
    callback();
  }, delayMs);

  pendingRefetches.set(key, timeout);
}

/**
 * Cancel a pending debounced refetch
 */
export function cancelRefetch(key: string): void {
  const existing = pendingRefetches.get(key);
  if (existing) {
    clearTimeout(existing);
    pendingRefetches.delete(key);
  }
}

/**
 * Cancel all pending refetches
 */
export function cancelAllRefetches(): void {
  for (const timeout of pendingRefetches.values()) {
    clearTimeout(timeout);
  }
  pendingRefetches.clear();
}
