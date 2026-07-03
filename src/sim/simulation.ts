import { RNG, makeSeed } from './rng.ts';
import { World } from '../world/world.ts';
import type { Agent, CauseOfDeath } from './agent.ts';
import { createAgent, OLD_AGE_SEC, resetIdCounter } from './agent.ts';
import { decayNeeds } from './needs.ts';
import { decideAction } from './ai.ts';
import { stepAgent } from './behavior.ts';
import { tryReproduce } from './reproduction.ts';
import { countNearbyAgents } from './spatial.ts';
import { StatsHistory } from './stats.ts';

export const FIXED_DT = 1 / 30;
export const SOCIAL_PROXIMITY_RADIUS = 46;
export const TOMBSTONE_DURATION_SEC = 3.5;
export const MAX_POPULATION = 220;

const STARVE_HEALTH_RATE = 6;
const EXHAUST_HEALTH_RATE = 4;
const HEALTH_REGEN_RATE = 5;

export type SpeedMultiplier = 0 | 1 | 2 | 4 | 8;

export interface SimulationConfig {
  worldWidth: number;
  worldHeight: number;
  seed?: number;
  initialPopulation?: number;
  foodSpawnIntervalSec?: number;
  maxFood?: number;
  dayLengthSec?: number;
}

export class Simulation {
  world: World;
  agents: Map<string, Agent> = new Map();
  rng: RNG;
  seed: number;
  speedMultiplier: SpeedMultiplier = 1;
  simTimeSec = 0;
  stats = new StatsHistory();
  selectedAgentId: string | null = null;

  totalBorn = 0;
  totalDied = 0;

  constructor(config: SimulationConfig) {
    this.seed = config.seed ?? makeSeed();
    this.rng = new RNG(this.seed);
    this.world = new World({
      width: config.worldWidth,
      height: config.worldHeight,
      seed: this.seed ^ 0x9e3779b9,
      foodSpawnIntervalSec: config.foodSpawnIntervalSec ?? 2.2,
      maxFood: config.maxFood ?? 60,
      dayLengthSec: config.dayLengthSec ?? 90,
    });
    this.spawnInitialPopulation(config.initialPopulation ?? 18);
  }

  spawnInitialPopulation(count: number): void {
    for (let i = 0; i < count; i++) {
      const agent = createAgent(this.rng, {
        x: this.rng.range(40, this.world.width - 40),
        y: this.rng.range(40, this.world.height - 40),
      });
      this.agents.set(agent.id, agent);
      this.totalBorn += 1;
    }
    // pre-seed food so the world isn't empty on frame 1
    for (let i = 0; i < 24; i++) this.world.spawnRandomFood();
  }

  getLiveAgents(): Agent[] {
    const list: Agent[] = [];
    for (const a of this.agents.values()) if (a.alive) list.push(a);
    return list;
  }

  throwFoodAt(x: number, y: number): void {
    const clamped = this.world.clampToWorld(x, y, 10);
    this.world.spawnFoodAt(clamped.x, clamped.y, 55);
  }

