import type { Genome } from './genome.ts';
import { averageGenome } from './genome.ts';
import type { Agent } from './agent.ts';

export interface StatSnapshot {
  simTimeSec: number;
  day: number;
  population: number;
  maxGeneration: number;
  avgGenome: Genome | null;
}

const MAX_SNAPSHOTS = 400;

/** Historie populace a průměrných genů v čase, pro evoluční dashboard. */
export class StatsHistory {
  snapshots: StatSnapshot[] = [];
  private recordIntervalSec: number;
  private timeSinceLastRecord = 0;

  constructor(recordIntervalSec = 4) {
    this.recordIntervalSec = recordIntervalSec;
  }

  update(dt: number, simTimeSec: number, day: number, liveAgents: Agent[]): void {
    this.timeSinceLastRecord += dt;
    if (this.timeSinceLastRecord < this.recordIntervalSec) return;
    this.timeSinceLastRecord = 0;
    this.record(simTimeSec, day, liveAgents);
  }

  record(simTimeSec: number, day: number, liveAgents: Agent[]): void {
    const genomes = liveAgents.map((a) => a.genome);
    const maxGeneration = liveAgents.reduce((m, a) => Math.max(m, a.generation), 0);
    this.snapshots.push({
      simTimeSec,
      day,
      population: liveAgents.length,
      maxGeneration,
      avgGenome: averageGenome(genomes),
    });
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      // downsample: zahoď každý druhý záznam, ať historie nezabírá donekonečna
      this.snapshots = this.snapshots.filter((_, i) => i % 2 === 0);
    }
  }

  toJSON(): StatSnapshot[] {
    return this.snapshots;
  }

  static fromJSON(data: StatSnapshot[]): StatsHistory {
    const h = new StatsHistory();
    h.snapshots = data;
    return h;
  }
}
