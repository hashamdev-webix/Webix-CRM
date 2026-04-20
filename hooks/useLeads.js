import useSWR from 'swr';
import axios from 'axios';

/**
 * useSocialLeads — cached + auto-revalidates on focus/reconnect.
 * Pass filters as an object. Returns { leads, total, pages, loading, error, mutate }
 */
export function useSocialLeads(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const key = `/api/leads/social?${params}`;
  const { data, error, isLoading, mutate } = useSWR(key);
  return {
    leads: data?.leads || [],
    total: data?.total || 0,
    pages: data?.pages || 1,
    loading: isLoading,
    error,
    mutate,
  };
}

/**
 * useDataEntryLeads — same pattern for data-entry leads.
 */
export function useDataEntryLeads(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const key = `/api/leads/data-entry?${params}`;
  const { data, error, isLoading, mutate } = useSWR(key);
  return {
    leads: data?.leads || [],
    total: data?.total || 0,
    pages: data?.pages || 1,
    loading: isLoading,
    error,
    mutate,
  };
}
