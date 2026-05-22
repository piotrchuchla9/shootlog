import jwt from 'jsonwebtoken';

export function createTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '30d',
  });
  return { accessToken, refreshToken };
}

export function verifyToken(token: string, secret: string): { userId: string } {
  return jwt.verify(token, secret) as { userId: string };
}
