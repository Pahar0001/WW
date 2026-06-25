import Link from 'next/link';

interface AvatarUser { id?: string; name?: string | null; email?: string | null; image?: string | null }

/** Round avatar with an initials fallback. Optionally links to the profile. */
export function Avatar({ user, size = 36, link = false }: { user: AvatarUser | null; size?: number; link?: boolean }) {
  const label = (user?.name || user?.email || '?').trim();
  const initials = label.slice(0, 1).toUpperCase();
  const inner = user?.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.image} alt={label} className="h-full w-full rounded-full object-cover" />
  ) : (
    <span className="grid h-full w-full place-items-center rounded-full bg-aurora/15 font-medium text-aurora" style={{ fontSize: size * 0.42 }}>
      {initials}
    </span>
  );
  const box = (
    <span className="inline-block shrink-0 overflow-hidden rounded-full border border-ink-line" style={{ width: size, height: size }}>
      {inner}
    </span>
  );
  if (link && user?.id) return <Link href={`/u/${user.id}`} data-cursor="hover">{box}</Link>;
  return box;
}
