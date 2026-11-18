import { TileType } from '../types';
import { Chunk } from './chunk';

export interface RoomTemplate {
  id: number;
  name: string;
  build: (chunk: Chunk, startLx: number, startLy: number, cx: number, cy: number) => void;
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  // -------------------------------------------------------------
  // Template 0: Зимний стартовый бункер (Winter Starter Bunker - Layer 0)
  // 11x11 safe bunker centered in chunk (0, 0) at player spawn (8, 8)
  // -------------------------------------------------------------
  {
    id: 0,
    name: 'Зимний стартовый бункер',
    build: (chunk) => {
      for (let ly = 3; ly <= 13; ly++) {
        for (let lx = 3; lx <= 13; lx++) {
          const isBorder = lx === 3 || lx === 13 || ly === 3 || ly === 13;
          if (isBorder) {
            // Soft snow exits in cardinal directions (easy to dig through into tundra)
            const isExit =
              (lx === 8 && (ly === 3 || ly === 13)) ||
              (ly === 8 && (lx === 3 || lx === 13));

            chunk.setTile(lx, ly, isExit ? TileType.SNOW : TileType.PACKED_ICE);
          } else {
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // 4 Warm Corner Torches
      chunk.addTorch(5, 5, 0);
      chunk.addTorch(11, 5, 25);
      chunk.addTorch(5, 11, 50);
      chunk.addTorch(11, 11, 75);

      // Starter gifts: 2 Silver deposits and 2 Coal deposits in corners
      chunk.setTile(4, 4, TileType.SILVER);
      chunk.setTile(12, 12, TileType.SILVER);
      chunk.setTile(12, 4, TileType.COAL);
      chunk.setTile(4, 12, TileType.COAL);
    },
  },

  // -------------------------------------------------------------
  // Template 10: Шахтерский плацдарм с подъемом (Mines Arrival - Layer 1, 0,0)
  // -------------------------------------------------------------
  {
    id: 10,
    name: 'Шахтерский плацдарм',
    build: (chunk) => {
      for (let ly = 3; ly <= 13; ly++) {
        for (let lx = 3; lx <= 13; lx++) {
          const isBorder = lx === 3 || lx === 13 || ly === 3 || ly === 13;
          if (isBorder) {
            const isExit =
              (lx === 8 && (ly === 3 || ly === 13)) ||
              (ly === 8 && (lx === 3 || lx === 13));
            chunk.setTile(lx, ly, isExit ? TileType.DIRT : TileType.HARD_STONE);
          } else {
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // Center Ascent Portal to Winter Tundra!
      chunk.setTile(8, 8, TileType.PORTAL_UP);

      // Torches around portal
      chunk.addTorch(6, 8, 0);
      chunk.addTorch(10, 8, 25);
      chunk.addTorch(8, 6, 50);
      chunk.addTorch(8, 10, 75);

      // Starter gifts for Mines
      chunk.setTile(4, 4, TileType.IRON);
      chunk.setTile(12, 12, TileType.IRON);
      chunk.setTile(12, 4, TileType.GOLD);
      chunk.setTile(4, 12, TileType.COAL);
    },
  },

  // -------------------------------------------------------------
  // Template 11: Аванпост Бездны (Ruins Arrival - Layer 2, 0,0)
  // -------------------------------------------------------------
  {
    id: 11,
    name: 'Аванпост Бездны',
    build: (chunk) => {
      for (let ly = 3; ly <= 13; ly++) {
        for (let lx = 3; lx <= 13; lx++) {
          const isBorder = lx === 3 || lx === 13 || ly === 3 || ly === 13;
          if (isBorder) {
            const isExit =
              (lx === 8 && (ly === 3 || ly === 13)) ||
              (ly === 8 && (lx === 3 || lx === 13));
            chunk.setTile(lx, ly, isExit ? TileType.BONE_BLOCK : TileType.RUIN_BRICK);
          } else {
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // Center Ascent Portal back to Mines!
      chunk.setTile(8, 8, TileType.PORTAL_UP);

      // 4 Obsidian Columns
      chunk.setTile(5, 5, TileType.OBSIDIAN);
      chunk.setTile(11, 5, TileType.OBSIDIAN);
      chunk.setTile(5, 11, TileType.OBSIDIAN);
      chunk.setTile(11, 11, TileType.OBSIDIAN);

      // Ancient Torches
      chunk.addTorch(8, 6, 10);
      chunk.addTorch(8, 10, 60);

      // Void crystals & Cursed Gold
      chunk.setTile(4, 4, TileType.VOID_CRYSTAL);
      chunk.setTile(12, 12, TileType.VOID_CRYSTAL);
      chunk.setTile(12, 4, TileType.GOLD);
      chunk.setTile(4, 12, TileType.GOLD);
    },
  },

  // -------------------------------------------------------------
  // Template 12: Врата спуска в Шахты (Descent to Mines Chamber)
  // -------------------------------------------------------------
  {
    id: 12,
    name: 'Врата спуска в Шахты',
    build: (chunk) => {
      for (let ly = 4; ly <= 12; ly++) {
        for (let lx = 4; lx <= 12; lx++) {
          const isBorder = lx === 4 || lx === 12 || ly === 4 || ly === 12;
          if (isBorder) {
            chunk.setTile(lx, ly, TileType.PACKED_ICE);
          } else {
            chunk.setTile(lx, ly, TileType.AIR);
          }
        }
      }

      // Portal to Mines at center
      chunk.setTile(8, 8, TileType.PORTAL_DOWN);

      // 4 Obsidian corner pillars
      chunk.setTile(6, 6, TileType.OBSIDIAN);
      chunk.setTile(10, 6, TileType.OBSIDIAN);
      chunk.setTile(6, 10, TileType.OBSIDIAN);
      chunk.setTile(10, 10, TileType.OBSIDIAN);

      chunk.addTorch(8, 5, 0);
      chunk.addTorch(8, 11, 50);

      chunk.setTile(7, 8, TileType.SILVER);
      chunk.setTile(9, 8, TileType.SILVER);
    },
  },

  // -------------------------------------------------------------
  // Template 13: Врата в Зловещие Руины (Descent to Ruins Chamber)
  // -------------------------------------------------------------
  {
    id: 13,
    name: 'Врата в Зловещие Руины',
    build: (chunk) => {
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

      // Portal to Ruins at center
      chunk.setTile(8, 8, TileType.PORTAL_DOWN);

      // 4 Obsidian corner pillars
      chunk.setTile(6, 6, TileType.OBSIDIAN);
      chunk.setTile(10, 6, TileType.OBSIDIAN);
      chunk.setTile(6, 10, TileType.OBSIDIAN);
      chunk.setTile(10, 10, TileType.OBSIDIAN);

      chunk.addTorch(8, 5, 0);
      chunk.addTorch(8, 11, 50);

      chunk.setTile(7, 8, TileType.GOLD);
      chunk.setTile(9, 8, TileType.GEM);
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
 * Chunk (0, 0) receives the arrival/starter base for the respective layer.
 * Fixed descent gates are placed close to origin, and other chambers generate procedurally.
 */
export function tryStampRoom(chunk: Chunk, cx: number, cy: number, seed: number) {
  const layer = chunk.layer ?? 0;

  // Origin chunk (0, 0) in each layer has its fixed arrival/starter base:
  if (cx === 0 && cy === 0) {
    if (layer === 0) {
      ROOM_TEMPLATES[0].build(chunk, 3, 3, cx, cy); // Winter Starter Bunker
    } else if (layer === 1) {
      ROOM_TEMPLATES[10].build(chunk, 3, 3, cx, cy); // Mines Arrival Base with Ascent Portal
    } else if (layer === 2) {
      ROOM_TEMPLATES[11].build(chunk, 3, 3, cx, cy); // Ruins Arrival Base with Ascent Portal
    }
    return;
  }

  // Fixed Descent Gate placement close to origin:
  if (layer === 0 && cx === 1 && cy === 1) {
    ROOM_TEMPLATES[12].build(chunk, 3, 3, cx, cy); // Descent to Mines
    return;
  }
  if (layer === 1 && cx === 2 && cy === 2) {
    ROOM_TEMPLATES[13].build(chunk, 3, 3, cx, cy); // Descent to Ruins
    return;
  }

  // Minimum distance check: keep the immediate neighborhood of spawn wild
  const dist = Math.hypot(cx, cy);
  if (dist < 1.8) return;

  // Deterministic pseudo-random roll for this chunk
  const hash = Math.abs(Math.sin(cx * 37.17 + cy * 59.83 + seed * 0.1 + layer * 77.7) * 43758.5453);
  const roll = hash - Math.floor(hash);

  // Additional Descent Gates scattered in distant chunks (~4% chance)
  if (roll < 0.04 && dist > 4) {
    if (layer === 0) {
      ROOM_TEMPLATES[12].build(chunk, 3, 3, cx, cy);
      return;
    } else if (layer === 1) {
      ROOM_TEMPLATES[13].build(chunk, 3, 3, cx, cy);
      return;
    }
  }

  // ~14% chance for a chunk to feature a special template room matching this layer
  if (roll < 0.14) {
    let roomType: number;
    if (layer === 0) {
      // Winter layer: rooms 6, 7, 2
      const winterChoices = [6, 7, 2];
      roomType = winterChoices[Math.floor(roll * 1000) % winterChoices.length];
    } else if (layer === 2) {
      // Sinister ruins layer: rooms 8, 9, 1
      const ruinsChoices = [8, 9, 1];
      roomType = ruinsChoices[Math.floor(roll * 1000) % ruinsChoices.length];
    } else {
      // Mines layer: rooms 1, 2, 3, 4, 5
      const minesChoices = [1, 2, 3, 4, 5];
      roomType = minesChoices[Math.floor(roll * 1000) % minesChoices.length];
    }
    ROOM_TEMPLATES[roomType].build(chunk, 3, 3, cx, cy);
  }
}
