import type { Agent } from './agent.ts';
import type { FoodItem } from '../world/world.ts';

export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findNearestFood(agent: Agent, food: FoodItem[]): FoodItem | null {
  let best: FoodItem | null = null;
  let bestDist = agent.genome.visionRange;
  for (const f of food) {
    const d = distance(agent.x, agent.y, f.x, f.y);
    if (d <= bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

export interface NearestAgentOptions {
  maxDist?: number;
  filter?: (other: Agent) => boolean;
}

export function findNearestAgent(
  agent: Agent,
  others: Agent[],
  opts: NearestAgentOptions = {}
): Agent | null {
  let best: Agent | null = null;
  let bestDist = opts.maxDist ?? agent.genome.visionRange;
  for (const other of others) {
    if (other.id === agent.id || !other.alive) continue;
    if (opts.filter && !opts.filter(other)) continue;
    const d = distance(agent.x, agent.y, other.x, other.y);
    if (d <= bestDist) {
      bestDist = d;
      best = other;
    }
  }
  return best;
}

export function countNearbyAgents(agent: Agent, others: Agent[], radius: number): number {
  let count = 0;
  for (const other of others) {
    if (other.id === agent.id || !other.alive) continue;
    if (distance(agent.x, agent.y, other.x, other.y) <= radius) count += 1;
  }
  return count;
}
