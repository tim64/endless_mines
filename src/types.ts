export enum TileType {
  AIR = 0,
  DIRT = 1,
  STONE = 2,
  HARD_STONE = 3,
  COAL = 4,
  IRON = 5,
  SULFUR = 6,
  GEM = 7,
  BEDROCK = 8,
  LAVA = 9,
  WATER = 10,
  OBSIDIAN = 11,
}

export interface TileDrop {
  resource: 'dirt' | 'stone' | 'coal' | 'iron' | 'sulfur' | 'gems' | 'obsidian';
  count: number;
  chance: number;
}

export interface TileDef {
  id: TileType;
  name: string;
  color: string;
  edgeColor: string;
  detailColor?: string;
  maxHp: number;           // HP / time needed to dig
  minToolTier: number;     // Pickaxe tier required
  blastResistance: number; // Resistance against explosives (0..100)
  drops: TileDrop[];
}

export interface Inventory {
  dirt: number;
  stone: number;
  coal: number;
  iron: number;
  sulfur: number;
  gems: number;
  obsidian: number;
}

export interface PickaxeInfo {
  tier: number;
  name: string;
  power: number; // damage per second to blocks
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}
