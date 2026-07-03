import type { FoodItem } from '../world/world.ts';
import type { Camera } from './camera.ts';

export function drawFood(ctx: CanvasRenderingContext2D, food: FoodItem, camera: Camera): void {
  const screen = camera.worldToScreen(food.x, food.y);
  const r = 6 * camera.zoom;
  if (r < 1) return;

  ctx.beginPath();
  ctx.ellipse(screen.x, screen.y + r * 0.8, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#e6543f';
  ctx.fill();
  ctx.strokeStyle = '#a5301f';
  ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.stroke();

  // lísteček
  ctx.beginPath();
  ctx.ellipse(screen.x + r * 0.25, screen.y - r * 0.9, r * 0.45, r * 0.22, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#5bc25b';
  ctx.fill();
}
