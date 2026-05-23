import { prisma } from '../../lib/prisma';
import { sleep, parseLevelFromText, guessVoivodeship, guessDiscipline } from './utils';
import { sendNewEventNotifications } from '../push';
import { geocodeEvent } from '../geocoding';
import { Event } from '@prisma/client';

const ICAL_URL = 'https://portalstrzelecki.pl/?plugin=all-in-one-event-calendar&controller=ai1ec_exporter_controller&action=export_events';

interface IcalEvent {
  uid: string;
  summary: string;
  dtstart: string;
  dtend: string;
  location: string;
  categories: string[];
  url: string;
}

function parseIcal(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  // Unfold continuation lines (iCal line folding: CRLF + space/tab)
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');

  const vevents = unfolded.split('BEGIN:VEVENT');
  for (let i = 1; i < vevents.length; i++) {
    const block = vevents[i].split('END:VEVENT')[0];
    const ev: Partial<IcalEvent> = { categories: [], location: '', url: '' };

    for (const line of block.split(/\r?\n/)) {
      const sep = line.indexOf(':');
      if (sep === -1) continue;
      const prop = line.slice(0, sep).split(';')[0].toUpperCase();
      const val = line.slice(sep + 1).trim()
        .replace(/\\n/g, ' ').replace(/\\,/g, ',')
        .replace(/\\;/g, ';').replace(/\\\\/g, '\\');

      switch (prop) {
        case 'UID':        ev.uid = val; break;
        case 'SUMMARY':    ev.summary = val; break;
        case 'DTSTART':    ev.dtstart = val; break;
        case 'DTEND':      ev.dtend = val; break;
        case 'LOCATION':   ev.location = val; break;
        case 'CATEGORIES': ev.categories = val.split(',').map(s => s.trim()); break;
        case 'URL':        ev.url = val; break;
      }
    }

    if (ev.uid && ev.summary && ev.dtstart) {
      events.push(ev as IcalEvent);
    }
  }

  return events;
}

function icalDateToDate(s: string, isEnd: boolean): Date {
  const digits = s.replace(/\D/g, '').slice(0, 8);
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  return new Date(`${y}-${m}-${d}T${isEnd ? '18' : '08'}:00:00Z`);
}

const SKIP_CATEGORIES = new Set(['szkolenie', 'szkolenia', 'trening', 'treningi']);
const SKIP_NAMES = /\btrening\b|\bwarsztaty\b|\bszkolenie\b|\bkurs\b|\begzamin\b/i;

function shouldSkip(categories: string[], name: string): boolean {
  if (SKIP_NAMES.test(name)) return true;
  return categories.some(c => SKIP_CATEGORIES.has(c.toLowerCase()));
}

function mapDiscipline(categories: string[], name: string): string {
  const cats = categories.map(c => c.toLowerCase()).join(' ');
  const n = name.toLowerCase();
  if (cats.includes('long range') || cats.includes('longrange') || cats.includes('prs') ||
      n.includes('long range') || /\bprs\b/.test(n) || /\blr\b/.test(n)) {
    return 'longrange';
  }
  if (cats.includes('.22') || cats.includes('22lr') || cats.includes('rimfire') || n.includes('.22')) {
    return 'rifle';
  }
  // For IPSC and everything else, infer from name
  return guessDiscipline(name);
}

function extractCity(location: string): string | undefined {
  if (!location) return undefined;
  const city = location.split(',')[0].trim();
  if (city.length < 2 || city.length > 40) return undefined;
  return city;
}

function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/\d{1,2}[.\-/]\d{1,2}\.?\d{0,4}/g, '')
    .replace(/[().,–\-+]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

async function isDuplicateOfPrimary(name: string, startDate: Date): Promise<boolean> {
  const dayStart = new Date(startDate); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd   = new Date(startDate); dayEnd.setUTCHours(23, 59, 59, 999);
  const sameDay = await prisma.event.findMany({
    where: { source: { in: ['ipsc_pl', 'pzss'] }, startDate: { gte: dayStart, lte: dayEnd } },
    select: { name: true },
  });
  const pn = normalizeName(name);
  return sameDay.some(e => {
    const en = normalizeName(e.name);
    const shorter = pn.length <= en.length ? pn : en;
    const longer  = pn.length <= en.length ? en : pn;
    return shorter.length > 8 && longer.includes(shorter);
  });
}

function externalIdFromUrl(url: string, uid: string): string {
  try {
    const slug = new URL(url).pathname.replace(/\/+$/, '').split('/').pop();
    if (slug && slug.length > 2) return `ps_${slug}`;
  } catch { /* ignore */ }
  return `ps_${uid}`;
}

export async function scrapePortalStrzelecki(): Promise<void> {
  console.log('[portalstrzelecki] starting scrape...');

  let ical: string;
  try {
    const res = await fetch(ICAL_URL, {
      headers: { 'User-Agent': process.env.SCRAPER_USER_AGENT ?? 'ShootLogBot/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ical = await res.text();
  } catch (err) {
    await prisma.scraperLog.create({
      data: { source: 'portalstrzelecki', status: 'error', message: `fetch failed: ${err}` },
    });
    throw err;
  }

  const allEvents = parseIcal(ical);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const upcoming = allEvents.filter(ev => {
    if (shouldSkip(ev.categories, ev.summary)) return false;
    try {
      return icalDateToDate(ev.dtstart, false) >= cutoff;
    } catch {
      return false;
    }
  });

  console.log(`[portalstrzelecki] ${allEvents.length} total events, ${upcoming.length} to process`);

  let upserted = 0;
  const newEvents: Event[] = [];

  for (const ev of upcoming) {
    try {
      const start = icalDateToDate(ev.dtstart, false);
      const end   = icalDateToDate(ev.dtend || ev.dtstart, true);

      if (await isDuplicateOfPrimary(ev.summary, start)) continue;

      const city  = extractCity(ev.location);
      const externalId = externalIdFromUrl(ev.url, ev.uid);

      const eventData = {
        source: 'portalstrzelecki',
        externalId,
        name: ev.summary,
        location: ev.location || city || 'Polska',
        city: city || undefined,
        voivodeship: city ? guessVoivodeship(city) : undefined,
        level: parseLevelFromText(ev.summary, 2),
        discipline: mapDiscipline(ev.categories, ev.summary),
        startDate: start,
        endDate: end,
        registrationUrl: ev.url || undefined,
        status: start > new Date() ? 'upcoming' : 'finished',
      };

      const existing = await prisma.event.findUnique({
        where: { externalId_source: { externalId, source: 'portalstrzelecki' } },
      });
      const result = await prisma.event.upsert({
        where: { externalId_source: { externalId, source: 'portalstrzelecki' } },
        create: eventData,
        update: {
          status: eventData.status,
          city: eventData.city ?? null,
          voivodeship: eventData.voivodeship ?? null,
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
      console.error(`[portalstrzelecki] upsert failed for "${ev.summary}":`, err);
    }
    await sleep(200);
  }

  await prisma.scraperLog.create({
    data: { source: 'portalstrzelecki', status: 'success', itemsFound: upserted },
  });

  console.log(`[portalstrzelecki] done — ${upserted}/${upcoming.length} upserted, ${newEvents.length} new`);
  if (newEvents.length > 0) sendNewEventNotifications(newEvents).catch(console.error);
}
