import { proxy, backendOrigin } from '@/lib/proxy';

/**
 * Обработчик `/api/auth/*` — тот же прокси на бэкенд, но со ВХОДОМ и ВЫХОДОМ,
 * оформленными cookie.
 *
 * Зачем: до этого токен жил в localStorage, откуда его забирает любой XSS —
 * одна уязвимость в стороннем скрипте или в разметке пользовательского контента
 * означала угон сессии. Здесь токен из ответа бэкенда перекладывается в
 * httpOnly-cookie: браузер отправляет её сам, а сценарии на странице прочитать
 * не могут.
 *
 * Рядом кладётся `vela_session` — БЕЗ токена, только отметка «сессия есть».
 * Она нужна интерфейсу: httpOnly-cookie не видна из JS, а множеству компонентов
 * нужно знать, вошёл ли пользователь, не спрашивая сервер.
 *
 * ⚠️ Этот файл перехватывает `/api/auth/*` у общего `api/[...path]`: статический
 * сегмент `auth` специфичнее, и Next выбирает его. Все действия, кроме входа,
 * регистрации и выхода, проксируются без изменений.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_COOKIE = 'vela_token';
const SESSION_COOKIE = 'vela_session';
/** Должно совпадать с JWT_EXPIRES бэкенда (по умолчанию 7d). */
const MAX_AGE = 7 * 24 * 3600;

/** Действия, ответ которых содержит токен. */
const SETS_SESSION = new Set(['login', 'register']);

function isHttps(req: Request): boolean {
  const proto = req.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  try {
    return new URL(req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

function cookie(name: string, value: string, opts: { httpOnly: boolean; maxAge: number; secure: boolean }) {
  return (
    `${name}=${value}; Path=/; Max-Age=${opts.maxAge}; SameSite=Lax` +
    (opts.httpOnly ? '; HttpOnly' : '') +
    (opts.secure ? '; Secure' : '')
  );
}

async function handler(req: Request, ctx: { params: { action: string } }) {
  const action = ctx.params.action;
  const search = new URL(req.url).search;

  // Выход: чистим обе cookie. На бэкенд ходить незачем — токен без состояния,
  // сервер его не хранит и отозвать ему нечего.
  if (action === 'logout' && req.method === 'POST') {
    const secure = isHttps(req);
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.append('set-cookie', cookie(TOKEN_COOKIE, '', { httpOnly: true, maxAge: 0, secure }));
    headers.append('set-cookie', cookie(SESSION_COOKIE, '', { httpOnly: false, maxAge: 0, secure }));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  const res = await proxy(req, `${backendOrigin()}/api/auth/${action}${search}`);

  const created = res.status === 200 || res.status === 201;
  if (!SETS_SESSION.has(action) || !created) return res;

  // Тело читаем целиком: нужно достать токен и вернуть ответ БЕЗ него, чтобы
  // он вообще не попадал в JavaScript страницы.
  let body: any;
  try {
    body = await res.json();
  } catch {
    return res;
  }
  const token: unknown = body?.token;
  if (typeof token !== 'string' || !token) {
    return new Response(JSON.stringify(body), {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const secure = isHttps(req);
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', cookie(TOKEN_COOKIE, token, { httpOnly: true, maxAge: MAX_AGE, secure }));
  headers.append('set-cookie', cookie(SESSION_COOKIE, '1', { httpOnly: false, maxAge: MAX_AGE, secure }));

  const { token: _omit, ...rest } = body;
  return new Response(JSON.stringify(rest), { status: res.status, headers });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
