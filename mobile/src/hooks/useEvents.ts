import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Event, EventFilters } from '@/types';

export function useEvents(filters: EventFilters = {}) {
  const params = Object.fromEntries(
    Object.entries({ ...filters, pageSize: filters.pageSize ?? 50 })
      .filter(([, v]) => v != null && v !== '')
  );

  return useQuery<Event[]>({
    queryKey: ['events', params],
    queryFn: () => api.get('/events', { params }).then(r => r.data.data),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
  });
}
