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
  GOLD = 12,
  // Зимний мир (Верхний слой, Y < 0)
  SNOW = 13,
  ICE = 14,
  PACKED_ICE = 15,
  FROZEN_DIRT = 16,
  SILVER = 17,
  // Зловещие руины (Глубокий слой, Y >= 80)
  RUIN_BRICK = 18,
  CURSED_STONE = 19,
  BONE_BLOCK = 20,
  VOID_CRYSTAL = 21,
}

export type ResourceType =
  | 'dirt'
  | 'stone'
  | 'coal'
  | 'iron'
  | 'sulfur'
  | 'gems'
  | 'obsidian'
  | 'gold'
  | 'snow'
  | 'ice'
  | 'silver'
  | 'bone'
  | 'void_crystal';

export interface TileDrop {
  resource: ResourceType;
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
  gold: number;
  torches: number;
  snow: number;
  ice: number;
  silver: number;
  bone: number;
  void_crystal: number;
}

export type BiomeType = 'winter' | 'mines' | 'ruins';

export interface Torch {
  tileX: number;
  tileY: number;
  flickerOffset: number;
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

export interface SavedChunkDelta {
  cx: number;
  cy: number;
  changes: [number, number, number][]; // [lx, ly, tileType]
  torches: { lx: number; ly: number; flickerOffset: number }[];
}

export interface GameSaveData {
  version: 1;
  timestamp: number;
  player: {
    tileX: number;
    tileY: number;
    hp: number;
    pickaxeTier: number;
    bombs: number;
    lightRadius: number;
    inventory: Inventory;
  };
  world: {
    seed: number;
    modifiedChunks: SavedChunkDelta[];
  };
}
