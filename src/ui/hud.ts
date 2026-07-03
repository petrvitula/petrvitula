import type { Simulation, SpeedMultiplier } from '../sim/simulation.ts';

export interface HudCallbacks {
  onSpeedChange: (speed: SpeedMultiplier) => void;
  onToggleFoodMode: () => void;
  onToggleDashboard: () => void;
  onSave: () => void;
  onLoad: () => void;
}

export class Hud {
  private populationEl = document.getElementById('stat-population') as HTMLElement;
  private dayEl = document.getElementById('stat-day') as HTMLElement;
  private generationEl = document.getElementById('stat-generation') as HTMLElement;
  private speedButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.speed-btn'));
  private foodBtn = document.getElementById('btn-throw-food') as HTMLButtonElement;
  private dashboardBtn = document.getElementById('btn-dashboard') as HTMLButtonElement;
  private saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
  private loadBtn = document.getElementById('btn-load') as HTMLButtonElement;

  constructor(callbacks: HudCallbacks) {
    for (const btn of this.speedButtons) {
      btn.addEventListener('click', () => {
        const speed = Number(btn.dataset['speed']) as SpeedMultiplier;
        callbacks.onSpeedChange(speed);
        this.setActiveSpeed(speed);
      });
    }
    this.foodBtn.addEventListener('click', () => callbacks.onToggleFoodMode());
    this.dashboardBtn.addEventListener('click', () => callbacks.onToggleDashboard());
    this.saveBtn.addEventListener('click', () => callbacks.onSave());
    this.loadBtn.addEventListener('click', () => callbacks.onLoad());
  }

  setActiveSpeed(speed: SpeedMultiplier): void {
    for (const btn of this.speedButtons) {
      btn.classList.toggle('active', Number(btn.dataset['speed']) === speed);
    }
  }

  setFoodModeActive(active: boolean): void {
    this.foodBtn.classList.toggle('active', active);
  }

  update(sim: Simulation): void {
    this.populationEl.textContent = String(sim.getLiveAgents().length);
    this.dayEl.textContent = String(sim.world.dayCount + 1);
    let maxGen = 0;
    for (const a of sim.agents.values()) maxGen = Math.max(maxGen, a.generation);
    this.generationEl.textContent = String(maxGen + 1);
  }
}
