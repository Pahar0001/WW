/**
 * Site-wide ambient horizon — a very faint shan-shui ridge line and sun disc
 * fixed to the bottom of the viewport. Ties the calm pastel concept across every
 * page without touching readability (kept extremely low-contrast, behind content).
 */
export function SiteScenery() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[52vh] overflow-hidden" aria-hidden>
      <svg
        className="absolute inset-x-0 bottom-0 h-full w-full"
        viewBox="0 0 1440 500"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        {/* faint sun */}
        <circle cx="1190" cy="150" r="104" fill="rgba(214,166,158,0.07)" />
        {/* distant ridge */}
        <path
          d="M0,332 C 220,284 360,318 520,288 S 880,318 1060,296 S 1300,322 1440,302 L1440,500 L0,500 Z"
          fill="hsl(var(--primary) / 0.045)"
        />
        {/* nearer ridge */}
        <path
          d="M0,422 C 180,374 300,410 440,384 C 600,354 760,422 920,390 C 1080,358 1240,420 1440,390 L1440,500 L0,500 Z"
          fill="hsl(var(--primary) / 0.075)"
        />
      </svg>
    </div>
  );
}
