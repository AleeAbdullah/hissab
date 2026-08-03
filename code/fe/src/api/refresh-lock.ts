let refreshing: Promise<boolean> | undefined;

export function runSingleRefresh(refresh: () => Promise<boolean>) {
  refreshing ??= refresh().finally(() => {
    refreshing = undefined;
  });
  return refreshing;
}
