import {
  dayLoadIndex,
  variantLoad,
  relaxationVerdict,
  overallScore,
} from '../src/common/scoring';

describe('scoring engine', () => {
  it('rates a relaxed day low and a packed day high', () => {
    const calm = dayLoadIndex({ placeCount: 2, totalDwellMin: 180, totalTransitMin: 30 });
    const packed = dayLoadIndex({ placeCount: 6, totalDwellMin: 480, totalTransitMin: 360 });
    expect(calm).toBeLessThan(40);
    expect(packed).toBeGreaterThan(80);
  });

  it('flags tiring days above the comfort threshold', () => {
    const load = variantLoad([30, 95, 40, 88, 91]);
    expect(load.tiringDays).toEqual([2, 4, 5]);
    expect(load.peak).toBe(95);
  });

  it('suggests a calmer version when overloaded', () => {
    const load = variantLoad([95, 92, 90]);
    expect(relaxationVerdict(load).kind).toBe('too-heavy');
  });

  it('suggests enriching an empty itinerary', () => {
    const load = variantLoad([10, 15, 20]);
    expect(relaxationVerdict(load).kind).toBe('too-empty');
  });

  it('penalises load in the overall score', () => {
    const base = { comfort: 80, beauty: 80, history: 70, valueRatio: 75, uniqueness: 80, nature: 85 };
    const light = overallScore({ ...base, load: 20 });
    const heavy = overallScore({ ...base, load: 95 });
    expect(light).toBeGreaterThan(heavy);
  });
});
