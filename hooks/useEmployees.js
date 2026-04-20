import useSWR from 'swr';

/**
 * useEmployees — cached employee list with optional filters.
 * Returns { employees, total, loading, error, mutate }
 */
export function useEmployees(filters = {}) {
  const params = new URLSearchParams({ limit: 200, ...filters });
  // Remove empty values
  [...params.keys()].forEach(k => { if (!params.get(k)) params.delete(k); });
  const { data, error, isLoading, mutate } = useSWR(`/api/hr/employees?${params}`);
  return {
    employees: data?.employees || data || [],
    total: data?.total || 0,
    loading: isLoading,
    error,
    mutate,
  };
}

/**
 * useEmployee — single employee by id.
 */
export function useEmployee(id) {
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/hr/employees/${id}` : null);
  return { employee: data, loading: isLoading, error, mutate };
}
