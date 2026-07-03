import type { Agent } from '../sim/agent.ts';
import type { Simulation } from '../sim/simulation.ts';
import { GENE_KEYS, GENE_LABELS, normalizeGene } from '../sim/genome.ts';
import { NEEDS_MAX } from '../sim/needs.ts';

const CAUSE_LABEL: Record<string, string> = {
  hunger: 'hladu',
  exhaustion: 'vyčerpání',
  age: 'stáří',
};

const ACTION_LABEL: Record<Agent['action'], string> = {
  wander: 'bloumá',
  seekFood: 'hledá jídlo',
  eat: 'jí',
  rest: 'odpočívá',
  seekMate: 'hledá partnera',
  socialize: 'socializuje se',
};

export class Inspector {
  private panel = document.getElementById('inspector') as HTMLElement;
  private content = document.getElementById('inspector-content') as HTMLElement;
  private closeBtn = document.getElementById('inspector-close') as HTMLButtonElement;
  onSelectAgent: ((id: string) => void) | null = null;

  constructor(private onClose: () => void) {
    this.closeBtn.addEventListener('click', () => this.onClose());
    this.content.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const id = target.dataset['agentLink'];
      if (id && this.onSelectAgent) this.onSelectAgent(id);
    });
  }

  hide(): void {
    this.panel.classList.add('hidden');
  }

  show(agentId: string, sim: Simulation): void {
    const agent = sim.agents.get(agentId);
    if (!agent) {
      this.hide();
      return;
    }
    this.panel.classList.remove('hidden');
    this.content.innerHTML = this.render(agent, sim);
  }

  private render(agent: Agent, sim: Simulation): string {
    const ageDays = (agent.age / sim.world.dayLengthSec).toFixed(1);
    const status = agent.alive
      ? `<span>${ACTION_LABEL[agent.action]}</span>`
      : `<div class="dead-badge">💀 zemřel/a (${CAUSE_LABEL[agent.causeOfDeath ?? 'age']})</div>`;

    const needs = agent.alive
      ? `
      <div class="insp-section-title">Potřeby</div>
      ${needBar('Hlad', agent.needs.hunger, '#ff9f4f')}
      ${needBar('Energie', agent.needs.energy, '#4fc3ff')}
      ${needBar('Sociálno', agent.needs.social, '#ff6fa5')}
      ${needBar('Zdraví', agent.health, '#5bd67a')}
    `
      : '';

    const genes = `
      <div class="insp-section-title">Geny</div>
      ${GENE_KEYS.map((key) => {
        const value = agent.genome[key];
        const pct = Math.round(normalizeGene(key, value) * 100);
        return `<div class="gene-row"><span>${GENE_LABELS[key]}</span><span>${formatGeneValue(key, value)} (${pct}%)</span></div>`;
      }).join('')}
    `;

    const parents = agent.parentIds
      .map((id) => sim.agents.get(id))
      .filter((p): p is Agent => !!p)
      .map((p) => `<button data-agent-link="${p.id}">${p.name}</button>`)
      .join(', ');

    const children = agent.childIds
      .map((id) => sim.agents.get(id))
      .filter((c): c is Agent => !!c)
      .map((c) => `<button data-agent-link="${c.id}">${c.name}</button>`)
      .join(', ');

    const family = `
      <div class="insp-section-title">Rodokmen</div>
      <div class="family-list">
        Rodiče: ${parents || '—'}<br />
        Potomci: ${children || '—'}
      </div>
    `;

    return `
      <div class="insp-name">${agent.name}</div>
      <div class="insp-sub">generace ${agent.generation + 1} · věk ${ageDays} dní</div>
      ${status}
      ${needs}
      ${genes}
      ${family}
    `;
  }
}

function needBar(label: string, value: number, color: string): string {
  const pct = Math.max(0, Math.min(100, value)) / NEEDS_MAX * 100;
  return `
    <div class="need-bar-row">
      <span class="need-label">${label}</span>
      <span class="need-bar-track"><span class="need-bar-fill" style="width:${pct}%;background:${color}"></span></span>
    </div>
  `;
}

function formatGeneValue(key: string, value: number): string {
  if (key === 'hue') return `${Math.round(value)}°`;
  if (key === 'reproductionThreshold') return `${Math.round(value * 100)}%`;
  return value.toFixed(1);
}
