/** Seedovatelný, deterministický PRNG (mulberry32), aby simulace byla reprodukovatelná. */
export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Vrátí float v [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float v [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Celé číslo v [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** True s pravděpodobností p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    const item = arr[this.int(0, arr.length - 1)];
    if (item === undefined) throw new Error('RNG.pick: empty array');
    return item;
  }

  /** Normálně rozdělený šum (Box-Muller), užitečné pro mutace genů. */
  gaussian(mean = 0, stdDev = 1): number {
    const u1 = Math.max(this.next(), 1e-9);
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }
}

export function makeSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
