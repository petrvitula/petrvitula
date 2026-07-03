import './style.css';
import { Simulation, FIXED_DT, type SpeedMultiplier } from './sim/simulation.ts';
import { Camera } from './render/camera.ts';
import { render } from './render/renderer.ts';
import { Hud } from './ui/hud.ts';
import { Inspector } from './ui/inspector.ts';
import { Dashboard } from './ui/dashboard.ts';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  exportToFile,
  applySaveData,
} from './persistence/save.ts';
import { distance } from './sim/spatial.ts';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1000;

const canvas = document.getElementById('world-canvas') as HTMLCanvasElement;
const ctx = getContext2D(canvas);

function getContext2D(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = c.getContext('2d');
  if (!context) throw new Error('Canvas 2D context se nepodařilo získat.');
  return context;
}

const sim = new Simulation({
  worldWidth: WORLD_WIDTH,
  worldHeight: WORLD_HEIGHT,
  initialPopulation: 20,
});

const camera = new Camera();

function resizeCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
camera.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, window.innerWidth, window.innerHeight);
camera.zoom = Math.min(
  window.innerWidth / (WORLD_WIDTH + 120),
  window.innerHeight / (WORLD_HEIGHT + 120),
  1
);
camera.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, window.innerWidth, window.innerHeight);

let foodModeActive = false;

const inspector = new Inspector(() => {
  sim.selectedAgentId = null;
  inspector.hide();
});
inspector.onSelectAgent = (id) => {
  sim.selectedAgentId = id;
  inspector.show(id, sim);
};

const dashboard = new Dashboard(() => {});

const hud = new Hud({
  onSpeedChange: (speed: SpeedMultiplier) => sim.setSpeed(speed),
  onToggleFoodMode: () => {
    foodModeActive = !foodModeActive;
    hud.setFoodModeActive(foodModeActive);
    canvas.classList.toggle('food-mode', foodModeActive);
  },
  onToggleDashboard: () => dashboard.toggle(),
  onSave: () => {
    saveToLocalStorage(sim);
    exportToFile(sim);
  },
  onLoad: () => loadFileInput.click(),
});
hud.setActiveSpeed(sim.speedMultiplier);

const loadFileInput = document.getElementById('load-file-input') as HTMLInputElement;
loadFileInput.addEventListener('change', () => {
  const file = loadFileInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      applySaveData(sim, data);
    } catch (err) {
      console.error('Nepodařilo se načíst uložený svět:', err);
      alert('Soubor se nepodařilo načíst — je poškozený nebo nemá správný formát.');
    }
  };
  reader.readAsText(file);
  loadFileInput.value = '';
});

// zkusí automaticky obnovit poslední lokální uložení při startu
const auto = loadFromLocalStorage();
if (auto) {
  try {
    applySaveData(sim, auto);
  } catch (err) {
    console.warn('Automatické obnovení uloženého světa selhalo:', err);
  }
}

// --- Vstupy: pan / zoom / klik ---
let isDragging = false;
let dragMoved = false;
let lastPointer = { x: 0, y: 0 };

canvas.addEventListener('pointerdown', (e) => {
  isDragging = true;
  dragMoved = false;
  lastPointer = { x: e.clientX, y: e.clientY };
  canvas.classList.add('grabbing');
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
  camera.pan(dx, dy);
  lastPointer = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointerup', (e) => {
  isDragging = false;
  canvas.classList.remove('grabbing');
  if (!dragMoved) handleClick(e.clientX, e.clientY);
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  camera.zoomAt(e.clientX, e.clientY, factor);
}, { passive: false });

function handleClick(screenX: number, screenY: number): void {
  const world = camera.screenToWorld(screenX, screenY);

  if (foodModeActive) {
    sim.throwFoodAt(world.x, world.y);
    return;
  }

  let closest: { id: string; d: number } | null = null;
  for (const agent of sim.agents.values()) {
    const d = distance(agent.x, agent.y, world.x, world.y);
    const hitRadius = agent.genome.size + 8;
    if (d <= hitRadius && (!closest || d < closest.d)) {
      closest = { id: agent.id, d };
    }
  }

  if (closest) {
    sim.selectedAgentId = closest.id;
    inspector.show(closest.id, sim);
  } else {
    sim.selectedAgentId = null;
    inspector.hide();
  }
}

// --- Herní smyčka: pevný časový krok pro simulaci, oddělený od renderu ---
let lastFrameTime = performance.now();
let accumulator = 0;

function frame(now: number): void {
  const realDt = Math.min((now - lastFrameTime) / 1000, 0.25);
  lastFrameTime = now;

  if (sim.speedMultiplier > 0) {
    accumulator += realDt;
    while (accumulator >= FIXED_DT) {
      for (let i = 0; i < sim.speedMultiplier; i++) sim.tick(FIXED_DT);
      accumulator -= FIXED_DT;
    }
  }

  render(ctx, window.innerWidth, window.innerHeight, sim, camera);
  hud.update(sim);
  if (sim.selectedAgentId) inspector.show(sim.selectedAgentId, sim);
  dashboard.render(sim);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
