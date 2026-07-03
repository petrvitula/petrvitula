import type { Agent } from '../sim/agent.ts';
import { NEEDS_MAX } from '../sim/needs.ts';
import type { Camera } from './camera.ts';

type Mood = 'happy' | 'neutral' | 'sad';

function moodOf(agent: Agent): Mood {
  const min = Math.min(agent.needs.hunger, agent.needs.energy, agent.needs.social);
  if (min < 28) return 'sad';
  if (min > 65) return 'happy';
  return 'neutral';
}

function actionEmoji(agent: Agent): string | null {
  switch (agent.action) {
    case 'seekFood':
    case 'eat':
      return '🍎';
    case 'rest':
      return '💤';
    case 'seekMate':
    case 'socialize':
      return '❤️';
    default:
      return null;
  }
}

export function drawAgent(ctx: CanvasRenderingContext2D, agent: Agent, camera: Camera, selected: boolean): void {
  const screen = camera.worldToScreen(agent.x, agent.y);
  const r = agent.genome.size * camera.zoom;

  if (!agent.alive) {
    drawTombstone(ctx, screen.x, screen.y, r);
    return;
  }

  const moving = agent.vx !== 0 || agent.vy !== 0;
  const bounce = moving ? Math.sin(agent.animPhase) * r * 0.12 : Math.sin(agent.animPhase * 0.4) * r * 0.04;
  const cx = screen.x;
  const cy = screen.y - Math.abs(bounce);

  const hue = agent.genome.hue;
  const bodyColor = `hsl(${hue}, 68%, 58%)`;
  const shadeColor = `hsl(${hue}, 60%, 40%)`;

  if (selected) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // stín
  ctx.beginPath();
  ctx.ellipse(cx, screen.y + r * 0.75, r * 0.85, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fill();

  // tělo
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.strokeStyle = shadeColor;
  ctx.stroke();

  drawFace(ctx, agent, cx, cy, r);

  const emoji = actionEmoji(agent);
  if (emoji) {
    ctx.font = `${Math.max(10, r * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, cx, cy - r - 10);
  }

  if (r > 4) drawNeedBars(ctx, agent, cx, cy - r - (emoji ? 24 : 12), r);

  // jméno pod agentem, jen když je dost přiblíženo
  if (camera.zoom > 0.7) {
    ctx.font = `${Math.max(9, 10 * camera.zoom)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    ctx.fillText(agent.name, cx, cy + r + 13);
  }
}

function drawFace(ctx: CanvasRenderingContext2D, agent: Agent, cx: number, cy: number, r: number): void {
  const mood = moodOf(agent);
  const eyeOffsetX = r * 0.36;
  const eyeOffsetY = -r * 0.08;
  const eyeR = Math.max(1, r * 0.2);
  const eyesClosed = agent.blinkTimer < 0;

  ctx.fillStyle = '#1c1f28';
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeOffsetX;
    const ey = cy + eyeOffsetY;
    if (eyesClosed) {
      ctx.strokeStyle = '#1c1f28';
      ctx.lineWidth = Math.max(1, eyeR * 0.5);
      ctx.beginPath();
      ctx.moveTo(ex - eyeR, ey);
      ctx.lineTo(ex + eyeR, ey);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // pusa reaguje na náladu
  const mouthY = cy + r * 0.38;
  const mouthW = r * 0.5;
  ctx.strokeStyle = '#1c1f28';
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.beginPath();
  if (mood === 'happy') {
    ctx.arc(cx, mouthY - mouthW * 0.3, mouthW * 0.55, 0.15 * Math.PI, 0.85 * Math.PI);
  } else if (mood === 'sad') {
    ctx.arc(cx, mouthY + mouthW * 0.55, mouthW * 0.55, 1.15 * Math.PI, 1.85 * Math.PI);
  } else {
    ctx.moveTo(cx - mouthW * 0.35, mouthY);
    ctx.lineTo(cx + mouthW * 0.35, mouthY);
  }
  ctx.stroke();
}

function drawNeedBars(ctx: CanvasRenderingContext2D, agent: Agent, cx: number, topY: number, r: number): void {
  const width = Math.max(18, r * 2.1);
  const height = 2.4;
  const gap = 3.2;
  const needs: [number, string][] = [
    [agent.needs.hunger, '#ff9f4f'],
    [agent.needs.energy, '#4fc3ff'],
    [agent.needs.social, '#ff6fa5'],
  ];
  needs.forEach(([value, color], i) => {
    const y = topY + i * gap;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(cx - width / 2, y, width, height);
    ctx.fillStyle = color;
    ctx.fillRect(cx - width / 2, y, width * (value / NEEDS_MAX), height);
  });
}

function drawTombstone(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.font = `${Math.max(10, r * 1.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.75;
  ctx.fillText('💀', cx, cy);
  ctx.globalAlpha = 1;
}
