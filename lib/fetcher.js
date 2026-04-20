import axios from 'axios';

/**
 * SWR fetcher — drop-in for all useSWR calls.
 * Supports string URLs and [url, params] tuples.
 */
export const fetcher = async (key) => {
  const url = Array.isArray(key) ? key[0] : key;
  const params = Array.isArray(key) ? key[1] : undefined;
  const res = await axios.get(url, params ? { params } : undefined);
  return res.data;
};

/**
 * Global SWR config — import this once in layout or _app.
 */
export const swrConfig = {
  fetcher,
  revalidateOnFocus: true,       // auto-refresh when user returns to tab
  revalidateOnReconnect: true,   // auto-refresh on network reconnect
  dedupingInterval: 3000,        // dedupe same requests within 3s
  errorRetryCount: 2,
  shouldRetryOnError: false,
};
