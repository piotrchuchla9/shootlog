import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MapEvent, EventFilters } from '@/types';

export function useMapEvents(filters: Omit<EventFilters, 'page' | 'pageSize'>) {
  return useQuery({
    queryKey: ['map-events', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.discipline) params.set('discipline', filters.discipline);
      if (filters.level) params.set('level', String(filters.level));
      if (filters.region) params.set('region', filters.region);
      if (filters.city) params.set('city', filters.city);
      if (filters.status) params.set('status', filters.status);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const { data } = await api.get<MapEvent[]>(`/events/map?${params}`);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