  /** Jeden deterministický krok simulace o pevném `dt`. Nezávisí na FPS. */
  tick(dt: number): void {
    this.simTimeSec += dt;
    const liveAgents = this.getLiveAgents();
    const newborns: Agent[] = [];
    const reproducedThisTick = new Set<string>();

    for (const agent of liveAgents) {
      agent.age += dt;
      if (agent.reproductionCooldown > 0) agent.reproductionCooldown -= dt;
      this.updateBlink(agent, dt);

      agent.decisionTimer -= dt;
      const isCommitted = agent.action === 'eat' || (agent.action === 'socialize' && agent.socializeTimer > 0);
      if (agent.decisionTimer <= 0 && !isCommitted) {
        decideAction(agent, { allAgents: liveAgents, food: this.world.food, rng: this.rng });
        agent.decisionTimer = this.rng.range(0.3, 0.55);
      }

      const events = stepAgent(agent, { world: this.world, agentsById: this.agents, rng: this.rng, dt });

      if (events.ateFoodId) {
        const food = this.world.food.find((f) => f.id === events.ateFoodId);
        if (food) {
          agent.needs.hunger = Math.min(100, agent.needs.hunger + food.nutrition);
          this.world.removeFood(food.id);
        }
      }

      if (events.reproduceWithId && !reproducedThisTick.has(agent.id)) {
        const mate = this.agents.get(events.reproduceWithId);
        if (mate && mate.alive && !reproducedThisTick.has(mate.id) && this.agents.size < MAX_POPULATION) {
          const result = tryReproduce(agent, mate, this.rng);
          if (result) {
            newborns.push(result.child);
            reproducedThisTick.add(agent.id);
            reproducedThisTick.add(mate.id);
          }
        }
      }

      const nearby = countNearbyAgents(agent, liveAgents, SOCIAL_PROXIMITY_RADIUS);
      decayNeeds(
        agent.needs,
        {
          genome: agent.genome,
          isMoving: agent.vx !== 0 || agent.vy !== 0,
          isResting: agent.action === 'rest',
          nearbyAgentCount: nearby,
        },
        dt
      );

      this.updateHealthAndDeath(agent, dt);
    }

    for (const child of newborns) {
      this.agents.set(child.id, child);
      this.totalBorn += 1;
    }

    // odstraň dávno mrtvé (po odeznění "náhrobku")
    for (const [id, agent] of this.agents) {
      if (!agent.alive && agent.diedAtSimTime !== undefined) {
        if (this.simTimeSec - agent.diedAtSimTime > TOMBSTONE_DURATION_SEC) {
          this.agents.delete(id);
          if (this.selectedAgentId === id) this.selectedAgentId = null;
        }
      }
    }

    this.world.update(dt);
    this.stats.update(dt, this.simTimeSec, this.world.dayCount, this.getLiveAgents());
  }

  private updateBlink(agent: Agent, dt: number): void {
    if (agent.blinkTimer > 0) {
      agent.blinkTimer -= dt;
      if (agent.blinkTimer <= 0) agent.blinkTimer = -0.12;
    } else {
      agent.blinkTimer += dt;
      if (agent.blinkTimer > 0) agent.blinkTimer = this.rng.range(2, 6);
    }
  }

  private updateHealthAndDeath(agent: Agent, dt: number): void {
    let health = agent.health;
    let dying = false;

    if (agent.needs.hunger <= 0) {
      health -= STARVE_HEALTH_RATE * dt;
      dying = true;
    }
    if (agent.needs.energy <= 0) {
      health -= EXHAUST_HEALTH_RATE * dt;
      dying = true;
    }
    if (agent.age > OLD_AGE_SEC) {
      const overAge = agent.age - OLD_AGE_SEC;
      health -= (0.12 + overAge * 0.0025) * dt;
      dying = true;
    }
    if (!dying && agent.needs.hunger > 40 && agent.needs.energy > 40) {
      health = Math.min(100, health + HEALTH_REGEN_RATE * dt);
    }

    agent.health = Math.max(0, Math.min(100, health));

    if (agent.health <= 0 && agent.alive) {
      agent.alive = false;
      agent.diedAtAge = agent.age;
      agent.diedAtSimTime = this.simTimeSec;
      agent.causeOfDeath = determineCauseOfDeath(agent);
      this.totalDied += 1;
    }
  }

  setSpeed(speed: SpeedMultiplier): void {
    this.speedMultiplier = speed;
  }

  reset(config: SimulationConfig): void {
    resetIdCounter();
    this.seed = config.seed ?? makeSeed();
    this.rng = new RNG(this.seed);
    this.world = new World({
      width: config.worldWidth,
      height: config.worldHeight,
      seed: this.seed ^ 0x9e3779b9,
      foodSpawnIntervalSec: config.foodSpawnIntervalSec ?? 2.2,
      maxFood: config.maxFood ?? 60,
      dayLengthSec: config.dayLengthSec ?? 90,
    });
    this.agents.clear();
    this.simTimeSec = 0;
    this.stats = new StatsHistory();
    this.selectedAgentId = null;
    this.totalBorn = 0;
    this.totalDied = 0;
    this.spawnInitialPopulation(config.initialPopulation ?? 18);
  }
}

function determineCauseOfDeath(agent: Agent): CauseOfDeath {
  if (agent.needs.hunger <= 0) return 'hunger';
  if (agent.needs.energy <= 0) return 'exhaustion';
  return 'age';
}
