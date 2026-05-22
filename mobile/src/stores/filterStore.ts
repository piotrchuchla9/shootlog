import { create } from 'zustand';

interface FilterState {
  discipline: string;
  level: number | null;
  region: string;
  city: string;
  status: string;
  setDiscipline: (d: string) => void;
  setLevel: (l: number | null) => void;
  setRegion: (r: string) => void;
  setCity: (c: string) => void;
  setStatus: (s: string) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>()((set) => ({
  discipline: '',
  level: null,
  region: '',
  city: '',
  status: 'upcoming',
  setDiscipline: (discipline) => set({ discipline }),
  setLevel: (level) => set({ level }),
  setRegion: (region) => set({ region, city: '' }),
  setCity: (city) => set({ city }),
  setStatus: (status) => set({ status }),
  reset: () => set({ discipline: '', level: null, region: '', city: '', status: 'upcoming' }),
}));
