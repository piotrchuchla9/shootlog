import cron from 'node-cron';
import { scrapeIpscPl } from './scrapers/ipsc_pl';
import { scrapePzss } from './scrapers/pzss';
import { prisma } from '../lib/prisma';

async function markFinishedEvents() {
  const { count } = await prisma.event.updateMany({
    where: { status: 'upcoming', endDate: { lt: new Date() } },
    data: { status: 'finished' },
  });
  if (count > 0) console.log(`[scheduler] marked ${count} event(s) as finished`);
}

export async function initScheduler() {
  // Uruchom od razu przy starcie
  await markFinishedEvents();

  // Co 6 godzin — kalendarz IPSC PL
  cron.schedule('0 */6 * * *', async () => {
    console.log('[scheduler] running ipsc_pl scraper...');
    await scrapeIpscPl().catch((err) => console.error('[scheduler] ipsc_pl error:', err));
    await markFinishedEvents();
  });

  // Co 12 godzin — kalendarz PZSS
  cron.schedule('0 */12 * * *', async () => {
    console.log('[scheduler] running pzss scraper...');
    await scrapePzss().catch((err) => console.error('[scheduler] pzss error:', err));
    await markFinishedEvents();
  });

  // Codziennie o północy — niezależnie od scraperów
  cron.schedule('0 0 * * *', markFinishedEvents);

  console.log('[scheduler] initialized — ipsc_pl every 6h, pzss every 12h, status cleanup daily');
}
