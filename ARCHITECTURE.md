# Architektura — Živáčci

## Adresářová struktura

```
src/
  sim/        simulace: geny, potřeby, AI, reprodukce, hlavní tick, statistiky
  world/      svět: mřížka souřadnic, jídlo, den/noc cyklus
  render/     canvas rendering: kamera, kreslení agentů, jídla, pozadí
  ui/         DOM UI: HUD, inspect panel, evoluční dashboard, ovládání
  persistence/ ukládání/načítání stavu světa (localStorage + JSON export)
  main.ts     složení všeho dohromady, herní smyčka, vstupy
```

## Datové modely

### Genome (`sim/genome.ts`)
Plovoucí čísla v pevných mezích, mutují se ± malým náhodným posunem:
- `speed` — rychlost pohybu (px/s)
- `metabolism` — násobič rychlosti úbytku hladu
- `size` — velikost/poloměr agenta (px)
- `hue` — barva (0–360°)
- `sociability` — jak moc touží po blízkosti ostatních / váha sociální potřeby
- `visionRange` — dosah zraku (px), jak daleko vidí jídlo a ostatní agenty
- `reproductionThreshold` — minimální nasycenost (hlad i energie) potřebná k rozmnožení

### Needs (`sim/needs.ts`)
Tři potřeby škálované 0–100 (100 = plně uspokojeno), v čase klesají:
- `hunger`, `energy`, `social`

Z nich je odvozen `health` na `Agent` (0–100): pokud `hunger` nebo `energy`
klesnou na 0, health se vyčerpává → smrt. Stáří po prahu věku také zvyšuje
úbytek health (přirozená smrt stářím).

### Agent (`sim/agent.ts`)
```ts
interface Agent {
  id, name
  x, y, vx, vy
  genome: Genome
  needs: Needs
  health: number
  age: number          // sim-sekundy života
  generation: number
  parentIds: string[]
  childIds: string[]
  alive: boolean
  action: AgentAction  // 'wander' | 'seekFood' | 'eat' | 'rest' | 'seekMate' | 'socialize'
  actionTargetId, wanderTarget, reproductionCooldown
  causeOfDeath?
}
```

### World (`world/world.ts`)
Spojitý 2D prostor (žádná mřížka pohybu). Drží seznam `FoodItem[]`,
den/noc fázi, RNG (seedovatelný pro reprodukovatelnost), a periodicky
spawnuje jídlo do náhodných pozic.

### Simulation (`sim/simulation.ts`)
Orchestrátor: drží `Map<id, Agent>`, `World`, `StatsHistory`, `speedMultiplier`,
`paused`. `tick(dt)` je čistě deterministická funkce (dt = pevný krok, viz níže)
volaná N-krát podle rychlosti — **simulace tedy neběží podle FPS**.

Pořadí uvnitř ticku: decay potřeb → utility AI rozhodnutí → pohyb/akce
(jíst/odpočívat/socializovat/množit se) → kontrola úmrtí → world.update
(spawn jídla, den/noc) → případný zápis do StatsHistory.

## Herní smyčka

`main.ts` používá akumulátorový fixed-timestep vzor:
```
FIXED_DT = 1/30 s (simulační krok)
akumulátor += realDt * speedMultiplier
while (akumulátor >= FIXED_DT) { sim.tick(FIXED_DT); akumulátor -= FIXED_DT }
render(interpolace není nutná, entity se kreslí na poslední známé pozici)
```
`speedMultiplier ∈ {0 (pauza), 1, 2, 4, 8}`. Vysoké násobky prostě volají
`tick` vícekrát za snímek, ne že by simulace běžela s větším `dt` — udržuje
to simulaci deterministickou při daném seedu bez ohledu na FPS.

## Utility-based AI (`sim/ai.ts`)

Pro každou potřebu se spočítá urgence `u = ((100 - need) / 100)²` (kvadraticky
zvýrazní kritické hodnoty). Sociální urgence je navíc váhována genem
`sociability`. Vybere se akce s nejvyšším skóre; malá hystereze brání
"blikání" mezi akcemi každý tick. Když jsou všechny urgence nízké → `wander`.

## Reprodukce (`sim/reproduction.ts`)

Dva pohlavně dospělí (`age > MATURE_AGE`), dostatečně nasycení
(`hunger, energy > genome.reproductionThreshold * 100`) agenti mimo cooldown,
kteří se potkají nablízku, zplodí potomka: geny = průměr rodičů ± mutace
(`mutationRate` šance na gen, `mutationAmount` velikost posunu). Rodičům se
sníží hlad/energie (cena rozmnožení) a nastaví se cooldown.

## Vykreslování

Agent = kruh (velikost/barva z genů) + oči (mrkání) + ústa reagující na
náladu (nejurgentnější potřeba) + emoji bublina nad hlavou podle aktuální
akce. Jemný "poskok" chůze přes `sin(age * frekvence)`. Pozadí má
den/noc tint (tmavší modrý overlay v noci, teplejší za soumraku/svítání).

## Perzistence

`persistence/save.ts` serializuje `Simulation` (agenti, jídlo, čas, historie
statistik) do JSON — uloží se do `localStorage` a lze exportovat/importovat
jako soubor.
