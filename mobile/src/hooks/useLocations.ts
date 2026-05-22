import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LocationsData {
  voivodeships: string[];
  cities: string[];
}

export function useLocations(voivodeship?: string) {
  return useQuery<LocationsData>({
    queryKey: ['locations', voivodeship ?? ''],
    queryFn: () =>
      api.get('/events/locations', { params: voivodeship ? { voivodeship } : {} }).then(r => r.data),
    staleTime: 1000 * 60 * 60,
  });
}
