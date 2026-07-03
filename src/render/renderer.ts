import type { Simulation } from '../sim/simulation.ts';
import type { Camera } from './camera.ts';
import { drawAgent } from './agentRenderer.ts';
import { drawFood } from './foodRenderer.ts';

const GRASS_LIGHT = '#7fbf5e';
const GRASS_DARK = '#6fae4f';
const GRID_STEP = 64;

/** `viewW`/`viewH` jsou v CSS pixelech (ne v device-pixel bufferu plátna). */
export function render(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  sim: Simulation,
  camera: Camera
): void {
  ctx.clearRect(0, 0, viewW, viewH);

  drawGround(ctx, viewW, viewH, sim, camera);

  for (const food of sim.world.food) {
    drawFood(ctx, food, camera);
  }

  const agents = [...sim.agents.values()].sort((a, b) => a.y - b.y);
  for (const agent of agents) {
    drawAgent(ctx, agent, camera, agent.id === sim.selectedAgentId);
  }

  drawNightOverlay(ctx, viewW, viewH, sim);
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  sim: Simulation,
  camera: Camera
): void {
  const topLeft = camera.screenToWorld(0, 0);
  const bottomRight = camera.screenToWorld(viewW, viewH);

  ctx.fillStyle = GRASS_LIGHT;
  const worldScreen = camera.worldToScreen(0, 0);
  const worldScreenEnd = camera.worldToScreen(sim.world.width, sim.world.height);
  ctx.fillRect(worldScreen.x, worldScreen.y, worldScreenEnd.x - worldScreen.x, worldScreenEnd.y - worldScreen.y);

  ctx.strokeStyle = GRASS_DARK;
  ctx.lineWidth = 1;
  const startX = Math.floor(Math.max(0, topLeft.x) / GRID_STEP) * GRID_STEP;
  const endX = Math.min(sim.world.width, bottomRight.x);
  const startY = Math.floor(Math.max(0, topLeft.y) / GRID_STEP) * GRID_STEP;
  const endY = Math.min(sim.world.height, bottomRight.y);

  ctx.beginPath();
  for (let x = startX; x <= endX; x += GRID_STEP) {
    const s1 = camera.worldToScreen(x, Math.max(0, topLeft.y));
    const s2 = camera.worldToScreen(x, Math.min(sim.world.height, bottomRight.y));
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
  }
  for (let y = startY; y <= endY; y += GRID_STEP) {
    const s1 = camera.worldToScreen(Math.max(0, topLeft.x), y);
    const s2 = camera.worldToScreen(Math.min(sim.world.width, bottomRight.x), y);
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
  }
  ctx.stroke();

  // ohraničení světa
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(
    worldScreen.x,
    worldScreen.y,
    worldScreenEnd.x - worldScreen.x,
    worldScreenEnd.y - worldScreen.y
  );
}

function drawNightOverlay(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  sim: Simulation
): void {
  const night = sim.world.nightFactor();
  if (night <= 0.02) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const r = 40 + (1 - night) * 60;
  const g = 45 + (1 - night) * 60;
  const b = 90 + (1 - night) * 80;
  ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${night * 0.75})`;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.restore();
}
