import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Event } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { toastSuccess, toastError } from '@/lib/toast';

export function useSavedEvents() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  return useQuery<Event[]>({
    queryKey: ['savedEvents'],
    queryFn: () => api.get('/events/saved').then(r => r.data),
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSavedIds(): Set<string> {
  const { data } = useSavedEvents();
  return new Set(data?.map(e => e.id) ?? []);
}

export function useToggleSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      saved ? api.delete(`/events/${id}/save`) : api.post(`/events/${id}/save`),
    onMutate: async ({ id, saved }) => {
      await qc.cancelQueries({ queryKey: ['savedEvents'] });
      const prev = qc.getQueryData<Event[]>(['savedEvents']);
      if (saved) {
        qc.setQueryData<Event[]>(['savedEvents'], old => (old ?? []).filter(e => e.id !== id));
      }
      return { prev };
    },
    onSuccess: (_, { saved }) => {
      toastSuccess(saved ? 'Usunięto z zapisanych' : 'Zawody zapisane');
    },
    onError: (_, { saved }, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(['savedEvents'], ctx.prev);
      toastError(saved ? 'Nie udało się usunąć' : 'Nie udało się zapisać');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['savedEvents'] });
    },
  });
}
