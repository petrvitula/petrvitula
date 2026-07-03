import type { Genome } from './genome.ts';

export const NEEDS_MAX = 100;

/** Potřeby agenta, 0 (kritické) .. 100 (plně uspokojeno). */
export interface Needs {
  hunger: number;
  energy: number;
  social: number;
}

export function createFullNeeds(rng?: { range(min: number, max: number): number }): Needs {
  // volitelně mírně náhodné startovní hodnoty, aby noví agenti nebyli identičtí
  const base = rng ? rng.range(70, 100) : 100;
  return { hunger: base, energy: base, social: rng ? rng.range(50, 100) : 100 };
}

const HUNGER_DECAY_PER_SEC = 0.9;
const ENERGY_DECAY_IDLE_PER_SEC = 0.35;
const ENERGY_DECAY_MOVING_PER_SEC = 0.85;
const SOCIAL_DECAY_PER_SEC = 0.55;
const SOCIAL_GAIN_NEAR_OTHERS_PER_SEC = 4;
const ENERGY_REGEN_RESTING_PER_SEC = 9;

export interface DecayContext {
  genome: Genome;
  isMoving: boolean;
  isResting: boolean;
  nearbyAgentCount: number;
}

/** Mutuje `needs` in-place podle plynutí simulačního času `dt` (sekundy). */
export function decayNeeds(needs: Needs, ctx: DecayContext, dt: number): void {
  needs.hunger = clamp(needs.hunger - HUNGER_DECAY_PER_SEC * ctx.genome.metabolism * dt);

  if (ctx.isResting) {
    needs.energy = clamp(needs.energy + ENERGY_REGEN_RESTING_PER_SEC * dt);
  } else {
    const rate = ctx.isMoving ? ENERGY_DECAY_MOVING_PER_SEC : ENERGY_DECAY_IDLE_PER_SEC;
    needs.energy = clamp(needs.energy - rate * dt);
  }

  if (ctx.nearbyAgentCount > 0) {
    needs.social = clamp(needs.social + SOCIAL_GAIN_NEAR_OTHERS_PER_SEC * dt);
  } else {
    needs.social = clamp(needs.social - SOCIAL_DECAY_PER_SEC * ctx.genome.sociability * dt);
  }
}

function clamp(v: number): number {
  return Math.min(NEEDS_MAX, Math.max(0, v));
}

/** Kvadratická urgence — kritické hodnoty vyčnívají mnohem víc než mírný pokles. */
export function urgency(need: number): number {
  const deficit = (NEEDS_MAX - need) / NEEDS_MAX;
  return deficit * deficit;
}
