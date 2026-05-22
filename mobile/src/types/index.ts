export interface Event {
  id: string;
  externalId: string | null;
  source: string;
  name: string;
  discipline: string;
  level: number;
  location: string;
  city: string | null;
  voivodeship: string | null;
  lat: number | null;
  lng: number | null;
  startDate: string;
  endDate: string;
  registrationUrl: string | null;
  registrationOpen: string | null;
  registrationClose: string | null;
  maxShooters: number | null;
  currentShooters: number | null;
  entryFee: number | null;
  currency: string;
  organizerName: string | null;
  status: string;
  scrapedAt: string;
  updatedAt: string;
}

export interface MapEvent {
  id: string;
  name: string;
  lat: number;
  lng: number;
  discipline: string;
  level: number;
  city: string | null;
  startDate: string;
  endDate: string;
  status: string;
}

export interface EventFilters {
  discipline?: string;
  level?: number;
  region?: string;
  city?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

