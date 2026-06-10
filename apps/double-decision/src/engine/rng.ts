/**
 * Tiny seedable RNG so tests can be deterministic. Mulberry32.
 */
export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(arr: readonly T[]): T;
  sample<T>(arr: readonly T[], count: number): T[];
}

export function createRng(seed: number): Rng {
  let state = seed | 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (maxExclusive: number) => Math.floor(next() * maxExclusive);
  const pick = <T,>(arr: readonly T[]) => arr[int(arr.length)];
  const sample = <T,>(arr: readonly T[], count: number): T[] => {
    if (count > arr.length) throw new Error('sample count exceeds array length');
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  };
  return { next, int, pick, sample };
}
