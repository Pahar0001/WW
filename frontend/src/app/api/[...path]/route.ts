import { proxy, backendOrigin } from '@/lib/proxy';

// Proxy /api/* to the backend at runtime (same-origin for the browser).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handler(req: Request, ctx: { params: { path: string[] } }) {
  const search = new URL(req.url).search;
  const target = `${backendOrigin()}/api/${ctx.params.path.join('/')}${search}`;
  return proxy(req, target);
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
