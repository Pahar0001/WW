/**
 * Site-wide ambient backdrop — a very faint, blurred shan-shui ridge low at the
 * bottom plus a few slow sakura petals. Tuned to stay out of the way: extremely
 * low-contrast and softened so it never competes with body text.
 */
export function SiteScenery() {
  const petals = [
    { left: '10%', delay: '0s', dur: '22s', size: 10 },
    { left: '32%', delay: '7s', dur: '26s', size: 8 },
    { left: '54%', delay: '13s', dur: '20s', size: 11 },
    { left: '73%', delay: '4s', dur: '24s', size: 9 },
    { left: '88%', delay: '10s', dur: '28s', size: 7 },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Faint, blurred ridge anchored to the very bottom. */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[32vh] w-full"
        style={{ filter: 'blur(2px)' }}
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        {/* distant ridge */}
        <path
          d="M0,196 C 240,164 380,188 540,170 S 900,190 1080,176 S 1320,196 1440,182 L1440,320 L0,320 Z"
          fill="hsl(var(--primary) / 0.03)"
        />
        {/* nearer ridge */}
        <path
          d="M0,250 C 200,216 320,242 460,224 C 640,202 800,246 980,226 C 1140,208 1280,244 1440,226 L1440,320 L0,320 Z"
          fill="hsl(var(--primary) / 0.05)"
        />
      </svg>

      {/* Slow, faint sakura petals. */}
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
