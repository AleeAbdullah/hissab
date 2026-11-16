import { useState } from 'react';

// Shows the pull spinner only for a pull the user started; background refetches stay silent.
export function usePullToRefresh(refresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    void refresh().finally(() => setRefreshing(false));
  };
  return { refreshing, onRefresh };
}
