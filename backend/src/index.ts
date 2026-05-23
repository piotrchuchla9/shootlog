import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 0,
  enabled: !!process.env.SENTRY_DSN,
});

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { eventsRoutes } from './routes/events';
import { authRoutes } from './routes/auth';
import notificationsRoutes from './routes/notifications';
import { initScheduler } from './services/scheduler';
import { geocodeMissingEvents } from './services/geocoding';
import { scrapeIpscPl } from './services/scrapers/ipsc_pl';
import { scrapePzss } from './services/scrapers/pzss';
import { scrapePortalStrzelecki } from './services/scrapers/portalstrzelecki';

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
  });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  app.register(eventsRoutes, { prefix: '/events' });
  app.register(authRoutes, { prefix: '/auth' });
  app.register(notificationsRoutes);

  app.setErrorHandler((error, _request, reply) => {
    if (reply.statusCode >= 500) Sentry.captureException(error);
    reply.send(error);
  });

  app.get('/health', async () => ({ status: 'ok', ts: new Date() }));

  app.post('/admin/scrape/:source', async (request, reply) => {
    const { source } = request.params as { source: string };
    if (source === 'ipsc_pl') {
      scrapeIpscPl().catch(console.error);
      return { started: 'ipsc_pl' };
    }
    if (source === 'pzss') {
      scrapePzss().catch(console.error);
      return { started: 'pzss' };
    }
    if (source === 'portalstrzelecki') {
      scrapePortalStrzelecki().catch(console.error);
      return { started: 'portalstrzelecki' };
    }
    if (source === 'all') {
      scrapeIpscPl().catch(console.error);
      scrapePzss().catch(console.error);
      scrapePortalStrzelecki().catch(console.error);
      return { started: 'all' };
    }
    return reply.status(400).send({ error: 'unknown source' });
  });

  await initScheduler();

  // Geocode events without coordinates in background (rate-limited, ~3 min for 168 events)
  geocodeMissingEvents().catch(console.error);

  try {
    await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
