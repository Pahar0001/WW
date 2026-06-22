# Планирование поездки (Фаза 1)

Билеты, документы, календарь событий и напоминания. Доступно на странице
`/trips/<slug>/plan` (только для вошедших; ссылка «Планирование →» появляется на
странице поездки у авторизованных).

## Сущности БД
- **Ticket** — билет: `kind` (FLIGHT/TRAIN/BUS/FERRY/OTHER), `carrier`, `code`
  (номер рейса), `fromLocation`, `toLocation`, `departAt`, `arriveAt`, `seat`,
  `notes`, `fileUrl` (PDF), `createdById`.
- **TripDocument** — документ: `title`, `category`, `fileUrl`, `mime`.
- **CalendarEvent** — событие: `type` (FLIGHT/HOTEL_CHECKIN/HOTEL_CHECKOUT/
  EXCURSION/MEETING/REMINDER/OTHER), `title`, `startAt`, `endAt`, `location`, `notes`.
- **Reminder** — `offsetMinutes` (60=1ч, 1440=1д, 10080=1нед, или своё), `channel`
  (EMAIL/PUSH/NONE), `sent`, `sentAt`.

## API
| Метод | Маршрут | Доступ |
|------|---------|--------|
| GET | `/api/trips/:slug/planning` | вошедший |
| POST | `/api/trips/:slug/tickets` · `/documents` · `/events` | ORGANIZER+ |
| DELETE | `/api/tickets/:id` · `/documents/:id` · `/events/:id` | ORGANIZER+ |

Файлы (PDF/изображения) грузятся через `/api/uploads` (до 15 МБ) → S3/Supabase
или локальный диск.

## Напоминания
`PlanningService` запускает фоновый воркер каждые 60 с: находит несработавшие
напоминания, у которых `startAt − offsetMinutes ≤ сейчас`, и шлёт письмо автору
события через `EmailService` (Resend если задан `RESEND_API_KEY`, иначе лог).
Архитектура канало-независима (`channel`) — задел под push-уведомления.

## UI
- **Билеты** — список + форма (тип, перевозчик, номер, откуда/куда, даты, место, PDF).
- **Документы** — список со скачиванием + загрузка (название, категория, файл).
- **Календарь** — вид «По дням» (группировка) и «Месяц» (сетка с числом событий);
  форма события с пресетами напоминаний (1ч/1день/1неделя + произвольно).
