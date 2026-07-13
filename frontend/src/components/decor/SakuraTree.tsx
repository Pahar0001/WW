/**
 * A calm, ink-wash sakura tree for the desktop background. Branches sway gently
 * (CSS, paused under prefers-reduced-motion). Everything is very low-contrast and
 * sits on the -z-10 layer with pointer-events:none, so it never obscures text.
 *
 * Colours come from the theme `--primary` (trunk/branches, monochrome ink) with
 * soft pink blossom clusters, so it adapts to light and dark.
 */

// One blossom cluster — a few translucent pink dots around a point.
function Blossoms({ x, y, r = 16 }: { x: number; y: number; r?: number }) {
  const dots: [number, number, number][] = [
    [0, 0, r], [-r * 0.7, -r * 0.4, r * 0.7], [r * 0.7, -r * 0.3, r * 0.75],
    [-r * 0.4, r * 0.6, r * 0.6], [r * 0.5, r * 0.5, r * 0.65], [0, -r * 0.8, r * 0.6],
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      {dots.map(([dx, dy, rr], i) => (
        <circle key={i} cx={dx} cy={dy} r={rr} fill="hsl(348 60% 78%)" opacity={0.4} />
      ))}
      {dots.slice(0, 3).map(([dx, dy], i) => (
        <circle key={`c${i}`} cx={dx} cy={dy} r={2.2} fill="hsl(348 50% 62%)" opacity={0.4} />
      ))}
    </g>
  );
}

export function SakuraTree() {
  return (
    <svg
      className="absolute -bottom-2 -right-16 hidden h-[62vh] max-h-[640px] w-auto opacity-40 md:block lg:-right-6"
      viewBox="0 0 420 520"
      fill="none"
      aria-hidden
      style={{ color: 'hsl(var(--primary))' }}
    >
      {/* Trunk — static, rooted at the bottom-right. */}
      <path
        d="M330 520 C 322 430, 300 380, 270 330 C 250 296, 232 270, 226 240"
        stroke="currentColor" strokeOpacity="0.16" strokeWidth="16" strokeLinecap="round"
      />

      {/* Canopy — sways as a whole around the trunk top. */}
      <g className="sakura-canopy">
        {/* Main limbs */}
        <g stroke="currentColor" strokeOpacity="0.15" strokeLinecap="round" fill="none">
          <path d="M232 264 C 196 232, 150 214, 110 206" strokeWidth="9" />
          <path d="M244 250 C 250 206, 244 160, 222 120" strokeWidth="9" />
          <path d="M250 268 C 296 244, 340 236, 372 240" strokeWidth="8" />
          <path d="M238 300 C 210 286, 176 286, 148 300" strokeWidth="6" />
          <path d="M256 286 C 300 278, 344 286, 380 308" strokeWidth="6" />
          <path d="M238 232 C 224 196, 196 176, 168 168" strokeWidth="6" />
        </g>

        {/* Twigs that sway a touch more for parallax */}
        <g className="sakura-branch" stroke="currentColor" strokeOpacity="0.13" strokeLinecap="round" strokeWidth="4" fill="none">
          <path d="M120 208 C 96 196, 78 172, 70 150" />
          <path d="M222 124 C 206 104, 184 92, 160 86" />
          <path d="M224 126 C 240 100, 264 86, 290 82" />
          <path d="M366 240 C 386 224, 398 200, 402 178" />
        </g>

        {/* Blossom clusters at the branch tips + filler */}
        <g className="sakura-blossoms">
          <Blossoms x={70} y={146} r={20} />
          <Blossoms x={108} y={196} r={17} />
          <Blossoms x={158} y={84} r={19} />
          <Blossoms x={222} y={112} r={22} />
          <Blossoms x={292} y={80} r={18} />
          <Blossoms x={372} y={236} r={20} />
          <Blossoms x={404} y={176} r={16} />
          <Blossoms x={150} y={300} r={16} />
          <Blossoms x={200} y={170} r={18} />
          <Blossoms x={300} y={150} r={16} />
          <Blossoms x={168} y={166} r={17} />
          <Blossoms x={380} y={306} r={18} />
          <Blossoms x={260} y={210} r={15} />
        </g>
      </g>
    </svg>
  );
}
