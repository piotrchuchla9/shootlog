import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Event } from '@/types';

export function useEvent(id: string) {
  return useQuery<Event>({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
    staleTime: 1000 * 60 * 15,
    enabled: !!id,
  });
}
