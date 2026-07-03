import type { RNG } from './rng.ts';

/**
 * Geny agenta. Každý gen je plovoucí číslo v pevných mezích (GENE_BOUNDS).
 * Ovlivňují jak vzhled (hue, size), tak chování (speed, metabolism, ...).
 */
export interface Genome {
  speed: number;
  metabolism: number;
  size: number;
  hue: number;
  sociability: number;
  visionRange: number;
  reproductionThreshold: number;
}

export type GeneKey = keyof Genome;

export const GENE_BOUNDS: Record<GeneKey, [number, number]> = {
  speed: [18, 85],
  metabolism: [0.55, 1.85],
  size: [6, 15],
  hue: [0, 360],
  sociability: [0.2, 1.6],
  visionRange: [70, 240],
  reproductionThreshold: [0.5, 0.88],
};

export const GENE_LABELS: Record<GeneKey, string> = {
  speed: 'Rychlost',
  metabolism: 'Metabolismus',
  size: 'Velikost',
  hue: 'Barva',
  sociability: 'Sociabilita',
  visionRange: 'Dosah zraku',
  reproductionThreshold: 'Práh rozmnožení',
};

const GENE_KEYS = Object.keys(GENE_BOUNDS) as GeneKey[];

function clampToBounds(key: GeneKey, value: number): number {
  const bounds = GENE_BOUNDS[key];
  const [min, max] = bounds;
  if (key === 'hue') {
    // hue je cyklický, ale pro jednoduchost ho jen zabalíme do 0-360
    return ((value % 360) + 360) % 360;
  }
  return Math.min(max, Math.max(min, value));
}

export function randomGenome(rng: RNG): Genome {
  const genome = {} as Genome;
  for (const key of GENE_KEYS) {
    const bounds = GENE_BOUNDS[key];
    genome[key] = rng.range(bounds[0], bounds[1]);
  }
  return genome;
}

/** Zprůměruje geny dvou rodičů a s malou pravděpodobností každý gen zmutuje. */
export function crossoverAndMutate(
  a: Genome,
  b: Genome,
  rng: RNG,
  mutationRate = 0.18,
  mutationAmount = 0.16
): Genome {
  const child = {} as Genome;
  for (const key of GENE_KEYS) {
    const bounds = GENE_BOUNDS[key];
    const span = bounds[1] - bounds[0];
    // mírně náhodné míchání (ne přesný průměr) pro víc variability
    const mixT = rng.range(0.3, 0.7);
    let value = a[key] * mixT + b[key] * (1 - mixT);
    if (rng.chance(mutationRate)) {
      value += rng.gaussian(0, span * mutationAmount);
    }
    child[key] = clampToBounds(key, value);
  }
  return child;
}

/** Normalizuje hodnotu genu do 0..1 vzhledem k jeho mezím — pro grafy. */
export function normalizeGene(key: GeneKey, value: number): number {
  const bounds = GENE_BOUNDS[key];
  const [min, max] = bounds;
  return (value - min) / (max - min);
}

export function averageGenome(genomes: Genome[]): Genome | null {
  if (genomes.length === 0) return null;
  const sum = {} as Genome;
  for (const key of GENE_KEYS) sum[key] = 0;
  for (const g of genomes) {
    for (const key of GENE_KEYS) sum[key] += g[key];
  }
  const avg = {} as Genome;
  for (const key of GENE_KEYS) avg[key] = sum[key] / genomes.length;
  return avg;
}

export { GENE_KEYS };
