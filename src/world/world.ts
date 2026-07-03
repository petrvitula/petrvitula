import { RNG } from '../sim/rng.ts';

export interface FoodItem {
  id: string;
  x: number;
  y: number;
  nutrition: number; // kolik hladu doplní
}

export interface WorldConfig {
  width: number;
  height: number;
  seed: number;
  foodSpawnIntervalSec: number;
  maxFood: number;
  dayLengthSec: number;
}

let foodIdCounter = 0;

/**
 * Spojitý 2D svět: rozměry, jídlo a den/noc cyklus. Neřeší agenty ani AI —
 * to je úkolem `sim/`. World se stará jen o prostředí, ve kterém agenti žijí.
 */
export class World {
  readonly width: number;
  readonly height: number;
  readonly rng: RNG;
  readonly dayLengthSec: number;

  food: FoodItem[] = [];
  private foodSpawnTimer = 0;
  private readonly foodSpawnIntervalSec: number;
  private readonly maxFood: number;

  /** Čas v rámci aktuálního dne, 0..dayLengthSec. */
  timeOfDay = 0;
  dayCount = 0;

  constructor(config: WorldConfig) {
    this.width = config.width;
    this.height = config.height;
    this.rng = new RNG(config.seed);
    this.foodSpawnIntervalSec = config.foodSpawnIntervalSec;
    this.maxFood = config.maxFood;
    this.dayLengthSec = config.dayLengthSec;
    // začneme v poledne, ať hráč hned vidí den
    this.timeOfDay = this.dayLengthSec * 0.3;
  }

  update(dt: number): void {
    this.timeOfDay += dt;
    if (this.timeOfDay >= this.dayLengthSec) {
      this.timeOfDay -= this.dayLengthSec;
      this.dayCount += 1;
    }

    this.foodSpawnTimer += dt;
    if (this.foodSpawnTimer >= this.foodSpawnIntervalSec) {
      this.foodSpawnTimer -= this.foodSpawnIntervalSec;
      if (this.food.length < this.maxFood) {
        this.spawnRandomFood();
      }
    }
  }

  spawnRandomFood(): FoodItem {
    const margin = 20;
    return this.spawnFoodAt(
      this.rng.range(margin, this.width - margin),
      this.rng.range(margin, this.height - margin)
    );
  }

  spawnFoodAt(x: number, y: number, nutrition = 42): FoodItem {
    foodIdCounter += 1;
    const item: FoodItem = { id: `f${foodIdCounter}`, x, y, nutrition };
    this.food.push(item);
    return item;
  }

  removeFood(id: string): void {
    const idx = this.food.findIndex((f) => f.id === id);
    if (idx !== -1) this.food.splice(idx, 1);
  }

  /** 0 = plný den, 1 = plná noc. Plynulý přechod přes soumrak/svítání. */
  nightFactor(): number {
    const t = this.timeOfDay / this.dayLengthSec; // 0..1
    // slunce nejvýš v t=0.25 (poledne dne, pokud den začíná východem v t=0),
    // půlnoc v t=0.75
    const angle = (t - 0.25) * Math.PI * 2;
    const brightness = Math.cos(angle); // 1 = poledne, -1 = půlnoc
    return clamp01((1 - brightness) / 2);
  }

  isNight(): boolean {
    return this.nightFactor() > 0.6;
  }

  clampToWorld(x: number, y: number, margin = 0): { x: number; y: number } {
    return {
      x: Math.min(this.width - margin, Math.max(margin, x)),
      y: Math.min(this.height - margin, Math.max(margin, y)),
    };
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
