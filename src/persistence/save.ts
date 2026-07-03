import { Simulation } from '../sim/simulation.ts';
import { World } from '../world/world.ts';
import type { Agent } from '../sim/agent.ts';
import { RNG } from '../sim/rng.ts';
import { StatsHistory, type StatSnapshot } from '../sim/stats.ts';

const STORAGE_KEY = 'zivacci-save-v1';
const SAVE_VERSION = 1;

interface SaveData {
  version: number;
  seed: number;
  simTimeSec: number;
  totalBorn: number;
  totalDied: number;
  world: {
    width: number;
    height: number;
    dayLengthSec: number;
    timeOfDay: number;
    dayCount: number;
    food: World['food'];
  };
  agents: Agent[];
  stats: StatSnapshot[];
}

export function serializeSimulation(sim: Simulation): SaveData {
  return {
    version: SAVE_VERSION,
    seed: sim.seed,
    simTimeSec: sim.simTimeSec,
    totalBorn: sim.totalBorn,
    totalDied: sim.totalDied,
    world: {
      width: sim.world.width,
      height: sim.world.height,
      dayLengthSec: sim.world.dayLengthSec,
      timeOfDay: sim.world.timeOfDay,
      dayCount: sim.world.dayCount,
      food: sim.world.food,
    },
    agents: [...sim.agents.values()],
    stats: sim.stats.snapshots,
  };
}

export function saveToLocalStorage(sim: Simulation): void {
  const data = serializeSimulation(sim);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadFromLocalStorage(): SaveData | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as SaveData;
}

export function exportToFile(sim: Simulation): void {
  const data = serializeSimulation(sim);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zivacci-svet-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function applySaveData(sim: Simulation, data: SaveData): void {
  sim.seed = data.seed;
  sim.rng = new RNG(data.seed);
  sim.simTimeSec = data.simTimeSec;
  sim.totalBorn = data.totalBorn;
  sim.totalDied = data.totalDied;

  const world = new World({
    width: data.world.width,
    height: data.world.height,
    seed: data.seed ^ 0x9e3779b9,
    foodSpawnIntervalSec: 2.2,
    maxFood: 60,
    dayLengthSec: data.world.dayLengthSec,
  });
  world.timeOfDay = data.world.timeOfDay;
  world.dayCount = data.world.dayCount;
  world.food = data.world.food;
  sim.world = world;

  sim.agents = new Map(data.agents.map((a) => [a.id, a]));
  sim.stats = StatsHistory.fromJSON(data.stats);
  sim.selectedAgentId = null;
}
