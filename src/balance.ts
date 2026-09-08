export type Resource = 'stone' | 'essence' | 'runes';
export type Stock = Record<Resource, number>;
export type Cost = Partial<Stock>;
export type BuildingKind = 'quarry' | 'garden' | 'forge' | 'watchtower';
export interface BuildingSpec {
    name: string;
    icon: string;
    description: string;
    costs: Cost[];
    output?: Resource;
    rates: number[];
    recipe?: Cost;
    keep: number;
}
export const RESOURCES: Resource[] = ['stone', 'essence', 'runes'];
export const LABELS = { stone: 'Stone', essence: 'Essence', runes: 'Runestones' };
export const BUILDINGS: Record<BuildingKind, BuildingSpec> = {
    quarry: { name: 'Quarry Tower', icon: '⚒', description: 'An articulated crane gathers stone along the road.', costs: [{ stone: 20 }, { stone: 60, essence: 10 }, { stone: 140, essence: 30, runes: 8 }], output: 'stone', rates: [1, 1.9, 3.3], keep: 1 },
    garden: { name: 'Moss Garden', icon: '❧', description: 'Luminous moss turns sunlight into essence.', costs: [{ stone: 40 }, { stone: 70, essence: 15 }, { stone: 130, essence: 35, runes: 8 }], output: 'essence', rates: [.5, 1, 1.7], keep: 1 },
    forge: { name: 'Rune Forge', icon: '◇', description: 'Carves 4 stone and 3 essence into each runestone.', costs: [{ stone: 80, essence: 22 }, { stone: 110, essence: 30, runes: 8 }, { stone: 190, essence: 60, runes: 18 }], output: 'runes', rates: [.13, .25, .42], recipe: { stone: 4, essence: 3 }, keep: 1 },
    watchtower: { name: 'Watchtower', icon: '♜', description: 'Guides the workers: +10% production per level, up to +30% total.', costs: [{ stone: 100, essence: 30, runes: 8 }, { stone: 140, essence: 40, runes: 12 }, { stone: 200, essence: 60, runes: 20 }], rates: [.1, .2, .3], keep: 2 },
};
export const KEEP_COSTS: Cost[] = [{ stone: 120, essence: 35, runes: 10 }, { stone: 260, essence: 75, runes: 25 }];
export const EXPANSION_COSTS: Cost[] = [{ stone: 140, essence: 30, runes: 8 }, { stone: 260, essence: 70, runes: 22 }];
export const BEACON_COST: Cost = { stone: 450, essence: 140, runes: 75 };
export const CREATURE_COST: Cost = { stone: 140, essence: 45, runes: 12 };
export const REGIONS = [
    { name: 'The Green March', distance: 0, bonus: 0, description: 'Old roads and open grasslands.' },
    { name: 'Amber Canyon', distance: 150, bonus: .10, description: 'Warm winds inspire your workers. +10% production.' },
    { name: 'Moonlit Highlands', distance: 390, bonus: .20, description: 'Ancient magic stirs. +20% production.' },
];
export const BASE_SPEED = 1.6 / (4.8 * .68);
export const REFUND_RATE = .6;
export const SAVE_KEY = 'wandering-keep-save-v1';
export const PADS = [
    [-2.05, 4.55, .92], [-2.05, 4.55, -.92], [2.5, 4.40, 1.1],
    [-1.75, 4.40, 2.77], [0, 4.40, 2.77], [1.75, 4.40, 2.77],
    [-1.75, 4.40, -2.77], [0, 4.40, -2.77], [1.75, 4.40, -2.77],
];
