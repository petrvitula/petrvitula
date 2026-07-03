import type { Agent } from './agent.ts';
import { EAT_DURATION_SEC, REST_TARGET_ENERGY, SOCIALIZE_DURATION_SEC } from './agent.ts';
import { isMatureAndReadyToMate } from './ai.ts';
import { distance } from './spatial.ts';
import type { World } from '../world/world.ts';
import type { RNG } from './rng.ts';

export interface StepContext {
  world: World;
  agentsById: Map<string, Agent>;
  rng: RNG;
  dt: number;
}

export interface StepEvents {
  ateFoodId?: string;
  reproduceWithId?: string;
}

const ARRIVE_RADIUS = 6;
const WANDER_RADIUS = 170;

/** Pohne agentem podle jeho aktuální akce a provede krátké "commit" akce (jíst, odpočívat, socializovat). */
export function stepAgent(agent: Agent, ctx: StepContext): StepEvents {
  const events: StepEvents = {};
  agent.animPhase += ctx.dt * 6;

  switch (agent.action) {
    case 'wander':
      stepWander(agent, ctx);
      break;
    case 'seekFood':
      stepSeekFood(agent, ctx);
      break;
    case 'eat':
      stepEat(agent, ctx, events);
      break;
    case 'rest':
      stepRest(agent, ctx);
      break;
    case 'seekMate':
      stepSeekMate(agent, ctx, events);
      break;
    case 'socialize':
      stepSocialize(agent, ctx);
      break;
  }

  const clamped = ctx.world.clampToWorld(agent.x, agent.y, agent.genome.size);
  agent.x = clamped.x;
  agent.y = clamped.y;

  return events;
}

function stepWander(agent: Agent, ctx: StepContext): void {
  if (!agent.wanderTarget || distance(agent.x, agent.y, agent.wanderTarget.x, agent.wanderTarget.y) < ARRIVE_RADIUS) {
    agent.wanderTarget = pickWanderTarget(agent, ctx);
  }
  moveToward(agent, agent.wanderTarget.x, agent.wanderTarget.y, agent.genome.speed * 0.55, ctx.dt);
}

function pickWanderTarget(agent: Agent, ctx: StepContext): { x: number; y: number } {
  const angle = ctx.rng.range(0, Math.PI * 2);
  const dist = ctx.rng.range(WANDER_RADIUS * 0.3, WANDER_RADIUS);
  const raw = { x: agent.x + Math.cos(angle) * dist, y: agent.y + Math.sin(angle) * dist };
  return ctx.world.clampToWorld(raw.x, raw.y, agent.genome.size + 4);
}

function stepSeekFood(agent: Agent, ctx: StepContext): void {
  const food = agent.actionTargetId ? ctx.world.food.find((f) => f.id === agent.actionTargetId) : undefined;
  if (!food) {
    agent.action = 'wander';
    agent.actionTargetId = null;
    agent.decisionTimer = 0;
    stepWander(agent, ctx);
    return;
  }
  const d = distance(agent.x, agent.y, food.x, food.y);
  if (d <= agent.genome.size + 6) {
    agent.vx = 0;
    agent.vy = 0;
    agent.action = 'eat';
    agent.eatTimer = EAT_DURATION_SEC;
  } else {
    moveToward(agent, food.x, food.y, agent.genome.speed, ctx.dt);
  }
}

function stepEat(agent: Agent, ctx: StepContext, events: StepEvents): void {
  agent.eatTimer -= ctx.dt;
  if (agent.eatTimer <= 0) {
    if (agent.actionTargetId) events.ateFoodId = agent.actionTargetId;
    agent.action = 'wander';
    agent.actionTargetId = null;
    agent.decisionTimer = 0;
  }
}

function stepRest(agent: Agent, ctx: StepContext): void {
  agent.vx = 0;
  agent.vy = 0;
  if (agent.needs.energy >= REST_TARGET_ENERGY) {
    agent.action = 'wander';
    agent.decisionTimer = 0;
  }
  void ctx;
}

function stepSeekMate(agent: Agent, ctx: StepContext, events: StepEvents): void {
  const mate = agent.actionTargetId ? ctx.agentsById.get(agent.actionTargetId) : undefined;
  if (!mate || !mate.alive || !isMatureAndReadyToMate(mate) || !isMatureAndReadyToMate(agent)) {
    agent.action = 'wander';
    agent.actionTargetId = null;
    agent.decisionTimer = 0;
    stepWander(agent, ctx);
    return;
  }
  const d = distance(agent.x, agent.y, mate.x, mate.y);
  const arriveDist = agent.genome.size + mate.genome.size + 4;
  if (d <= arriveDist) {
    agent.vx = 0;
    agent.vy = 0;
    events.reproduceWithId = mate.id;
    agent.action = 'socialize';
    agent.socializeTimer = SOCIALIZE_DURATION_SEC;
  } else {
    moveToward(agent, mate.x, mate.y, agent.genome.speed, ctx.dt);
  }
}

function stepSocialize(agent: Agent, ctx: StepContext): void {
  const friend = agent.actionTargetId ? ctx.agentsById.get(agent.actionTargetId) : undefined;
  if (!friend || !friend.alive) {
    agent.action = 'wander';
    agent.actionTargetId = null;
    agent.decisionTimer = 0;
    return;
  }
  const d = distance(agent.x, agent.y, friend.x, friend.y);
  const arriveDist = agent.genome.size + friend.genome.size + 6;
  if (d <= arriveDist) {
    agent.vx = 0;
    agent.vy = 0;
    if (agent.socializeTimer <= 0) agent.socializeTimer = SOCIALIZE_DURATION_SEC;
    agent.socializeTimer -= ctx.dt;
    agent.needs.social = Math.min(100, agent.needs.social + 18 * ctx.dt);
    if (agent.socializeTimer <= 0) {
      agent.action = 'wander';
      agent.actionTargetId = null;
      agent.decisionTimer = 0;
    }
  } else {
    moveToward(agent, friend.x, friend.y, agent.genome.speed, ctx.dt);
  }
}

function moveToward(agent: Agent, tx: number, ty: number, speed: number, dt: number): void {
  const dx = tx - agent.x;
  const dy = ty - agent.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.001) {
    agent.vx = 0;
    agent.vy = 0;
    return;
  }
  const nx = dx / dist;
  const ny = dy / dist;
  const step = Math.min(dist, speed * dt);
  agent.x += nx * step;
  agent.y += ny * step;
  agent.vx = nx * speed;
  agent.vy = ny * speed;
  agent.facing = Math.atan2(ny, nx);
}
