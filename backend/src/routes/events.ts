import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../lib/auth';

interface EventsQuery {
  discipline?: string;
  level?: string;
  region?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  page?: string;
  pageSize?: string;
}

function getAuthUserId(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7), process.env.JWT_ACCESS_SECRET!).userId;
  } catch {
    return null;
  }
}

export async function eventsRoutes(app: FastifyInstance) {
  app.get('/locations', async (request) => {
    const { voivodeship } = request.query as { voivodeship?: string };
    const cityWhere = voivodeship ? { voivodeship } : {};

    const [voivRows, cityRows] = await Promise.all([
      prisma.event.findMany({
        where: { voivodeship: { not: null } },
        select: { voivodeship: true },
        distinct: ['voivodeship'],
        orderBy: { voivodeship: 'asc' },
      }),
      prisma.event.findMany({
        where: { city: { not: null }, ...cityWhere },
        select: { city: true },
        distinct: ['city'],
        orderBy: { city: 'asc' },
      }),
    ]);

    return {
      voivodeships: voivRows.map(r => r.voivodeship).filter(Boolean) as string[],
      cities: cityRows.map(r => r.city).filter(Boolean) as string[],
    };
  });

  app.get('/saved', async (request, reply) => {
    const userId = getAuthUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const saved = await prisma.userSavedEvent.findMany({
      where: { userId },
      include: { event: true },
      orderBy: { event: { startDate: 'asc' } },
    });
    return saved.map(s => s.event);
  });

  app.post<{ Params: { id: string } }>('/:id/save', async (request, reply) => {
    const userId = getAuthUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const { id: eventId } = request.params;
    await prisma.userSavedEvent.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId },
      update: {},
    });
    return { saved: true };
  });

  app.delete<{ Params: { id: string } }>('/:id/save', async (request, reply) => {
    const userId = getAuthUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    const { id: eventId } = request.params;
    await prisma.userSavedEvent.deleteMany({ where: { userId, eventId } });
    return { saved: false };
  });

  app.get<{ Querystring: EventsQuery }>('/', async (request) => {
    const {
      discipline,
      level,
      region,
      city,
      dateFrom,
      dateTo,
      status,
      page = '1',
      pageSize = '20',
    } = request.query;

    const pageNum = Math.max(1, Number(page));
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize)));

    const where: Parameters<typeof prisma.event.findMany>[0]['where'] = {};

    if (discipline) where.discipline = discipline;
    if (level) where.level = Number(level);
    if (region) where.voivodeship = region;
    if (city) where.city = city;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.startDate = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
      prisma.event.count({ where }),
    ]);

    return { data, meta: { total, page: pageNum, pageSize: pageSizeNum } };
  });

  app.get<{ Querystring: EventsQuery }>('/map', async (request) => {
    const { discipline, level, region, city, dateFrom, dateTo, status } = request.query;

    const where: Parameters<typeof prisma.event.findMany>[0]['where'] = {
      lat: { not: null },
      lng: { not: null },
    };

    if (discipline) where.discipline = discipline;
    if (level) where.level = Number(level);
    if (region) where.voivodeship = region;
    if (city) where.city = city;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.startDate = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    return prisma.event.findMany({
      where,
      select: { id: true, name: true, lat: true, lng: true, discipline: true, level: true, city: true, startDate: true, endDate: true, status: true },
      orderBy: { startDate: 'asc' },
      take: 500,
    });
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return reply.status(404).send({ error: 'Not found' });
    return event;
  });
}
