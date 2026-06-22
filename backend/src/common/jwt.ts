import * as jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me';
const EXPIRES = process.env.JWT_EXPIRES ?? '7d';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  // `expiresIn` accepts "7d"-style strings at runtime; the newer @types models
  // it as a template-literal type, so we bypass the over-strict signature.
  return (jwt.sign as any)(payload, SECRET, { expiresIn: EXPIRES });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
