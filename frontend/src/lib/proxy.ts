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

  const idempotent = req.method === 'GET' || req.method === 'HEAD';
  const init: RequestInit = { method: req.method, headers, redirect: 'manual' };
  if (!idempotent) {
    // Buffer the body — robust for JSON and multipart uploads (capped at 6 MB
    // upstream). Avoids streaming/duplex pitfalls across runtimes.
    init.body = await req.arrayBuffer();
  }

  // Retry only idempotent requests (never POST/PUT/DELETE — avoids double writes),
  // to ride out a sleeping backend's cold start on the free tier.
  const delays = idempotent ? [0, 1000, 2500, 4500, 7000] : [0];
  let lastErr = 'upstream unreachable';
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
    try {
      const res = await fetch(targetUrl, { ...init, signal: AbortSignal.timeout(25000) });
      if (res.status >= 500 && idempotent && i < delays.length - 1) continue; // cold start -> retry
      const outHeaders = new Headers();
      res.headers.forEach((v, k) => {
        if (!HOP_BY_HOP.has(k.toLowerCase())) outHeaders.set(k, v);
      });
      return new Response(res.body, { status: res.status, headers: outHeaders });
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  return new Response(JSON.stringify({ error: 'upstream unreachable', detail: lastErr }), {
    status: 502,
    headers: { 'content-type': 'application/json' },
  });
}
