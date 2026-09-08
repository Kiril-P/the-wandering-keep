import { BASE_SPEED, BEACON_COST, BUILDINGS, CREATURE_COST, EXPANSION_COSTS, KEEP_COSTS, REFUND_RATE, REGIONS, RESOURCES, SAVE_KEY, type BuildingKind, type Cost, type Stock } from './balance';
export interface Building {
    id: number;
    kind: BuildingKind;
    pad: number;
    level: number;
}
export interface Outcrop {
    id: number;
    born: number;
    hits: number;
    side: number;
}
export interface GameState {
    version: 1;
    resources: Stock;
    buildings: Building[];
    keepLevel: number;
    expansions: number;
    creatureLevel: number;
    distance: number;
    elapsed: number;
    nextId: number;
    beacon: boolean;
    beaconAt: number;
    outcrops: Outcrop[];
    spawnClock: number;
    totalGathered: number;
    settings: {
        reducedMotion: boolean;
    };
}
export const freshState = (): GameState => ({ version: 1, resources: { stone: 0, essence: 0, runes: 0 }, buildings: [], keepLevel: 1, expansions: 0, creatureLevel: 1, distance: 0, elapsed: 0, nextId: 3, beacon: false, beaconAt: 0, outcrops: [{ id: 1, born: 0, hits: 6, side: 1 }, { id: 2, born: -3, hits: 6, side: -1 }], spawnClock: 0, totalGathered: 0, settings: { reducedMotion: false } });
export const regionIndex = (s: GameState) => s.distance >= REGIONS[2].distance ? 2 : s.distance >= REGIONS[1].distance ? 1 : 0;
export const capacity = (s: GameState) => 3 + s.expansions * 3;
export const afford = (s: GameState, c: Cost) => RESOURCES.every(r => s.resources[r] + 1e-8 >= (c[r] || 0));
export const spend = (s: GameState, c: Cost) => { if (!afford(s, c))
    return false; for (const r of RESOURCES)
    s.resources[r] = Math.max(0, s.resources[r] - (c[r] || 0)); return true; };
export const bonus = (s: GameState) => 1 + REGIONS[regionIndex(s)].bonus + Math.min(.3, s.buildings.filter(b => b.kind === 'watchtower').reduce((n, b) => n + b.level * .1, 0));
export function buildingRate(s: GameState, b: Building) { return BUILDINGS[b.kind].rates[b.level - 1] * bonus(s); }
/** Preview the same producer-first, shared-input order used by a simulation tick. */
export function production(s: GameState, dt = .1) {
    const stock = { ...s.resources }, rates: Stock = { stone: 0, essence: 0, runes: 0 };
    const buildings = new Map<number, { rate: number; capacity: number; missing: (keyof Stock)[]; status: string }>();
    for (const b of s.buildings) {
        const spec = BUILDINGS[b.kind], rate = buildingRate(s, b);
        if (spec.output && !spec.recipe) { stock[spec.output] += rate * dt; rates[spec.output] += rate; }
        if (!spec.recipe) buildings.set(b.id, { rate, capacity: rate, missing: [], status: b.kind === 'watchtower' ? 'Guiding workers' : 'Producing' });
    }
    for (const b of s.buildings.filter(b => b.kind === 'forge')) {
        const capacity = buildingRate(s, b), recipe = BUILDINGS.forge.recipe!;
        const missing = RESOURCES.filter(r => recipe[r] && stock[r] + 1e-8 < recipe[r]! * capacity * dt);
        let amount = capacity * dt;
        for (const r of RESOURCES) if (recipe[r]) amount = Math.min(amount, stock[r] / recipe[r]!);
        const rate = amount / dt;
        for (const r of RESOURCES) { stock[r] = Math.max(0, stock[r] - (recipe[r] || 0) * amount); rates[r] -= (recipe[r] || 0) * rate; }
        stock.runes += amount; rates.runes += rate;
        buildings.set(b.id, { rate, capacity, missing, status: missing.length ? (rate < 1e-7 ? 'Waiting for ' : 'Limited by ') + missing.join(' and ') : 'Producing' });
    }
    return { rates, buildings };
}
export function buildingStatus(s: GameState, b: Building) { return production(s).buildings.get(b.id)?.status ?? 'Producing'; }
export function netRates(s: GameState) { return production(s).rates; }
export function tick(s: GameState, dt: number) {
    if (!Number.isFinite(dt) || dt <= 0)
        return;
    s.elapsed += dt;
    s.distance += BASE_SPEED * (s.creatureLevel === 2 ? 1.35 : 1) * dt;
    // Producers run first so conversion can use this tick's fresh inputs. Recipes use fractional progress.
    for (const b of s.buildings.filter(b => b.kind !== 'forge')) {
        const spec = BUILDINGS[b.kind];
        if (spec.output)
            s.resources[spec.output] += buildingRate(s, b) * dt;
    }
    for (const b of s.buildings.filter(b => b.kind === 'forge')) {
        const spec = BUILDINGS.forge;
        let output = buildingRate(s, b) * dt;
        for (const r of RESOURCES) {
            const input = spec.recipe?.[r] || 0;
            if (input)
                output = Math.min(output, s.resources[r] / input);
        }
        for (const r of RESOURCES)
            s.resources[r] = Math.max(0, s.resources[r] - (spec.recipe?.[r] || 0) * output);
        s.resources.runes += output;
    }
    s.spawnClock += dt;
    s.outcrops = s.outcrops.filter(o => o.hits > 0 && s.distance - o.born < 14);
    if (s.spawnClock >= 7) {
        s.spawnClock %= 7;
        if (s.outcrops.length < 3)
            s.outcrops.push({ id: s.nextId++, born: s.distance, hits: 6, side: s.nextId % 2 ? 1 : -1 });
    }
}
export function gather(s: GameState, id?: number) { const o = s.outcrops.find(o => id === undefined || o.id === id); if (!o || o.hits <= 0)
    return false; o.hits--; s.resources.stone += 2; s.totalGathered += 2; if (!o.hits)
    s.outcrops = s.outcrops.filter(p => p.id !== o.id); return true; }
