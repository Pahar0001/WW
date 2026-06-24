/**
 * Site-wide ambient backdrop — a calm, soft "cartoon" landscape: a faint warm
 * sun, a few slowly drifting rounded clouds, gentle layered hills along the
 * bottom, and a handful of slow sakura petals. Everything is low-contrast and
 * filled (no busy strokes) so it never competes with body text.
 */

function Cloud({ scale = 1 }: { scale?: number }) {
  return (
    <svg width={120 * scale} height={48 * scale} viewBox="0 0 120 48" fill="none" aria-hidden>
      <g fill="hsl(var(--primary) / 0.06)">
        <ellipse cx="38" cy="32" rx="30" ry="16" />
        <ellipse cx="64" cy="26" rx="26" ry="20" />
        <ellipse cx="88" cy="32" rx="24" ry="14" />
        <rect x="20" y="30" width="84" height="16" rx="8" />
      </g>
    </svg>
  );
}

export function SiteScenery() {
  const petals = [
    { left: '14%', delay: '0s', dur: '26s', size: 9 },
    { left: '46%', delay: '9s', dur: '30s', size: 8 },
    { left: '78%', delay: '5s', dur: '28s', size: 10 },
  ];
  const clouds = [
    { top: '12%', scale: 1.1, delay: '0s', dur: '110s' },
    { top: '24%', scale: 0.7, delay: '-40s', dur: '150s' },
    { top: '8%', scale: 0.9, delay: '-80s', dur: '130s' },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Soft warm sun, high and to the side. */}
      <div
        className="absolute right-[12%] top-[10%] h-40 w-40 rounded-full"
        style={{
          background: 'radial-gradient(circle at 50% 50%, hsl(38 70% 70% / 0.18), hsl(38 70% 70% / 0) 70%)',
        }}
      />

      {/* Slowly drifting rounded clouds. */}
      {clouds.map((c, i) => (
        <div
          key={i}
          className="site-cloud"
          style={{ top: c.top, animationDelay: c.delay, animationDuration: c.dur }}
        >
          <Cloud scale={c.scale} />
        </div>
      ))}

      {/* Gentle layered cartoon hills along the very bottom. */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[34vh] w-full"
        viewBox="0 0 1440 360"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        {/* far, rounded hill */}
        <path
          d="M0,250 C 220,180 420,180 640,235 C 880,295 1080,200 1440,250 L1440,360 L0,360 Z"
          fill="hsl(var(--primary) / 0.04)"
        />
        {/* nearer, rounder hill */}
        <path
          d="M0,300 C 260,250 460,300 720,300 C 980,300 1180,255 1440,300 L1440,360 L0,360 Z"
          fill="hsl(var(--primary) / 0.07)"
        />
      </svg>

      {/* A few slow sakura petals. */}
      {petals.map((p, i) => (
        <span
          key={i}
          className="site-petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  );
}
