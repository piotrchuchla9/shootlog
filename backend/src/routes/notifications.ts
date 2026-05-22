import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../lib/auth';

function requireAuth(auth: string | undefined) {
  if (!auth?.startsWith('Bearer ')) throw new Error('Unauthorized');
  return verifyToken(auth.slice(7), process.env.JWT_ACCESS_SECRET!);
}

export default async function notificationsRoutes(app: FastifyInstance) {
  app.post<{ Body: { token: string } }>('/user/push-token', async (request, reply) => {
    try {
      const { userId } = requireAuth(request.headers.authorization);
      const { token } = request.body;
      if (!token || typeof token !== 'string') return reply.status(400).send({ error: 'token required' });
      await prisma.user.update({ where: { id: userId }, data: { pushToken: token } });
      return { ok: true };
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/user/notification-preferences', async (request, reply) => {
    try {
      const { userId } = requireAuth(request.headers.authorization);
      const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
      if (!prefs) {
        return {
          enabled: true,
          disciplines: [],
          levels: [],
          voivodeships: [],
          cities: [],
        };
      }
      return prefs;
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  app.put<{
    Body: {
      enabled?: boolean;
      disciplines?: string[];
      levels?: number[];
      voivodeships?: string[];
      cities?: string[];
    };
  }>('/user/notification-preferences', async (request, reply) => {
    try {
      const { userId } = requireAuth(request.headers.authorization);
      const { enabled, disciplines, levels, voivodeships, cities } = request.body;
      const prefs = await prisma.notificationPreference.upsert({
        where: { userId },
        create: {
          userId,
          enabled: enabled ?? true,
          disciplines: disciplines ?? [],
          levels: levels ?? [],
          voivodeships: voivodeships ?? [],
          cities: cities ?? [],
        },
        update: {
          ...(enabled !== undefined && { enabled }),
          ...(disciplines !== undefined && { disciplines }),
          ...(levels !== undefined && { levels }),
          ...(voivodeships !== undefined && { voivodeships }),
          ...(cities !== undefined && { cities }),
        },
      });
      return prefs;
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}