export function buildReason(s: GameState, kind: BuildingKind) { if (s.keepLevel < BUILDINGS[kind].keep)
    return `Requires Keep level ${BUILDINGS[kind].keep}`; if (s.buildings.length >= capacity(s))
    return 'All pads occupied — expand the platform'; if (!afford(s, BUILDINGS[kind].costs[0]))
    return 'Gather more resources'; return ''; }
export function build(s: GameState, kind: BuildingKind, pad: number) { if (buildReason(s, kind) || !Number.isInteger(pad) || pad < 0 || pad >= capacity(s) || s.buildings.some(b => b.pad === pad))
    return false; if (!spend(s, BUILDINGS[kind].costs[0]))
    return false; s.buildings.push({ id: s.nextId++, kind, pad, level: 1 }); return true; }
export function upgradeBuilding(s: GameState, id: number) { const b = s.buildings.find(b => b.id === id); if (!b || b.level === 3 || !spend(s, BUILDINGS[b.kind].costs[b.level]))
    return false; b.level++; return true; }
export function refundFor(b: Building): Cost { const c: Cost = {}; for (let i = 0; i < b.level; i++)
    for (const r of RESOURCES)
        c[r] = (c[r] || 0) + (BUILDINGS[b.kind].costs[i][r] || 0) * REFUND_RATE; return c; }
export function removeBuilding(s: GameState, id: number) { const b = s.buildings.find(b => b.id === id); if (!b)
    return false; const refund = refundFor(b); for (const r of RESOURCES)
    s.resources[r] += refund[r] || 0; s.buildings = s.buildings.filter(b => b.id !== id); return true; }
export function keepReason(s: GameState) { if (s.keepLevel === 3)
    return 'Keep fully upgraded'; if (s.keepLevel === 2 && s.distance < REGIONS[1].distance)
    return 'Reach Amber Canyon'; return afford(s, KEEP_COSTS[s.keepLevel - 1]) ? '' : 'Gather more resources'; }
export function upgradeKeep(s: GameState) { if (keepReason(s))
    return false; spend(s, KEEP_COSTS[s.keepLevel - 1]); s.keepLevel++; return true; }
export function expansionReason(s: GameState) { if (s.expansions === 2)
    return 'Both wings complete'; if (s.keepLevel < s.expansions + 2)
    return `Requires Keep level ${s.expansions + 2}`; return afford(s, EXPANSION_COSTS[s.expansions]) ? '' : 'Gather more resources'; }
export function expand(s: GameState) { if (expansionReason(s))
    return false; spend(s, EXPANSION_COSTS[s.expansions]); s.expansions++; return true; }
export function creatureReason(s: GameState) { if (s.creatureLevel === 2)
    return 'Morrow is awakened'; if (s.keepLevel < 2)
    return 'Requires Keep level 2'; return afford(s, CREATURE_COST) ? '' : 'Gather more resources'; }
export function awaken(s: GameState) { if (creatureReason(s))
    return false; spend(s, CREATURE_COST); s.creatureLevel = 2; return true; }
export function beaconReason(s: GameState) { if (s.beacon)
    return 'The Crown Beacon is alight'; if (s.keepLevel < 3)
    return 'Requires Keep level 3'; if (s.expansions < 2)
    return 'Build both platform wings'; if (regionIndex(s) < 2)
    return 'Reach the Moonlit Highlands'; return afford(s, BEACON_COST) ? '' : 'Gather more resources'; }
