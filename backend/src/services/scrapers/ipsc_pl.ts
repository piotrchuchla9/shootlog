import * as cheerio from 'cheerio';
import { prisma } from '../../lib/prisma';
import { sleep, parseLevelFromText, guessVoivodeship } from './utils';
import { sendNewEventNotifications } from '../push';
import { geocodeEvent } from '../geocoding';
import { Event } from '@prisma/client';

const BASE_URL = 'https://ipsc-pl.org/zawody/kalendarz';
const DETAIL_BASE = 'https://ipsc-pl.org';

// DD/MM/YYYY - DD/MM/YYYY
function parseDateRangeIpsc(str: string): { start: Date; end: Date } | null {
  str = str.trim().replace(/ /g, '').trim(); // strip &nbsp;
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const start = new Date(`${m[3]}-${m[2]}-${m[1]}T08:00:00Z`);
  const end   = new Date(`${m[6]}-${m[5]}-${m[4]}T18:00:00Z`);
  if (isNaN(start.getTime())) return null;
  return { start, end };
}

// "Pistoletowe, PCC" → "pistol" | "pcc" | "shotgun" | "rifle" | "air"
function parseDiscipline(disciplineStr: string, name: string): string {
  const d = disciplineStr.toLowerCase();
  const n = name.toLowerCase();
  if (d.includes('pcc') || n.includes('pcc') || n.includes('carbine')) return 'pcc';
  if (d.includes('strzelb') || n.includes('strzelb') || d.includes('shotgun')) return 'shotgun';
  if (d.includes('mini rifle') || d.includes('karabin') || n.includes('rifle') || n.includes('karabin')) return 'rifle';
  if (d.includes('action air') || d.includes('air') || n.includes('action air')) return 'air';
  return 'pistol';
}

// Try to extract city from name like "Mini IPSC HG - L1 - Świdnik" → "Świdnik"
function extractCityFromName(name: string): string | undefined {
  const parts = name.split(/\s*[-–]\s*/);
  // Need at least 2 parts — name must contain a separator
  if (parts.length < 2) return undefined;
  const last = parts[parts.length - 1].trim();
  if (
    last.length < 2 || last.length > 30 ||
    /^l[1-5]$/i.test(last) ||         // level marker (L1–L5)
    /^\d/.test(last) ||                // starts with digit
    last === last.toUpperCase()        // all-caps abbreviation (PLSD, IPSC...)
  ) return undefined;
  return last;
}

export async function scrapeIpscPl(): Promise<void> {
  console.log('[ipsc_pl] starting scrape...');

  let html: string;
  try {
    const res = await fetch(BASE_URL, {
      headers: { 'User-Agent': process.env.SCRAPER_USER_AGENT ?? 'ShootLogBot/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    await prisma.scraperLog.create({
      data: { source: 'ipsc_pl', status: 'error', message: `fetch failed: ${err}` },
    });
    throw err;
  }

  const $ = cheerio.load(html);
  const events: Parameters<typeof prisma.event.create>[0]['data'][] = [];

  $('li.ev_td_li').each((_, el) => {
    const p = $(el).find('p');
    const spans = p.find('span');

    const nameAnchor = $(el).find('a');
    const name = nameAnchor.text().trim();
    const href = nameAnchor.attr('href') ?? '';
    const fullUrl = href ? `${DETAIL_BASE}${href}` : undefined;

    // Second span contains the date range
    const dateSpan = spans.eq(1).text().trim().replace(/ /g, ' ').replace(/:$/, '').trim();
    const parsed = parseDateRangeIpsc(dateSpan);
    if (!name || !parsed) return;

    // Last span = discipline
    const disciplineStr = spans.last().text().trim();

    const city = extractCityFromName(name);

    events.push({
      source: 'ipsc_pl',
      externalId: href || `ipsc_pl_${name}`,
      name,
      location: city ?? 'Polska',
      city,
      voivodeship: city ? guessVoivodeship(city) : undefined,
      level: parseLevelFromText(name),
      discipline: parseDiscipline(disciplineStr, name),
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
          city: ev.city ?? null,
          voivodeship: ev.voivodeship ?? null,
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
      console.error(`[ipsc_pl] upsert failed for "${ev.name}":`, err);
    }
    await sleep(1100);
  }

  await prisma.scraperLog.create({
    data: { source: 'ipsc_pl', status: 'success', itemsFound: upserted },
  });

  console.log(`[ipsc_pl] done — ${upserted}/${events.length} events upserted, ${newEvents.length} new`);
  if (newEvents.length > 0) sendNewEventNotifications(newEvents).catch(console.error);
}
