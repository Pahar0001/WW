import { SakuraTree } from './SakuraTree';

/**
 * Site-wide ambient backdrop — a calm, soft "cartoon" landscape: a faint warm
 * sun, a few slowly drifting rounded clouds, gentle layered hills along the
 * bottom, a swaying ink-wash sakura tree (desktop), and slow falling petals.
 * Everything is low-contrast and sits behind content so it never competes with
 * body text.
 */

function Cloud({ scale = 1 }: { scale?: number }) {
  return (
    <svg width={120 * scale} height={48 * scale} viewBox="0 0 120 48" fill="none" aria-hidden>
      <g fill="hsl(var(--primary) / 0.04)">
        <ellipse cx="38" cy="32" rx="30" ry="16" />
        <ellipse cx="64" cy="26" rx="26" ry="20" />
        <ellipse cx="88" cy="32" rx="24" ry="14" />
        <rect x="20" y="30" width="84" height="16" rx="8" />
      </g>
    </svg>
  );
}

export function SiteScenery() {
  // Gentle sakura — fewer, softer petals for a calmer, less "busy" backdrop.
  const petals = [
    { left: '12%', delay: '0s', dur: '34s', size: 8 },
    { left: '38%', delay: '13s', dur: '38s', size: 7 },
    { left: '68%', delay: '7s', dur: '32s', size: 9 },
    { left: '88%', delay: '19s', dur: '40s', size: 7 },
  ];
  const clouds = [
    { top: '11%', scale: 1.0, delay: '0s', dur: '150s' },
    { top: '20%', scale: 0.7, delay: '-70s', dur: '180s' },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Soft warm sun, high and to the side. */}
      <div
        className="absolute right-[12%] top-[10%] h-40 w-40 rounded-full"
        style={{
          background: 'radial-gradient(circle at 50% 50%, hsl(38 60% 72% / 0.11), hsl(38 60% 72% / 0) 70%)',
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

      {/* Swaying ink-wash sakura tree (desktop only). */}
      <SakuraTree />

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
