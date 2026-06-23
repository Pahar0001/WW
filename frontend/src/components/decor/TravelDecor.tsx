// Ambient travel-themed SVG art. Purely decorative: every element is
// pointer-events-none and uses currentColor at low opacity, so it never covers
// or blocks interactive controls. Animations are CSS/SMIL (no JS) and are
// disabled under prefers-reduced-motion via globals.css.

/** The Vela constellation (the brand's namesake — a ship's sail). Stars twinkle. */
export function Constellation({ className = '' }: { className?: string }) {
  const stars: [number, number, number][] = [
    [18, 30, 2.2], [46, 18, 1.6], [74, 34, 2.6], [96, 60, 1.8],
    [70, 74, 2.2], [40, 64, 1.5], [22, 86, 1.9],
  ];
  const links = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg viewBox="0 0 120 110" fill="none" aria-hidden className={`pointer-events-none ${className}`}>
      <g stroke="currentColor" strokeWidth="0.6" opacity="0.5">
        {links.slice(0, -1).map((i) => (
          <line key={i} x1={stars[i][0]} y1={stars[i][1]} x2={stars[i + 1][0]} y2={stars[i + 1][1]} />
        ))}
      </g>
      {stars.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="currentColor"
          style={{ animation: `twinkle ${2.4 + (i % 3) * 0.7}s ease-in-out ${i * 0.3}s infinite` }} />
      ))}
    </svg>
  );
}

/** A dotted flight route with two location pins and a paper-plane that flies along it. */
export function RoutePath({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 170" fill="none" aria-hidden className={`pointer-events-none ${className}`}>
      <path
        id="vela-route"
        d="M28 134 C 140 20, 286 20, 396 96"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 9" opacity="0.55"
      />
      {/* endpoints */}
      <g fill="currentColor">
        <circle cx="28" cy="134" r="4.5" />
        <circle cx="28" cy="134" r="9" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <circle cx="396" cy="96" r="4.5" />
        <circle cx="396" cy="96" r="9" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      </g>
      {/* paper-plane travelling along the route */}
      <g fill="currentColor" opacity="0.9">
        <path d="M9 0 L-9 6 L-3 0 L-9 -6 Z" transform="scale(1.05)">
          <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#vela-route" />
          </animateMotion>
        </path>
      </g>
    </svg>
  );
}

/** Topographic contour lines — a calm cartographic accent. */
export function Contours({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 220" fill="none" aria-hidden className={`pointer-events-none ${className}`}>
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4">
        <path d="M30 150 C 60 120, 90 120, 120 140 S 180 170, 200 150" />
        <path d="M24 130 C 60 96, 100 96, 132 120 S 184 150, 206 128" opacity="0.85" />
        <path d="M20 110 C 58 72, 104 72, 140 100 S 186 132, 210 106" opacity="0.7" />
        <path d="M30 90 C 64 56, 108 58, 142 84 S 182 112, 200 90" opacity="0.55" />
        <path d="M44 72 C 74 46, 110 48, 138 70" opacity="0.4" />
      </g>
    </svg>
  );
}

/** A small compass rose watermark. */
export function CompassRose({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden className={`pointer-events-none ${className}`}>
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <g fill="currentColor">
        <path d="M50 12 L56 50 L50 46 L44 50 Z" opacity="0.85" />
        <path d="M50 88 L44 50 L50 54 L56 50 Z" opacity="0.45" />
        <path d="M12 50 L50 44 L46 50 L50 56 Z" opacity="0.45" />
        <path d="M88 50 L50 56 L54 50 L50 44 Z" opacity="0.45" />
      </g>
      <circle cx="50" cy="50" r="2.4" fill="currentColor" />
    </svg>
  );
}
