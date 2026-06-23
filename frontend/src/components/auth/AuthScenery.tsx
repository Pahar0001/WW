'use client';

/**
 * Ambient pastel scene for the auth pages — a calm shan-shui (ink-wash)
 * landscape: layered mountains, a soft sun disc, drifting mist and falling
 * sakura petals. Deliberately low-contrast so it invites without shouting.
 * Pure SVG/CSS, theme-aware (sage from --primary), pointer-events-none.
 */
export function AuthScenery() {
  // A few petals with varied positions/timing for a natural drift.
  const petals = [
    { left: '12%', delay: '0s', dur: '14s', size: 11 },
    { left: '26%', delay: '5s', dur: '18s', size: 8 },
    { left: '44%', delay: '9s', dur: '16s', size: 10 },
    { left: '63%', delay: '2s', dur: '20s', size: 9 },
    { left: '78%', delay: '11s', dur: '15s', size: 12 },
    { left: '90%', delay: '7s', dur: '19s', size: 7 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Soft pastel wash: sage + dusty rose + warm sand, all faint. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(135% 90% at 78% 6%, hsl(var(--primary) / 0.16), transparent 55%),' +
            'radial-gradient(120% 85% at 8% 100%, rgba(214,166,158,0.18), transparent 60%),' +
            'radial-gradient(120% 80% at 98% 92%, rgba(230,205,170,0.16), transparent 60%)',
        }}
      />

      {/* Shan-shui ridges + sun, anchored to the bottom. */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[70vh] w-full"
        viewBox="0 0 1440 600"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        {/* Pale sun disc, behind the ridges. */}
        <circle cx="1085" cy="205" r="112" fill="rgba(214,166,158,0.16)" />
        <circle cx="1085" cy="205" r="112" stroke="hsl(var(--primary) / 0.22)" strokeWidth="1.5" />

        {/* Two distant birds. */}
        <path d="M 250 150 q 14 -11 28 0 q 14 -11 28 0" stroke="hsl(var(--primary) / 0.4)" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 330 178 q 10 -8 20 0 q 10 -8 20 0" stroke="hsl(var(--primary) / 0.3)" strokeWidth="1.4" strokeLinecap="round" />

        {/* Distant ridge. */}
        <path
          d="M0,392 C 200,338 320,372 460,338 S 760,300 940,348 S 1250,312 1440,356 L1440,600 L0,600 Z"
          fill="hsl(var(--primary) / 0.07)"
        />
        {/* Drifting mist band. */}
        <ellipse className="auth-mist" cx="720" cy="430" rx="620" ry="16" fill="rgba(255,255,255,0.05)" />
        {/* Mid ridge. */}
        <path
          d="M0,470 C 240,408 380,452 540,418 S 900,452 1080,428 S 1320,460 1440,436 L1440,600 L0,600 Z"
          fill="hsl(var(--primary) / 0.12)"
        />
        {/* Near ridge — gentle peaks. */}
        <path
          d="M0,556 C 150,500 250,540 360,506 C 470,472 560,548 680,512 C 800,476 900,556 1030,508 C 1160,460 1280,548 1440,512 L1440,600 L0,600 Z"
          fill="hsl(var(--primary) / 0.2)"
        />
        {/* Soft water line / foreground. */}
        <rect x="0" y="572" width="1440" height="28" fill="hsl(var(--primary) / 0.08)" />
      </svg>

      {/* Falling sakura petals. */}
      {petals.map((p, i) => (
        <span
          key={i}
          className="auth-petal absolute top-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}

      <style jsx>{`
        .auth-petal {
          background: radial-gradient(circle at 30% 30%, rgba(222,176,170,0.9), rgba(205,150,150,0.55));
          border-radius: 100% 0 100% 0;
          opacity: 0;
          will-change: transform, opacity;
          animation-name: petal-fall;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes petal-fall {
          0% { transform: translate3d(0, -8vh, 0) rotate(0deg); opacity: 0; }
          12% { opacity: 0.75; }
          50% { transform: translate3d(34px, 45vh, 0) rotate(180deg); }
          88% { opacity: 0.7; }
          100% { transform: translate3d(-10px, 108vh, 0) rotate(360deg); opacity: 0; }
        }
        :global(.auth-mist) {
          animation: auth-mist-drift 26s ease-in-out infinite alternate;
          will-change: transform;
        }
        @keyframes auth-mist-drift {
          from { transform: translateX(-40px); }
          to { transform: translateX(40px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-petal, :global(.auth-mist) { animation: none; }
          .auth-petal { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
