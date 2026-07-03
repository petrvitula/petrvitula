import type { Agent, AgentAction } from './agent.ts';
import { MATURE_AGE_SEC } from './agent.ts';
import { urgency } from './needs.ts';
import { findNearestAgent, findNearestFood } from './spatial.ts';
import type { FoodItem } from '../world/world.ts';
import type { RNG } from './rng.ts';

const HUNGER_WEIGHT = 1.15;
const ENERGY_WEIGHT = 1.0;
const SOCIAL_WEIGHT = 0.9;
const IDLE_THRESHOLD = 0.1; // pod touto urgencí agent jen bloumá
const HYSTERESIS_MARGIN = 0.08; // brání "blikání" mezi akcemi

export function isMatureAndReadyToMate(agent: Agent): boolean {
  return (
    agent.age >= MATURE_AGE_SEC &&
    agent.reproductionCooldown <= 0 &&
    agent.needs.hunger >= agent.genome.reproductionThreshold * 100 &&
    agent.needs.energy >= agent.genome.reproductionThreshold * 100
  );
}

export interface DecisionInputs {
  allAgents: Agent[];
  food: FoodItem[];
  rng: RNG;
}

/**
 * Vybere akci s nejvyšší "utilitou" (urgence potřeby × váha). Nastaví
 * agent.action a agent.actionTargetId. Volá se jen periodicky (ne každý
 * tick) — viz agent.decisionTimer — což zároveň funguje jako přirozená
 * hystereze proti přepínání akcí každý snímek.
 */
export function decideAction(agent: Agent, inputs: DecisionInputs): void {
  const hungerScore = urgency(agent.needs.hunger) * HUNGER_WEIGHT;
  const energyScore = urgency(agent.needs.energy) * ENERGY_WEIGHT;
  const socialScore = urgency(agent.needs.social) * SOCIAL_WEIGHT * agent.genome.sociability;

  const scores: { action: AgentAction; score: number }[] = [
    { action: 'seekFood', score: hungerScore },
    { action: 'rest', score: energyScore },
    { action: 'seekMate', score: socialScore },
  ];
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0]!;

  // hystereze: pokud agent už dělá "podobnou" akci, drž ji, dokud nová
  // možnost výrazně nevyhrává
  const currentScore = scoreForCurrentAction(agent, hungerScore, energyScore, socialScore);
  const shouldSwitch = best.score > currentScore + HYSTERESIS_MARGIN || currentScore <= 0;

  const chosenCategory: 'food' | 'rest' | 'social' | 'idle' =
    best.score < IDLE_THRESHOLD
      ? 'idle'
      : !shouldSwitch
        ? categoryOfAction(agent.action)
        : best.action === 'seekFood'
          ? 'food'
          : best.action === 'rest'
            ? 'rest'
            : 'social';

  applyCategory(agent, chosenCategory, inputs);
}

function categoryOfAction(action: AgentAction): 'food' | 'rest' | 'social' | 'idle' {
  switch (action) {
    case 'seekFood':
    case 'eat':
      return 'food';
    case 'rest':
      return 'rest';
    case 'seekMate':
    case 'socialize':
      return 'social';
    default:
      return 'idle';
  }
}

function scoreForCurrentAction(
  agent: Agent,
  hungerScore: number,
  energyScore: number,
  socialScore: number
): number {
  switch (categoryOfAction(agent.action)) {
    case 'food':
      return hungerScore;
    case 'rest':
      return energyScore;
    case 'social':
      return socialScore;
    default:
      return -1;
  }
}

function applyCategory(
  agent: Agent,
  category: 'food' | 'rest' | 'social' | 'idle',
  inputs: DecisionInputs
): void {
  if (category === 'food') {
    const food = findNearestFood(agent, inputs.food);
    if (food) {
      agent.action = 'seekFood';
      agent.actionTargetId = food.id;
      return;
    }
    setWander(agent);
    return;
  }

  if (category === 'rest') {
    agent.action = 'rest';
    agent.actionTargetId = null;
    return;
  }

  if (category === 'social') {
    if (isMatureAndReadyToMate(agent)) {
      const mate = findNearestAgent(agent, inputs.allAgents, {
        filter: (o) => isMatureAndReadyToMate(o),
      });
      if (mate) {
        agent.action = 'seekMate';
        agent.actionTargetId = mate.id;
        return;
      }
    }
    const friend = findNearestAgent(agent, inputs.allAgents);
    if (friend) {
      agent.action = 'socialize';
      agent.actionTargetId = friend.id;
      return;
    }
    setWander(agent);
    return;
  }

  setWander(agent);
}

function setWander(agent: Agent): void {
  if (agent.action !== 'wander') {
    agent.action = 'wander';
    agent.actionTargetId = null;
  }
}