export function activateBeacon(s: GameState) { if (beaconReason(s))
    return false; spend(s, BEACON_COST); s.beacon = true; s.beaconAt = s.elapsed; return true; }
export function objective(s: GameState): {
    title: string;
    detail: string;
} {
    if (!s.buildings.some(b => b.kind === 'quarry'))
        return { title: 'Put stone to work', detail: `Gather ${BUILDINGS.quarry.costs[0].stone} stone from passing outcrops, then place a Quarry Tower.` };
    if (!s.buildings.some(b => b.kind === 'garden'))
        return { title: 'Grow a little magic', detail: `Build a Moss Garden for ${BUILDINGS.garden.costs[0].stone} stone. It produces essence.` };
    if (!s.buildings.some(b => b.kind === 'forge'))
        return { title: 'Carve your first runestones', detail: `Build a Rune Forge: ${BUILDINGS.forge.costs[0].stone} stone + ${BUILDINGS.forge.costs[0].essence} essence. It needs a steady supply of both.` };
    if (s.keepLevel < 2)
        return { title: 'Make room for a settlement', detail: 'Upgrade the Central Keep to level 2, then expand the platform.' };
    if (s.expansions < 1)
        return { title: 'Unfold the east wing', detail: 'Add three construction pads. A second garden will feed more forges.' };
    if (s.keepLevel < 3)
        return { title: 'A keep worthy of the journey', detail: 'Reach Amber Canyon, grow production, and upgrade the Keep to level 3.' };
    if (s.expansions < 2)
        return { title: 'Complete the platform', detail: 'Build the west wing to unlock all nine construction pads.' };
    if (!s.beacon)
        return { title: 'Light the Crown Beacon', detail: `Reach the Moonlit Highlands and gather ${BEACON_COST.stone} stone, ${BEACON_COST.essence} essence, and ${BEACON_COST.runes} runestones.` };
    return { title: 'A new chapter begins', detail: 'Your beacon is alight. Continue growing your walking settlement.' };
}
export function serialize(s: GameState) { return JSON.stringify(s); }
export function deserialize(raw: string | null): GameState | null {
    if (!raw)
        return null;
    try {
        const s = JSON.parse(raw) as GameState;
        const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
        const integer = (v: unknown, min: number, max: number) => finite(v) && Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
        if (s.version !== 1 || !s.resources || !RESOURCES.every(r => finite(s.resources[r])) || !integer(s.keepLevel, 1, 3) || !integer(s.expansions, 0, 2) || s.expansions > s.keepLevel - 1 || !integer(s.creatureLevel, 1, 2) || ![s.distance, s.elapsed, s.beaconAt, s.totalGathered].every(finite) || !integer(s.nextId, 1, Number.MAX_SAFE_INTEGER) || typeof s.beacon !== 'boolean')
            return null;
        if (!Array.isArray(s.buildings) || s.buildings.length > capacity(s) || !s.buildings.every(b => b && Object.hasOwn(BUILDINGS, b.kind) && integer(b.level, 1, 3) && integer(b.pad, 0, capacity(s) - 1) && integer(b.id, 1, s.nextId - 1) && BUILDINGS[b.kind].keep <= s.keepLevel))
            return null;
        if (new Set(s.buildings.map(b => b.pad)).size !== s.buildings.length || new Set(s.buildings.map(b => b.id)).size !== s.buildings.length)
            return null;
        if (s.creatureLevel === 2 && s.keepLevel < 2)
            return null;
        if (s.beaconAt > s.elapsed)
            return null;
        if (s.beacon && (s.keepLevel !== 3 || s.expansions !== 2 || regionIndex(s) !== 2))
            return null;
        if (!finite(s.spawnClock) || s.spawnClock >= 7 || !Array.isArray(s.outcrops) || s.outcrops.length > 3 || !s.outcrops.every(o => integer(o.id, 1, s.nextId - 1) && integer(o.hits, 1, 6) && typeof o.born === 'number' && Number.isFinite(o.born) && o.born >= -3 && o.born <= s.distance && (o.side === 1 || o.side === -1)))
            return null;
        const ids = [...s.buildings, ...s.outcrops].map(o => o.id);
        if (new Set(ids).size !== ids.length)
            return null;
        s.settings = { reducedMotion: s.settings?.reducedMotion === true };
        return s;
    }
    catch {
        return null;
    }
}
export function loadGame() { try {
    return { state: deserialize(localStorage.getItem(SAVE_KEY)) || freshState(), storageAvailable: true };
}
catch {
    return { state: freshState(), storageAvailable: false };
} }
