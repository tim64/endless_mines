import { TileType } from '../types';
import { Chunk } from './chunk';

export interface RoomTemplate {
  id: number;
  name: string;
  build: (chunk: Chunk, startLx: number, startLy: number, cx: number, cy: number) => void;
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  // -------------------------------------------------------------
  // Template 0: Стартовый бункер шахтера (Miner's Starter Bunker)
  // 11x11 space centered in chunk (0, 0) around player spawn (8, 8)
  // -------------------------------------------------------------
  {
    id: 0,
    name: 'Стартовая база шахтера',
    build: (chunk, startLx, startLy) => {
      // 11x11 area: lx from 3 to 13, ly from 3 to 13
      for (let ly = 3; ly <= 13; ly++) {
        for (let lx = 3; lx <= 13; lx++) {
          const isBorder = lx === 3 || lx === 13 || ly === 3 || ly === 13;

          if (isBorder) {
            // Soft dirt exits in cardinal directions (easy to dig through into dungeon)
            const isExit =
              (lx === 8 && (ly === 3 || ly === 13)) ||
              (ly === 8 && (lx === 3 || lx === 13));

            chunk.setTile(lx, ly, isExit ? TileType.DIRT : TileType.HARD_STONE);
          } else {
            // Room floor
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // 4 Warm Corner Torches
      chunk.addTorch(5, 5, 0);
      chunk.addTorch(11, 5, 25);
      chunk.addTorch(5, 11, 50);
      chunk.addTorch(11, 11, 75);

      // Starter gift: 2 Gold deposits and 2 Coal deposits in corners
      chunk.setTile(4, 4, TileType.GOLD);
      chunk.setTile(12, 12, TileType.GOLD);
      chunk.setTile(12, 4, TileType.COAL);
      chunk.setTile(4, 12, TileType.COAL);
    },
  },

  // -------------------------------------------------------------
  // Template 1: Квадратная сокровищница / Склеп (Square Vault)
  // 9x9 fortified room with pillars and central gold cache
  // -------------------------------------------------------------
  {
    id: 1,
    name: 'Квадратная сокровищница',
    build: (chunk) => {
      // 9x9 room: lx from 4 to 12, ly from 4 to 12
      for (let ly = 4; ly <= 12; ly++) {
        for (let lx = 4; lx <= 12; lx++) {
          const isBorder = lx === 4 || lx === 12 || ly === 4 || ly === 12;
          if (isBorder) {
            chunk.setTile(lx, ly, TileType.HARD_STONE);
          } else {
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // 4 Sturdy Obsidian Pillars in corners
      chunk.setTile(6, 6, TileType.OBSIDIAN);
      chunk.setTile(10, 6, TileType.OBSIDIAN);
      chunk.setTile(6, 10, TileType.OBSIDIAN);
      chunk.setTile(10, 10, TileType.OBSIDIAN);

      // Torches on North and South
      chunk.addTorch(8, 5, Math.random() * 100);
      chunk.addTorch(8, 11, Math.random() * 100);

      // Central Treasure: 4 Gold blocks with 1 Rare Gem in the middle
      chunk.setTile(7, 8, TileType.GOLD);
      chunk.setTile(9, 8, TileType.GOLD);
      chunk.setTile(8, 7, TileType.GOLD);
      chunk.setTile(8, 9, TileType.GOLD);
      chunk.setTile(8, 8, TileType.GEM);
    },
  },

  // -------------------------------------------------------------
  // Template 2: Ромбовидный зал кристаллов (Diamond Shrine)
  // Elegant rhombus-shaped chamber with central glowing crystal
  // -------------------------------------------------------------
  {
    id: 2,
    name: 'Ромбовидный зал кристаллов',
    build: (chunk) => {
      const centerX = 8;
      const centerY = 8;
      const radius = 5;

      for (let ly = 2; ly <= 14; ly++) {
        for (let lx = 2; lx <= 14; lx++) {
          const mDist = Math.abs(lx - centerX) + Math.abs(ly - centerY);
          if (mDist === radius) {
            chunk.setTile(lx, ly, TileType.HARD_STONE);
          } else if (mDist < radius) {
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // Center Torch surrounded by Gold and Gem stars
      chunk.addTorch(centerX, centerY, Math.random() * 100);
      chunk.setTile(centerX - 1, centerY, TileType.GOLD);
      chunk.setTile(centerX + 1, centerY, TileType.GOLD);
      chunk.setTile(centerX, centerY - 1, TileType.GEM);
      chunk.setTile(centerX, centerY + 1, TileType.GEM);
    },
  },

  // -------------------------------------------------------------
  // Template 3: Заброшенный перекресток шахтеров (Mining Station)
  // Cross-shaped hall with support pillars and rich ore veins
  // -------------------------------------------------------------
  {
    id: 3,
    name: 'Заброшенный штрек шахтеров',
    build: (chunk) => {
      // Horizontal corridor: lx 2..14, ly 6..10
      for (let ly = 6; ly <= 10; ly++) {
        for (let lx = 2; lx <= 14; lx++) {
          chunk.setTile(lx, ly, TileType.AIR);
        }
      }

      // Vertical corridor: lx 6..10, ly 2..14
      for (let ly = 2; ly <= 14; ly++) {
        for (let lx = 6; lx <= 10; lx++) {
          chunk.setTile(lx, ly, TileType.AIR);
        }
      }

      // Wooden support pillars at intersection corners
      chunk.setTile(5, 5, TileType.STONE);
      chunk.setTile(11, 5, TileType.STONE);
      chunk.setTile(5, 11, TileType.STONE);
      chunk.setTile(11, 11, TileType.STONE);

      // Ancient torches
      chunk.addTorch(6, 8, Math.random() * 100);
      chunk.addTorch(10, 8, Math.random() * 100);

      // Embedded rich ores on the walls
      chunk.setTile(2, 8, TileType.GOLD);
      chunk.setTile(14, 8, TileType.GOLD);
      chunk.setTile(8, 2, TileType.IRON);
      chunk.setTile(8, 14, TileType.IRON);
    },
  },

  // -------------------------------------------------------------
  // Template 4: Магматический алтарь (Magma Crucible)
  // Round room with obsidian-encased lava and gold veins
  // -------------------------------------------------------------
  {
    id: 4,
    name: 'Магматический алтарь',
    build: (chunk) => {
      const centerX = 8;
      const centerY = 8;
      const radiusSq = 18;

      for (let ly = 3; ly <= 13; ly++) {
        for (let lx = 3; lx <= 13; lx++) {
          const dSq = (lx - centerX) ** 2 + (ly - centerY) ** 2;
          if (dSq <= radiusSq) {
            chunk.setTile(lx, ly, TileType.AIR);
          } else if (dSq <= radiusSq + 6) {
            chunk.setTile(lx, ly, TileType.HARD_STONE);
          }
        }
      }

      // Central obsidian-encased lava (safe until breached!)
      chunk.setTile(centerX, centerY, TileType.LAVA);
      chunk.setLavaLevel(centerX, centerY, 5);

      // Reinforced Obsidian protective ring around lava
      chunk.setTile(centerX - 1, centerY, TileType.OBSIDIAN);
      chunk.setTile(centerX + 1, centerY, TileType.OBSIDIAN);
      chunk.setTile(centerX, centerY - 1, TileType.OBSIDIAN);
      chunk.setTile(centerX, centerY + 1, TileType.OBSIDIAN);

      // Rich Gold and Sulfur deposits
      chunk.setTile(centerX - 3, centerY, TileType.GOLD);
      chunk.setTile(centerX + 3, centerY, TileType.GOLD);
      chunk.setTile(centerX, centerY - 3, TileType.SULFUR);
      chunk.setTile(centerX, centerY + 3, TileType.SULFUR);
    },
  },

  // -------------------------------------------------------------
  // Template 5: Подземный оазис (Subterranean Spring)
  // Peaceful cavern with clean water pool and gem crystals
  // -------------------------------------------------------------
  {
    id: 5,
    name: 'Подземный оазис',
    build: (chunk) => {
      const centerX = 8;
      const centerY = 8;

      // Elliptical cavern
      for (let ly = 4; ly <= 12; ly++) {
        for (let lx = 3; lx <= 13; lx++) {
          const val = ((lx - centerX) ** 2) / 22 + ((ly - centerY) ** 2) / 12;
          if (val <= 1.0) {
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // Center clear water pond (2x2)
      chunk.setTile(7, 7, TileType.WATER);
      chunk.setTile(8, 7, TileType.WATER);
      chunk.setTile(7, 8, TileType.WATER);
      chunk.setTile(8, 8, TileType.WATER);
      chunk.setWaterLevel(7, 7, 5);
      chunk.setWaterLevel(8, 7, 5);
      chunk.setWaterLevel(7, 8, 5);
      chunk.setWaterLevel(8, 8, 5);

      // Torches on the banks
      chunk.addTorch(5, 8, Math.random() * 100);
      chunk.addTorch(11, 8, Math.random() * 100);

      // Gold and Gem veins along the cavern bank
      chunk.setTile(4, 7, TileType.GOLD);
      chunk.setTile(12, 7, TileType.GEM);
    },
  },

  // -------------------------------------------------------------
  // Template 6: Ледяной грот (Glacial Grotto - Winter Biome)
  // Oval ice chamber with packed ice, ice crystals, and silver
  // -------------------------------------------------------------
  {
    id: 6,
    name: 'Ледяной грот',
    build: (chunk) => {
      const centerX = 8;
      const centerY = 8;

      for (let ly = 3; ly <= 13; ly++) {
        for (let lx = 3; lx <= 13; lx++) {
          const distSq = (lx - centerX) ** 2 + (ly - centerY) ** 2;
          if (distSq <= 20) {
            chunk.setTile(lx, ly, TileType.AIR);
          } else if (distSq <= 25) {
            chunk.setTile(lx, ly, TileType.PACKED_ICE);
          }
        }
      }

      // Central frozen pond: 2x2 water covered by ice
      chunk.setTile(7, 7, TileType.ICE);
      chunk.setTile(8, 7, TileType.ICE);
      chunk.setTile(7, 8, TileType.ICE);
      chunk.setTile(8, 8, TileType.ICE);

      // Silver deposits in walls
      chunk.setTile(5, 5, TileType.SILVER);
      chunk.setTile(11, 5, TileType.SILVER);
      chunk.setTile(5, 11, TileType.SILVER);
      chunk.setTile(11, 11, TileType.SILVER);

      // Blueish glowing torches
      chunk.addTorch(8, 5, Math.random() * 100);
      chunk.addTorch(8, 11, Math.random() * 100);
    },
  },

  // -------------------------------------------------------------
  // Template 7: Замерзший форпост (Frozen Outpost - Winter Biome)
  // 10x10 rectangular lodge with snow blocks, permafrost, and silver
  // -------------------------------------------------------------
  {
    id: 7,
    name: 'Замерзший форпост',
    build: (chunk) => {
      for (let ly = 4; ly <= 12; ly++) {
        for (let lx = 4; lx <= 12; lx++) {
          const isBorder = lx === 4 || lx === 12 || ly === 4 || ly === 12;
          if (isBorder) {
            // Packed ice walls with snow gateways
            const isDoor = (lx === 8 && (ly === 4 || ly === 12)) || (ly === 8 && (lx === 4 || lx === 12));
            chunk.setTile(lx, ly, isDoor ? TileType.SNOW : TileType.PACKED_ICE);
          } else {
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // Torches
      chunk.addTorch(6, 6, 10);
      chunk.addTorch(10, 6, 35);
      chunk.addTorch(6, 10, 60);
      chunk.addTorch(10, 10, 85);

      // Silver and Snow block deposits
      chunk.setTile(8, 8, TileType.SILVER);
      chunk.setTile(7, 8, TileType.SNOW);
      chunk.setTile(9, 8, TileType.SNOW);
      chunk.setTile(8, 7, TileType.SILVER);
    },
  },

  // -------------------------------------------------------------
  // Template 8: Склеп Древних (Crypt of the Ancients - Ruins Biome)
  // 11x11 grand hall of ruin brick with obsidian columns & void crystals
  // -------------------------------------------------------------
  {
    id: 8,
    name: 'Склеп Древних',
    build: (chunk) => {
      for (let ly = 3; ly <= 13; ly++) {
        for (let lx = 3; lx <= 13; lx++) {
          const isBorder = lx === 3 || lx === 13 || ly === 3 || ly === 13;
          if (isBorder) {
            chunk.setTile(lx, ly, TileType.RUIN_BRICK);
          } else {
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // 4 Obsidian columns
      chunk.setTile(5, 5, TileType.OBSIDIAN);
      chunk.setTile(11, 5, TileType.OBSIDIAN);
      chunk.setTile(5, 11, TileType.OBSIDIAN);
      chunk.setTile(11, 11, TileType.OBSIDIAN);

      // Central Dais of Cursed Stone with Void Crystal
      chunk.setTile(8, 8, TileType.VOID_CRYSTAL);
      chunk.setTile(7, 8, TileType.CURSED_STONE);
      chunk.setTile(9, 8, TileType.CURSED_STONE);
      chunk.setTile(8, 7, TileType.CURSED_STONE);
      chunk.setTile(8, 9, TileType.CURSED_STONE);

      // Cursed Gold in corners
      chunk.setTile(4, 4, TileType.GOLD);
      chunk.setTile(12, 12, TileType.GOLD);

      // Torches on the walls
      chunk.addTorch(8, 4, 15);
      chunk.addTorch(8, 12, 65);
    },
  },

  // -------------------------------------------------------------
  // Template 9: Алтарь Бездны (Abyssal Void Sanctum - Ruins Biome)
  // Rhombus bone sanctum with central lava font & void crystals
  // -------------------------------------------------------------
  {
    id: 9,
    name: 'Алтарь Бездны',
    build: (chunk) => {
      const centerX = 8;
      const centerY = 8;

      for (let ly = 3; ly <= 13; ly++) {
        for (let lx = 3; lx <= 13; lx++) {
          const manhattan = Math.abs(lx - centerX) + Math.abs(ly - centerY);
          if (manhattan <= 4) {
            chunk.setTile(lx, ly, TileType.AIR);
          } else if (manhattan === 5) {
            chunk.setTile(lx, ly, TileType.BONE_BLOCK);
          }
        }
      }

      // Central Lava Font
      chunk.setTile(centerX, centerY, TileType.LAVA);
      chunk.setLavaLevel(centerX, centerY, 5);

      // Flanked by Obsidian and Void Crystals
      chunk.setTile(centerX - 1, centerY, TileType.OBSIDIAN);
      chunk.setTile(centerX + 1, centerY, TileType.OBSIDIAN);
      chunk.setTile(centerX, centerY - 1, TileType.VOID_CRYSTAL);
      chunk.setTile(centerX, centerY + 1, TileType.VOID_CRYSTAL);

      // Bone blocks & Gold
      chunk.setTile(centerX - 2, centerY, TileType.GOLD);
      chunk.setTile(centerX + 2, centerY, TileType.GOLD);
    },
  },
];

/**
 * Stamps a procedural template room into the chunk.
 * Chunk (0, 0) always receives the Starter Bunker.
 * Other chunks have a rare (~12%) chance to contain one of the special chambers matching their biome.
 */
export function tryStampRoom(chunk: Chunk, cx: number, cy: number, seed: number) {
  // Always spawn Starter Bunker at world origin chunk (0, 0)
  if (cx === 0 && cy === 0) {
    ROOM_TEMPLATES[0].build(chunk, 3, 3, cx, cy);
    return;
  }

  // Minimum distance check: keep the immediate neighborhood of spawn wild
  const dist = Math.hypot(cx, cy);
  if (dist < 1.8) return;

  // Deterministic pseudo-random roll for this chunk
  const hash = Math.abs(Math.sin(cx * 37.17 + cy * 59.83 + seed * 0.1) * 43758.5453);
  const roll = hash - Math.floor(hash);

  // ~12% chance for a chunk to feature a special template room
  if (roll < 0.12) {
    let roomType: number;
    if (cy < 0) {
      // Winter layer: rooms 6, 7 (or 2)
      const winterChoices = [6, 7, 2];
      roomType = winterChoices[Math.floor(roll * 1000) % winterChoices.length];
    } else if (cy >= 5) {
      // Sinister ruins layer: rooms 8, 9 (or 1, 4)
      const ruinsChoices = [8, 9, 1, 4];
      roomType = ruinsChoices[Math.floor(roll * 1000) % ruinsChoices.length];
    } else {
      // Mines layer: rooms 1..5
      roomType = 1 + (Math.floor(roll * 1000) % 5);
    }
    ROOM_TEMPLATES[roomType].build(chunk, 3, 3, cx, cy);
  }
}
