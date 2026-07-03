import type { Agent } from './agent.ts';
import { createAgent, REPRODUCTION_COOLDOWN_SEC } from './agent.ts';
import { crossoverAndMutate } from './genome.ts';
import { isMatureAndReadyToMate } from './ai.ts';
import type { RNG } from './rng.ts';

const REPRODUCTION_COST = 30; // hlad+energie cena za zplození potomka

export interface ReproductionResult {
  child: Agent;
}

/** Zkusí zplodit potomka ze dvou agentů. Volající musí ověřit blízkost. */
export function tryReproduce(a: Agent, b: Agent, rng: RNG): ReproductionResult | null {
  if (!isMatureAndReadyToMate(a) || !isMatureAndReadyToMate(b)) return null;

  const childGenome = crossoverAndMutate(a.genome, b.genome, rng);
  const child = createAgent(rng, {
    x: (a.x + b.x) / 2 + rng.range(-8, 8),
    y: (a.y + b.y) / 2 + rng.range(-8, 8),
    genome: childGenome,
    generation: Math.max(a.generation, b.generation) + 1,
    parentIds: [a.id, b.id],
  });

  a.needs.hunger = Math.max(0, a.needs.hunger - REPRODUCTION_COST);
  a.needs.energy = Math.max(0, a.needs.energy - REPRODUCTION_COST * 0.5);
  b.needs.hunger = Math.max(0, b.needs.hunger - REPRODUCTION_COST);
  b.needs.energy = Math.max(0, b.needs.energy - REPRODUCTION_COST * 0.5);
  a.reproductionCooldown = REPRODUCTION_COOLDOWN_SEC;
  b.reproductionCooldown = REPRODUCTION_COOLDOWN_SEC;
  a.childIds.push(child.id);
  b.childIds.push(child.id);

  return { child };
}
