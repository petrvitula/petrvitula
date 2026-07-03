import type { Genome } from './genome.ts';
import { randomGenome } from './genome.ts';
import { createFullNeeds, type Needs } from './needs.ts';
import type { RNG } from './rng.ts';

export type AgentAction = 'wander' | 'seekFood' | 'eat' | 'rest' | 'seekMate' | 'socialize';

export type CauseOfDeath = 'hunger' | 'exhaustion' | 'age';

export interface Agent {
  id: string;
  name: string;

  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number; // radiány, pro drobnou animaci

  genome: Genome;
  needs: Needs;
  health: number;

  age: number; // simulační sekundy života
  generation: number;
  parentIds: string[];
  childIds: string[];

  alive: boolean;
  action: AgentAction;
  actionTargetId: string | null;
  wanderTarget: { x: number; y: number } | null;
  reproductionCooldown: number;
  eatTimer: number;
  restTimer: number;
  socializeTimer: number;
  decisionTimer: number;

  causeOfDeath?: CauseOfDeath;
  diedAtAge?: number;
  diedAtSimTime?: number;

  animPhase: number;
  blinkTimer: number;
}

const NAME_POOL = [
  'Emil', 'Bětka', 'Fanda', 'Zuzka', 'Kuba', 'Anežka', 'Pepa', 'Milada',
  'Vojta', 'Klárka', 'Tonda', 'Verunka', 'Bruno', 'Julča', 'Standa', 'Nela',
  'Ota', 'Elinka', 'Matěj', 'Rozárka', 'Lojza', 'Terezka', 'Ferda', 'Alenka',
  'Honza', 'Maruška', 'Vencl', 'Blanka', 'Radek', 'Petra', 'Zdenek', 'Ivana',
];

let idCounter = 0;
export function nextAgentId(): string {
  idCounter += 1;
  return `a${idCounter}_${Date.now().toString(36)}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export interface CreateAgentOptions {
  x: number;
  y: number;
  genome?: Genome;
  generation?: number;
  parentIds?: string[];
}

export function createAgent(rng: RNG, opts: CreateAgentOptions): Agent {
  return {
    id: nextAgentId(),
    name: rng.pick(NAME_POOL),
    x: opts.x,
    y: opts.y,
    vx: 0,
    vy: 0,
    facing: rng.range(0, Math.PI * 2),
    genome: opts.genome ?? randomGenome(rng),
    needs: createFullNeeds(rng),
    health: 100,
    age: 0,
    generation: opts.generation ?? 0,
    parentIds: opts.parentIds ?? [],
    childIds: [],
    alive: true,
    action: 'wander',
    actionTargetId: null,
    wanderTarget: null,
    reproductionCooldown: 0,
    eatTimer: 0,
    restTimer: 0,
    socializeTimer: 0,
    decisionTimer: rng.range(0, 0.4),
    animPhase: rng.range(0, Math.PI * 2),
    blinkTimer: rng.range(1, 4),
  };
}

export const MATURE_AGE_SEC = 55; // sim-sekundy, než se agent může množit
export const OLD_AGE_SEC = 480; // po tomto věku roste šance na smrt stářím
export const EAT_DURATION_SEC = 1.1;
export const REST_TARGET_ENERGY = 90;
export const SOCIALIZE_DURATION_SEC = 1.4;
export const REPRODUCTION_COOLDOWN_SEC = 40;
export const EAT_RADIUS_PADDING = 6;
export const INTERACT_RADIUS_PADDING = 8;
