import * as bcrypt from 'bcryptjs';

/**
 * Стоимость bcrypt — одна на весь бэкенд, чтобы пароль, заданный админом при
 * сбросе, не оказался защищён слабее заданного самим пользователем.
 *
 * 12 вместо прежних 10: вчетверо дороже перебор по украденной базе, около
 * 250 мс на хеш. Старые хеши с cost=10 продолжают проверяться — стоимость
 * записана в самой строке хеша; они пересчитаются при следующей смене пароля.
 */
export const BCRYPT_ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, BCRYPT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
