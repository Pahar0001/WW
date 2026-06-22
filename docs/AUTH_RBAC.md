# Авторизация и RBAC (Фаза 0)

## Модель безопасности
- **JWT (Bearer)**: вход выдаёт токен (по умолчанию на 7 дней, `JWT_EXPIRES`),
  подписанный `JWT_SECRET`. Браузер хранит токен и шлёт его в заголовке
  `Authorization: Bearer <token>` через прокси `/api`.
- **Пароли**: bcrypt (10 раундов). В БД хранится только `passwordHash`.
- **Guard'ы** (NestJS): `JwtAuthGuard` (проверяет токен, грузит пользователя,
  отклоняет заблокированных) и `RolesGuard` (проверяет `@Roles(...)`;
  `SUPER_ADMIN` проходит везде).

## Роли (глобальные)
| Роль | Возможности |
|------|-------------|
| `SUPER_ADMIN` | Полный доступ: смена ролей, удаление пользователей/поездок, аудит, настройки |
| `ADMIN` | Управление пользователями (блок/разблок/верификация/сброс пароля), управление поездками, статистика, аудит |
| `ORGANIZER` | Создание поездок и (в следующих фазах) управление участниками/маршрутами |
| `MEMBER` | Базовый участник (по умолчанию при регистрации) |

Плюс роль **в поездке** (`TripMember.role`): `ORGANIZER` / `MEMBER` — основа для
групповых поездок (используется в следующих фазах).

## Защищённые маршруты (API)
| Метод | Маршрут | Требуется |
|------|---------|-----------|
| POST | `/api/auth/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email` | публично |
| GET | `/api/auth/me` | любой вошедший |
| POST | `/api/trips` | `ORGANIZER`+ |
| DELETE | `/api/trips/:slug` | `ADMIN`+ |
| POST | `/api/uploads` | любой вошедший |
| GET | `/api/admin/stats`, `/users`, `/audit` | `ADMIN`+ |
| PATCH | `/api/admin/users/:id/role` | `SUPER_ADMIN` |
| POST | `/api/admin/users/:id/block` \| `/unblock` \| `/verify` \| `/reset-password` | `ADMIN`+ |
| DELETE | `/api/admin/users/:id` | `SUPER_ADMIN` |

Публичные маршруты (просмотр поездок, карта, аналитика) остаются открытыми.

## Новые таблицы БД
- **User** (расширена): `passwordHash`, `role`, `status` (ACTIVE/BLOCKED),
  `emailVerified`, `emailVerifyToken`, `passwordResetToken`, `passwordResetExpiry`,
  `updatedAt`.
- **TripMember**: `tripId`, `userId`, `role` (ORGANIZER/MEMBER), unique(tripId,userId).
- **AuditLog**: `userId?`, `action`, `objectType?`, `objectId?`, `ip?`, `meta?`, `createdAt`.
- Enums: `UserRole`, `UserStatus`, `TripMemberRole`.

> Применение схемы: на Render выполняется `prisma db push` при старте (новые
> таблицы создаются автоматически). Переход на полноценные миграции
> (`prisma migrate`) — отдельная задача (см. отчёт).

## Создание первого Super Admin
Задайте на сервисе **vela-api** (Render → Environment) переменные:
```
SUPERADMIN_EMAIL=ваш@email
SUPERADMIN_PASSWORD=надёжный_пароль
APP_URL=https://<адрес vela-web>   # для ссылок в письмах
JWT_SECRET=<генерируется Render автоматически>
```
При старте бэкенд **идемпотентно** создаст/обновит этого пользователя с ролью
`SUPER_ADMIN` и подтверждённым email. После деплоя войдите на `/login` этими
данными → откроется `/admin`.

## Email
Если задан `RESEND_API_KEY` — письма (подтверждение, сброс) уходят через Resend.
Если нет — ссылка пишется в лог бэкенда (работает без внешнего сервиса).

## Хранение токена (клиент)
Токен в `localStorage` (`vela_token`); страницы `/admin*` проверяют роль через
`/api/auth/me` и редиректят на `/login` при отсутствии прав. Для продакшена
рекомендуется перейти на httpOnly-cookie (см. отчёт, следующий этап).
