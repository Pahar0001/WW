import { verifyToken } from './jwt';
import { tokenOf } from '../modules/auth/auth.guards';

export interface Accessor {
  id: string;
  role: string;
}

/**
 * Необязательная авторизация для публичных эндпоинтов, которые ведут себя
 * по-разному для гостя и для участника: страница поездки, планировщик, лента.
 * Гость получает `null` — это не ошибка, а обычный случай.
 *
 * ⚠️ Читает токен ЧЕРЕЗ `tokenOf`, то есть и заголовок, и cookie. Раньше в трёх
 * модулях лежали свои копии, смотревшие только на `Authorization: Bearer`, и
 * после перехода сессий на httpOnly-cookie участник приватной поездки выглядел
 * для них гостем — страница отдавала 403 своему же владельцу. Новых копий не
 * заводить: правка тогда снова разъедется по трём файлам.
 */
export function optionalAccessor(req: any): Accessor | null {
  const token = tokenOf(req);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload ? { id: payload.sub, role: payload.role } : null;
}
