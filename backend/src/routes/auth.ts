import { FastifyInstance } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { prisma } from '../lib/prisma';
import { createTokens, verifyToken } from '../lib/auth';

const googleClient = new OAuth2Client();

async function verifyGoogleToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({ idToken });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error('Invalid Google token');
  return {
    googleId: payload.sub,
    email: payload.email!,
    name: payload.name ?? payload.email!.split('@')[0],
  };
}

async function verifyAppleToken(idToken: string) {
  const payload = await appleSignin.verifyIdToken(idToken, {
    audience: process.env.APPLE_BUNDLE_ID ?? 'pl.shootlog.app',
    ignoreExpiration: false,
  });
  if (!payload.sub) throw new Error('Invalid Apple token');
  return {
    appleId: payload.sub,
    email: payload.email ?? `${payload.sub}@privaterelay.appleid.com`,
  };
}

async function upsertUserGoogle(data: { googleId: string; email: string; name: string }) {
  let user = await prisma.user.findUnique({ where: { googleId: data.googleId } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: data.email } });
    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: data.googleId } });
    } else {
      user = await prisma.user.create({
        data: { googleId: data.googleId, email: data.email, name: data.name },
      });
    }
  }
  return user;
}

async function upsertUserApple(data: { appleId: string; email: string; name?: string }) {
  let user = await prisma.user.findUnique({ where: { appleId: data.appleId } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: data.email } });
    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data: { appleId: data.appleId } });
    } else {
      user = await prisma.user.create({
        data: {
          appleId: data.appleId,
          email: data.email,
          name: data.name ?? data.email.split('@')[0],
        },
      });
    }
  }
  return user;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { idToken: string } }>('/google', async (request, reply) => {
    const { idToken } = request.body;
    if (!idToken) return reply.status(400).send({ error: 'idToken required' });
    try {
      const data = await verifyGoogleToken(idToken);
      const user = await upsertUserGoogle(data);
      return createTokens(user.id);
    } catch {
      return reply.status(401).send({ error: 'Invalid Google token' });
    }
  });

  app.post<{ Body: { idToken: string; name?: string } }>('/apple', async (request, reply) => {
    const { idToken, name } = request.body;
    if (!idToken) return reply.status(400).send({ error: 'idToken required' });
    try {
      const data = await verifyAppleToken(idToken);
      const user = await upsertUserApple({ ...data, name });
      return createTokens(user.id);
    } catch {
      return reply.status(401).send({ error: 'Invalid Apple token' });
    }
  });

  app.post<{ Body: { refreshToken: string } }>('/refresh', async (request, reply) => {
    const { refreshToken } = request.body;
    if (!refreshToken) return reply.status(400).send({ error: 'refreshToken required' });
    try {
      const { userId } = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET!);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(401).send({ error: 'User not found' });
      return createTokens(userId);
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });

  app.get('/me', async (request, reply) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Unauthorized' });
    try {
      const { userId } = verifyToken(auth.slice(7), process.env.JWT_ACCESS_SECRET!);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          shooterAlias: true,
          ipscNumber: true,
          pzssNumber: true,
          region: true,
          tier: true,
          notifySignup: true,
          notifyResults: true,
          createdAt: true,
        },
      });
      if (!user) return reply.status(401).send({ error: 'User not found' });
      return user;
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  app.patch<{
    Body: {
      name?: string;
      shooterAlias?: string;
      ipscNumber?: string;
      pzssNumber?: string;
      region?: string;
      notifySignup?: boolean;
      notifyResults?: boolean;
    };
  }>('/me', async (request, reply) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Unauthorized' });
    try {
      const { userId } = verifyToken(auth.slice(7), process.env.JWT_ACCESS_SECRET!);
      const updated = await prisma.user.update({
        where: { id: userId },
        data: request.body,
        select: {
          id: true,
          email: true,
          name: true,
          shooterAlias: true,
          ipscNumber: true,
          pzssNumber: true,
          region: true,
          tier: true,
          notifySignup: true,
          notifyResults: true,
        },
      });
      return updated;
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
}
