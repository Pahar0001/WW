import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

/** OG-картинка главной: фирменная карточка Vela. */

export const alt = 'Vela — путешествия, которые запоминаются';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({
    eyebrow: 'Планирование путешествий',
    title: 'Путешествия, которые запоминаются',
    subtitle:
      'Готовые маршруты с планом по дням, конструктор, карты и честные данные из реальных источников.',
  });
}
