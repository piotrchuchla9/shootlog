import { prisma } from '../lib/prisma';
import { sleep } from './scrapers/utils';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const UA = process.env.SCRAPER_USER_AGENT ?? 'ShootLogBot/1.0';

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=pl`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function buildQuery(city: string | null, location: string): string {
  if (city) return `${city}, Polska`;
  const parts = location.split(/[,\-–]/);
  return `${parts[parts.length - 1].trim()}, Polska`;
}

export async function geocodeMissingEvents(): Promise<void> {
  const events = await prisma.event.findMany({
    where: { lat: null, OR: [{ city: { not: null } }, { location: { not: '' } }] },
    select: { id: true, city: true, location: true },
  });

  console.log(`[geocoding] ${events.length} events to geocode`);
  let done = 0;

  for (const ev of events) {
    const query = buildQuery(ev.city, ev.location);
    const coords = await geocode(query);
    if (coords) {
      await prisma.event.update({ where: { id: ev.id }, data: coords });
      done++;
    }
    await sleep(1100); // Nominatim rate limit: 1 req/s
  }

  console.log(`[geocoding] done — ${done}/${events.length} geocoded`);
}

export async function geocodeEvent(city: string | null, location: string): Promise<{ lat: number; lng: number } | null> {
  const query = buildQuery(city, location);
  return geocode(query);
}
