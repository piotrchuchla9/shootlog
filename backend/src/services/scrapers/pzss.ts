import * as cheerio from 'cheerio';
import { prisma } from '../../lib/prisma';
import { sleep, guessVoivodeship } from './utils';
import { sendNewEventNotifications } from '../push';
import { geocodeEvent } from '../geocoding';
import { Event } from '@prisma/client';

const BASE_URL = 'https://www.pzss.org.pl/kalendarz';
const DETAIL_BASE = 'https://www.pzss.org.pl';

// Hidden date: "YYYY MM DD", display date: "DD-DD.MM" or "DD.MM-DD.MM"
function parsePzssDate(hidden: string, display: string): { start: Date; end: Date } | null {
  const hiddenParts = hidden.trim().split(/\s+/);
  if (hiddenParts.length < 3) return null;

  const year = parseInt(hiddenParts[0]);
  const startMonth = parseInt(hiddenParts[1]);
  const startDay = parseInt(hiddenParts[2]);
  const start = new Date(`${year}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T08:00:00Z`);
  if (isNaN(start.getTime())) return null;

  // Parse end day from display date e.g. "06-21.05" → end day=21, month=05
  const rangeMatch = display.trim().match(/\d{1,2}-(\d{1,2})\.(\d{2})/);
  if (rangeMatch) {
    const endDay = parseInt(rangeMatch[1]);
    const endMonth = parseInt(rangeMatch[2]);
    const endYear = endMonth < startMonth ? year + 1 : year;
    const end = new Date(`${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}T18:00:00Z`);
    if (!isNaN(end.getTime())) return { start, end };
  }

  // Single day
  return { start, end: new Date(start.getTime() + 10 * 60 * 60 * 1000) };
}

// P=Pistolet, K=Karabin, S=Strzelba, Sz=Strzelba, R=Rewolwer
function parsePzssDiscipline(abbrs: string[]): string {
  const s = abbrs.join(' ').toUpperCase();
  if (s.includes('S') || s.includes('SZ')) return 'shotgun';
  if (s.includes('K')) return 'rifle';
  if (s.includes('P')) return 'pistol';
  return 'pistol';
}

export async function scrapePzss(): Promise<void> {
  console.log('[pzss] starting scrape...');

  let html = '';
  // Fetch all upcoming events
  for (const url of [BASE_URL, `${BASE_URL}?past=false`]) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': process.env.SCRAPER_USER_AGENT ?? 'ShootLogBot/1.0' },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) { html = await res.text(); break; }
    } catch {
      // try next
    }
  }

  if (!html) {
    await prisma.scraperLog.create({
      data: { source: 'pzss', status: 'error', message: 'fetch failed' },
    });
    console.warn('[pzss] could not fetch calendar');
    return;
  }

  const $ = cheerio.load(html);
  const events: Parameters<typeof prisma.event.create>[0]['data'][] = [];

  // Events are in ul#eventsList > li
  $('ul#eventsList > li').each((_, el) => {
    const hiddenDate = $(el).find('.js-event-date').text().trim();
    const displayDate = $(el).find('.c-competition-list-v2__event-date').text().trim();

    const titleEl = $(el).find('.c-competition-list-v2__event-title a');
    const name = titleEl.text().trim();
    const href = titleEl.attr('href') ?? '';
    const fullUrl = href ? `${DETAIL_BASE}${href}` : undefined;

    const city = $(el).find('.c-competition-list-v2__event-city').text().trim();

    // Discipline abbreviations
    const abbrs: string[] = [];
    $(el).find('dl').each((_, dl) => {
      if ($(dl).find('dt').text().trim().startsWith('Dyscypl')) {
        $(dl).find('dd span').each((_, span) => abbrs.push($(span).text().trim()));
      }
    });

    const parsed = parsePzssDate(hiddenDate, displayDate);
    if (!name || !parsed) return;

    events.push({
      source: 'pzss',
      externalId: href || `pzss_${name}`,
      name,
      location: city || 'Polska',
      city: city || undefined,
      voivodeship: city ? guessVoivodeship(city) : undefined,
      level: 2, // PZSS events are mostly national/regional level
      discipline: parsePzssDiscipline(abbrs),
      startDate: parsed.start,
      endDate: parsed.end,
      registrationUrl: fullUrl,
      status: parsed.start > new Date() ? 'upcoming' : 'finished',
    });
  });

  let upserted = 0;
  const newEvents: Event[] = [];
  for (const ev of events) {
    try {
      const existing = await prisma.event.findUnique({
        where: { externalId_source: { externalId: ev.externalId as string, source: ev.source as string } },
      });
      const result = await prisma.event.upsert({
        where: {
          externalId_source: {
            externalId: ev.externalId as string,
            source: ev.source as string,
          },
        },
        create: ev,
        update: {
          status: ev.status,
          updatedAt: new Date(),
        },
      });
      if (!existing) {
        newEvents.push(result);
        if (!result.lat) {
          const coords = await geocodeEvent(result.city, result.location);
          if (coords) await prisma.event.update({ where: { id: result.id }, data: coords });
        }
      }
      upserted++;
    } catch (err) {
      console.error(`[pzss] upsert failed for "${ev.name}":`, err);
    }
    await sleep(1100);
  }

  await prisma.scraperLog.create({
    data: { source: 'pzss', status: 'success', itemsFound: upserted },
  });

  console.log(`[pzss] done — ${upserted}/${events.length} events upserted, ${newEvents.length} new`);
  if (newEvents.length > 0) sendNewEventNotifications(newEvents).catch(console.error);
}
