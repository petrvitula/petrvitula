import type { Simulation } from '../sim/simulation.ts';
import { GENE_KEYS, GENE_LABELS, normalizeGene, type GeneKey } from '../sim/genome.ts';

const GENE_COLORS: Record<GeneKey, string> = {
  speed: '#4fc3ff',
  metabolism: '#ff9f4f',
  size: '#5bd67a',
  hue: '#ff6fa5',
  sociability: '#c58fff',
  visionRange: '#ffe14f',
  reproductionThreshold: '#ff5a5a',
};

export class Dashboard {
  private panel = document.getElementById('dashboard') as HTMLElement;
  private closeBtn = document.getElementById('dashboard-close') as HTMLButtonElement;
  private popCanvas = document.getElementById('chart-population') as HTMLCanvasElement;
  private geneCanvas = document.getElementById('chart-genes') as HTMLCanvasElement;
  private legend = document.getElementById('gene-legend') as HTMLElement;
  visible = false;

  constructor(onClose: () => void) {
    this.closeBtn.addEventListener('click', () => {
      this.hide();
      onClose();
    });
    this.legend.innerHTML = GENE_KEYS.map(
      (key) =>
        `<span class="item"><span class="swatch" style="background:${GENE_COLORS[key]}"></span>${GENE_LABELS[key]}</span>`
    ).join('');
  }

  show(): void {
    this.visible = true;
    this.panel.classList.remove('hidden');
  }

  hide(): void {
    this.visible = false;
    this.panel.classList.add('hidden');
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  render(sim: Simulation): void {
    if (!this.visible) return;
    this.renderPopulationChart(sim);
    this.renderGeneChart(sim);
  }

  private renderPopulationChart(sim: Simulation): void {
    const ctx = this.popCanvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.popCanvas;
    ctx.clearRect(0, 0, width, height);

    const snapshots = sim.stats.snapshots;
    if (snapshots.length < 2) {
      drawEmptyMessage(ctx, width, height);
      return;
    }

    const maxPop = Math.max(10, ...snapshots.map((s) => s.population));
    const pad = { left: 32, right: 10, top: 10, bottom: 20 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    drawAxes(ctx, pad, plotW, plotH, `${maxPop}`, '0');

    ctx.beginPath();
    snapshots.forEach((s, i) => {
      const x = pad.left + (i / (snapshots.length - 1)) * plotW;
      const y = pad.top + plotH - (s.population / maxPop) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#4fc3ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(79, 195, 255, 0.15)';
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.closePath();
    ctx.fill();
  }

  private renderGeneChart(sim: Simulation): void {
    const ctx = this.geneCanvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.geneCanvas;
    ctx.clearRect(0, 0, width, height);

    const snapshots = sim.stats.snapshots.filter((s) => s.avgGenome !== null);
    if (snapshots.length < 2) {
      drawEmptyMessage(ctx, width, height);
      return;
    }

    const pad = { left: 32, right: 10, top: 10, bottom: 20 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    drawAxes(ctx, pad, plotW, plotH, '100%', '0%');

    for (const key of GENE_KEYS) {
      ctx.beginPath();
      snapshots.forEach((s, i) => {
        const value = normalizeGene(key, s.avgGenome![key]);
        const x = pad.left + (i / (snapshots.length - 1)) * plotW;
        const y = pad.top + plotH - value * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = GENE_COLORS[key];
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  pad: { left: number; right: number; top: number; bottom: number },
  plotW: number,
  plotH: number,
  topLabel: string,
  bottomLabel: string
): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(topLabel, pad.left - 4, pad.top + 8);
  ctx.fillText(bottomLabel, pad.left - 4, pad.top + plotH);
}

function drawEmptyMessage(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Sbírám data… nech simulaci chvíli běžet.', width / 2, height / 2);
}
