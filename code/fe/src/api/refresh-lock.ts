const refreshing = new Map<number, Promise<unknown>>();

export function runSingleRefresh<T>(
  refresh: () => Promise<T>,
  loginVersion = 0
): Promise<T> {
  let pending = refreshing.get(loginVersion);
  if (!pending) {
    pending = refresh().finally(() => refreshing.delete(loginVersion));
    refreshing.set(loginVersion, pending);
  }
  return pending as Promise<T>;
}
