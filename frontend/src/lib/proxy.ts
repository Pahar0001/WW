// Runtime reverse-proxy helper. The Next.js server forwards browser requests
// (/api/* and /uploads/*) to the backend, reading the backend URL from env at
// REQUEST time. This removes build-time API baking and cross-origin CORS:
// the browser always talks to its own origin.

export function backendOrigin(): string {
  // e.g. https://vela-api.onrender.com  (no trailing /api)
  return process.env.BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';
}

const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'content-encoding',
]);

export async function proxy(req: Request, targetUrl: string): Promise<Response> {
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers.set(k, v);
  });

  const init: RequestInit = { method: req.method, headers, redirect: 'manual' };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // Buffer the body — robust for JSON and multipart uploads (capped at 6 MB
    // upstream). Avoids streaming/duplex pitfalls across runtimes.
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(targetUrl, init);
    const outHeaders = new Headers();
    res.headers.forEach((v, k) => {
      if (!HOP_BY_HOP.has(k.toLowerCase())) outHeaders.set(k, v);
    });
    return new Response(res.body, { status: res.status, headers: outHeaders });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'upstream unreachable', detail: (e as Error).message }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
}
