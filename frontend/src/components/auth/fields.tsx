'use client';

/**
 * «Умные» поля auth-форм: плавающие лейблы, показ/скрытие пароля,
 * индикатор надёжности и живая валидация ДО отправки формы.
 * Стиль — фирменный: стекло, золото фокуса, мягкие переходы.
 */

import { useId, useState, type InputHTMLAttributes } from 'react';

const baseField =
  'peer w-full rounded-xl border border-ink-line bg-ink/70 px-4 pb-2.5 pt-5 text-paper outline-none transition-all duration-300 focus:border-aurora/70 focus:ring-2 focus:ring-aurora/20';
const floatLabel =
  'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper-faint transition-all duration-200 ' +
  'peer-focus:top-3 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-[0.14em] peer-focus:text-aurora ' +
  'peer-[&:not(:placeholder-shown)]:top-3 peer-[&:not(:placeholder-shown)]:text-[11px] peer-[&:not(:placeholder-shown)]:uppercase peer-[&:not(:placeholder-shown)]:tracking-[0.14em]';

/** Текстовое поле с плавающим лейблом и необязательной живой подсказкой. */
export function AuthField({
  label,
  hint,
  invalid,
  ...rest
}: {
  label: string;
  /** Подсказка-валидация: показывается, когда invalid=true и поле заполнено. */
  hint?: string;
  invalid?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <div className="relative">
        {/* placeholder=" " нужен для CSS-детекции заполненности (:placeholder-shown) */}
        <input id={id} placeholder=" " className={baseField} {...rest} />
        <label htmlFor={id} className={floatLabel}>
          {label}
        </label>
      </div>
      {invalid && hint && <p className="mt-1.5 pl-1 text-xs text-amber-300/90">{hint}</p>}
    </div>
  );
}

/** Оценка надёжности пароля 0..4 — простые честные эвристики. */
export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-ZА-ЯЁ]/.test(pw) && /[a-zа-яё]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-zА-Яа-яЁё0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH: { label: string; cls: string }[] = [
  { label: 'слишком короткий', cls: 'bg-red-400' },
  { label: 'слабый', cls: 'bg-amber-400' },
  { label: 'нормальный', cls: 'bg-yellow-300' },
  { label: 'хороший', cls: 'bg-emerald-300' },
  { label: 'отличный', cls: 'bg-emerald-400' },
];

/** Поле пароля: глаз показа/скрытия + (опционально) шкала надёжности. */
export function PasswordField({
  label = 'Пароль',
  value,
  onChange,
  withMeter = false,
  ...rest
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  withMeter?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const id = useId();
  const [show, setShow] = useState(false);
  const score = passwordScore(value);
  const s = STRENGTH[Math.min(score, STRENGTH.length - 1)];

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder=" "
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseField} pr-12`}
          {...rest}
        />
        <label htmlFor={id} className={floatLabel}>
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-paper-faint transition-colors hover:text-paper"
        >
          {show ? (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.5 10.5 0 0 1 12 20C5 20 1 12 1 12a20 20 0 0 1 5.06-6.06M9.9 4.24A9.9 9.9 0 0 1 12 4c7 0 11 8 11 8a20 20 0 0 1-3.22 4.31M1 1l22 22M9.88 9.88a3 3 0 1 0 4.24 4.24" /></svg>
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>
      {withMeter && value.length > 0 && (
        <div className="mt-2 pl-1">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < score ? s.cls : 'bg-ink-line'}`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-paper-faint">Пароль: {s.label}</p>
        </div>
      )}
    </div>
  );
}

/** Простая живая проверка email (для подсказки до отправки). */
export const emailLooksValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
