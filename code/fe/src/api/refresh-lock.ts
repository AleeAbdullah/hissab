let refreshing: Promise<unknown> | undefined;

export function runSingleRefresh<T>(refresh: () => Promise<T>): Promise<T> {
  refreshing ??= refresh().finally(() => {
    refreshing = undefined;
  });
  return refreshing as Promise<T>;
}
