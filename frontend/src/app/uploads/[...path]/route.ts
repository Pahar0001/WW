import { proxy, backendOrigin } from '@/lib/proxy';

// Proxy /uploads/* (user-uploaded images) to the backend at runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handler(req: Request, ctx: { params: { path: string[] } }) {
  const target = `${backendOrigin()}/uploads/${ctx.params.path.join('/')}`;
  return proxy(req, target);
}

export { handler as GET, handler as HEAD };
