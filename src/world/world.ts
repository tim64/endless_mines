import { CHUNK_SIZE, TILE_DEFINITIONS, TILE_SIZE } from '../constants';
import { TileType, TileDef, TileDrop, Torch, SavedChunkDelta, BiomeType } from '../types';
import { Chunk } from './chunk';
import { SimplexNoise } from '../utils/noise';
import { tryStampRoom } from './rooms';

export interface PendingLiquid {
  x: number;
  y: number;
  type: TileType.LAVA | TileType.WATER;
  level: number;
  timer: number;
  maxTimer: number;
}

export interface LiquidCallbacks {
  onLavaFlow?: (wx: number, wy: number) => void;
  onLavaTelegraph?: (wx: number, wy: number) => void;
  onLavaSimmer?: (wx: number, wy: number) => void;
  onWaterFlow?: (wx: number, wy: number) => void;
  onWaterTelegraph?: (wx: number, wy: number) => void;
  onWaterSimmer?: (wx: number, wy: number) => void;
  onSteamReaction?: (wx: number, wy: number) => void;
}

export class World {
  private chunks: Map<string, Chunk> = new Map();
  private noiseCave: SimplexNoise;
  private noiseOre: SimplexNoise;
  private noiseTerrain: SimplexNoise;
  private noiseLava: SimplexNoise;
  private noiseWater: SimplexNoise;
  private liquidTimer: number = 0;
  private pendingLava: Map<string, PendingLiquid> = new Map();
  private pendingWater: Map<string, PendingLiquid> = new Map();
  public savedDeltas: Map<string, SavedChunkDelta> = new Map();
  public currentLayer: number = 0; // 0 = Winter Tundra, 1 = The Mines, 2 = The Sinister Ruins
  public seed: number;

  constructor(seed: number = 4242) {
    this.seed = seed;
    this.noiseCave = new SimplexNoise(seed);
    this.noiseOre = new SimplexNoise(seed + 101);
    this.noiseTerrain = new SimplexNoise(seed + 202);
    this.noiseLava = new SimplexNoise(seed + 303);
    this.noiseWater = new SimplexNoise(seed + 404);
  }

  private getChunkKey(cx: number, cy: number, layer: number = this.currentLayer): string {
    return `${layer}:${cx},${cy}`;
  }

  public getChunk(cx: number, cy: number, layer: number = this.currentLayer): Chunk {
    const key = this.getChunkKey(cx, cy, layer);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generateChunk(cx, cy, layer);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  public getBiome(_wx?: number, _wy?: number): BiomeType {
    if (this.currentLayer === 0) return 'winter';
    if (this.currentLayer === 2) return 'ruins';
    return 'mines';
  }

  public switchLayer(targetLayer: number, fromPortal: 'down' | 'up' = 'down'): { targetX: number; targetY: number } {
    this.currentLayer = targetLayer;
    this.pendingLava.clear();
    this.pendingWater.clear();
    this.liquidTimer = 0;

    // Destination spawn coordinates in target layer:
    if (targetLayer === 0) {
      // Returned to Winter Tundra at descent gate in chunk (1, 1)
      return { targetX: 16 + 8, targetY: 16 + 8 };
    } else if (targetLayer === 1) {
      if (fromPortal === 'up') {
        // Ascended from Ruins back to Mines descent chamber in chunk (2, 2)
        return { targetX: 32 + 8, targetY: 32 + 8 };
      } else {
        // Descended from Winter Tundra to Mines Arrival Base at chunk (0, 0)
        return { targetX: 8, targetY: 8 };
      }
    } else {
      // Arrived at Sinister Ruins Arrival Base at chunk (0, 0)
      return { targetX: 8, targetY: 8 };
    }
  }

  private generateChunk(cx: number, cy: number, layer: number = this.currentLayer): Chunk {
    const chunk = new Chunk(cx, cy, layer);
    const layerOffset = layer * 10000;

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        const dist = Math.sqrt(wx * wx + wy * wy);

        // Safe origin area in chunk (0, 0) of every layer
        if (cx === 0 && cy === 0 && dist <= 3.5) {
          chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.AIR;
          if (wx === 1 && wy === 1) {
            chunk.addTorch(lx, ly, 0);
          }
          continue;
        }

        // Noise coordinates offset by layer to ensure completely unique planes
        const nx = wx + layerOffset;
        const ny = wy + layerOffset;

        const caveVal = this.noiseCave.noise2D(nx * 0.05, ny * 0.05);
        const caveWorm = Math.abs(this.noiseCave.noise2D(nx * 0.08, ny * 0.08));
        const terrainNoise = this.noiseTerrain.noise2D(nx * 0.04, ny * 0.04);
        const oreNoise = this.noiseOre.noise2D(nx * 0.12, ny * 0.12);
        const rareOreNoise = this.noiseOre.noise2D(nx * 0.18 + 50, ny * 0.18 + 50);

        // =============================================================
        // СЛОЙ 0: ЗИМНИЙ МИР (ТУНДРА И ЛЕДНИКИ)
        // =============================================================
        if (layer === 0) {
          // Open glacial caverns & crevasses
          if (caveVal > 0.44 || caveWorm < 0.08) {
            chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.AIR;
            if (dist > 5) {
              const torchHash = Math.abs(Math.sin(wx * 17.13 + wy * 31.97) * 43758.5453);
              if ((torchHash - Math.floor(torchHash)) < 0.015) {
                chunk.addTorch(lx, ly, Math.random() * 100);
              }
            }
            continue;
          }

          // Subterranean frozen aquifers
          const waterNoise = this.noiseWater.noise2D(nx * 0.08, ny * 0.08);
          if (waterNoise > 0.62 && caveVal < 0.32) {
            chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.WATER;
            chunk.setWaterLevel(lx, ly, 6);
            continue;
          }

          // Pure Winter Terrain
          let baseTile: TileType = TileType.SNOW;
          if (terrainNoise > 0.32) baseTile = TileType.PACKED_ICE;
          else if (terrainNoise > 0.05) baseTile = TileType.ICE;
          else if (terrainNoise > -0.28) baseTile = TileType.FROZEN_DIRT;
          else baseTile = TileType.SNOW;

          let finalTile: TileType = baseTile;
          if (rareOreNoise > 0.52) {
            finalTile = TileType.SILVER;
          } else if (oreNoise > 0.60) {
            finalTile = TileType.COAL;
          } else if (rareOreNoise < -0.70 && dist > 15) {
            finalTile = TileType.GEM;
          }

          chunk.tiles[ly * CHUNK_SIZE + lx] = finalTile;
          continue;
        }

        // =============================================================
        // СЛОЙ 2: ЗЛОВЕЩИЕ РУИНЫ (БЕЗДНА)
        // =============================================================
        if (layer === 2) {
          // Ancient halls and catacomb corridors
          if (caveVal > 0.42 || caveWorm < 0.09) {
            chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.AIR;
            const torchHash = Math.abs(Math.sin(wx * 17.13 + wy * 31.97) * 43758.5453);
            if ((torchHash - Math.floor(torchHash)) < 0.02) {
              chunk.addTorch(lx, ly, Math.random() * 100);
            }
            continue;
          }

          // Deep magma rivers
          const lavaNoise = this.noiseLava.noise2D(nx * 0.08, ny * 0.08);
          if (lavaNoise > 0.54 && caveVal < 0.34) {
            chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.LAVA;
            chunk.setLavaLevel(lx, ly, 6);
            continue;
          }

          // Base Ruin Architecture
          let baseTile: TileType = TileType.RUIN_BRICK;
          if (terrainNoise > 0.35) baseTile = TileType.CURSED_STONE;
          else if (terrainNoise > -0.05) baseTile = TileType.RUIN_BRICK;
          else if (terrainNoise > -0.35) baseTile = TileType.BONE_BLOCK;
          else baseTile = TileType.OBSIDIAN;

          let finalTile: TileType = baseTile;
          if (rareOreNoise > 0.56) {
            finalTile = TileType.VOID_CRYSTAL;
          } else if (oreNoise > 0.50) {
            finalTile = TileType.GOLD;
          } else if (rareOreNoise < -0.65) {
            finalTile = TileType.GEM;
          } else if (oreNoise < -0.55) {
            finalTile = TileType.SULFUR;
          }

          chunk.tiles[ly * CHUNK_SIZE + lx] = finalTile;
          continue;
        }

        // =============================================================
        // СЛОЙ 1: ПОДЗЕМНЫЕ ШАХТЫ (КАТАКОМБЫ)
        // =============================================================
        if (caveVal > 0.48 || caveWorm < 0.07) {
          chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.AIR;
          if (dist > 5) {
            const torchHash = Math.abs(Math.sin(wx * 17.13 + wy * 31.97) * 43758.5453);
            if ((torchHash - Math.floor(torchHash)) < 0.015) {
              chunk.addTorch(lx, ly, Math.random() * 100);
            }
          }
          continue;
        }

        // Lava Pockets sealed inside rock
        const lavaNoise = this.noiseLava.noise2D(nx * 0.08, ny * 0.08);
        const isFarEnough = dist > 14;
        const isSealedInsideRock = caveVal < 0.32 && caveWorm > 0.16;

        if (isFarEnough && isSealedInsideRock && lavaNoise > 0.62) {
          chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.LAVA;
          chunk.setLavaLevel(lx, ly, 5);
          continue;
        }

        // Water Aquifers sealed inside rock
        const waterNoise = this.noiseWater.noise2D(nx * 0.08, ny * 0.08);
        const isWaterFarEnough = dist > 6;

        if (isWaterFarEnough && isSealedInsideRock && waterNoise > 0.62) {
          chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.WATER;
          chunk.setWaterLevel(lx, ly, 6);
          continue;
        }

        // Base Mines Terrain
        let baseTile: TileType = TileType.DIRT;
        if (dist < 15) {
          baseTile = terrainNoise > 0.3 ? TileType.STONE : TileType.DIRT;
        } else if (dist < 40) {
          if (terrainNoise > 0.4) baseTile = TileType.HARD_STONE;
          else if (terrainNoise > -0.2) baseTile = TileType.STONE;
          else baseTile = TileType.DIRT;
        } else {
          if (terrainNoise > 0.1) baseTile = TileType.HARD_STONE;
          else baseTile = TileType.STONE;
        }

        let finalTile: TileType = baseTile;
        if (oreNoise > 0.58 && dist > 5) {
          finalTile = TileType.COAL;
        } else if (oreNoise < -0.62 && dist > 8) {
          finalTile = TileType.SULFUR;
        } else if (rareOreNoise > 0.65 && dist > 18) {
          finalTile = TileType.IRON;
        } else if (rareOreNoise > 0.52 && rareOreNoise < 0.65 && dist > 12) {
          finalTile = TileType.GOLD;
        } else if (rareOreNoise < -0.72 && dist > 35) {
          finalTile = TileType.GEM;
        }

        chunk.tiles[ly * CHUNK_SIZE + lx] = finalTile;
      }
    }

    // Stamp procedural template room matching current layer
    tryStampRoom(chunk, cx, cy, this.seed);

    chunk.isInitialGeneration = false;

    // Apply any saved deltas if they exist for this chunk in this layer
    const key = this.getChunkKey(cx, cy, layer);
    if (this.savedDeltas.has(key)) {
      const delta = this.savedDeltas.get(key)!;
      for (const [lx, ly, tileType] of delta.changes) {
        chunk.tiles[ly * CHUNK_SIZE + lx] = tileType;
        chunk.modifiedTiles.set(ly * CHUNK_SIZE + lx, tileType);
        if (tileType !== TileType.LAVA) chunk.lavaLevels[ly * CHUNK_SIZE + lx] = 0;
        if (tileType !== TileType.WATER) chunk.waterLevels[ly * CHUNK_SIZE + lx] = 0;
      }
      chunk.torches = delta.torches.map(t => ({ lx: t.lx, ly: t.ly, flickerOffset: t.flickerOffset }));
      chunk.isModified = true;
    }

    return chunk;
  }

  public getTile(wx: number, wy: number): TileType {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return this.getChunk(cx, cy).getTile(lx, ly);
  }

  public setTile(wx: number, wy: number, type: TileType) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    this.getChunk(cx, cy).setTile(lx, ly, type);
  }

  public getDamage(wx: number, wy: number): number {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return this.getChunk(cx, cy).getDamage(lx, ly);
  }

  public damageTile(wx: number, wy: number, amount: number, toolTier: number): { broken: boolean; tile: TileType; drops: TileDrop[] } {
    const tile = this.getTile(wx, wy);
    if (tile === TileType.AIR || tile === TileType.BEDROCK || tile === TileType.PORTAL_DOWN || tile === TileType.PORTAL_UP) {
      return { broken: false, tile, drops: [] };
    }

    const def = TILE_DEFINITIONS[tile];
    // Penalty if tool tier is lower than required
    const effectiveAmount = toolTier >= def.minToolTier ? amount : amount * 0.15;

    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const res = this.getChunk(cx, cy).applyDamage(lx, ly, effectiveAmount);
    if (res.broken) {
      // Calculate drops
      const drops: TileDrop[] = [];
      for (const d of def.drops) {
        if (Math.random() <= d.chance) {
          drops.push({ resource: d.resource, count: d.count, chance: d.chance });
        }
      }
      return { broken: true, tile: res.tile, drops };
    }

    return { broken: false, tile: res.tile, drops: [] };
  }

  public isSolid(wx: number, wy: number): boolean {
    const tile = this.getTile(wx, wy);
    return (
      tile !== TileType.AIR &&
      tile !== TileType.LAVA &&
      tile !== TileType.WATER &&
      tile !== TileType.PORTAL_DOWN &&
      tile !== TileType.PORTAL_UP
    );
  }

  public getLavaLevel(wx: number, wy: number): number {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return this.getChunk(cx, cy).getLavaLevel(lx, ly);
  }

  public setLavaLevel(wx: number, wy: number, level: number) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    this.getChunk(cx, cy).setLavaLevel(lx, ly, level);
  }

  public getWaterLevel(wx: number, wy: number): number {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return this.getChunk(cx, cy).getWaterLevel(lx, ly);
  }

  public setWaterLevel(wx: number, wy: number, level: number) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    this.getChunk(cx, cy).setWaterLevel(lx, ly, level);
  }

  public getPendingLava(): PendingLiquid[] {
    return Array.from(this.pendingLava.values());
  }

  public getPendingWater(): PendingLiquid[] {
    return Array.from(this.pendingWater.values());
  }

  /**
   * Fluid simulation for both Lava and Water with telegraphed warning delay (~0.65s).
   * When Lava and Water meet, they instantly solidify into ultra-durable Obsidian!
   */
  public updateLiquids(
    dt: number,
    centerTileX: number,
    centerTileY: number,
    callbacks: LiquidCallbacks
  ) {
    // 1. Process Pending Lava Countdowns
    for (const [key, p] of this.pendingLava) {
      p.timer -= dt;
      if (callbacks.onLavaSimmer) callbacks.onLavaSimmer(p.x, p.y);

      if (p.timer <= 0) {
        this.pendingLava.delete(key);
        const curTile = this.getTile(p.x, p.y);

        // If target tile already has water, or has an adjacent water neighbor: OBSIDIAN!
        if (curTile === TileType.WATER || this.hasAdjacentTile(p.x, p.y, TileType.WATER)) {
          this.setTile(p.x, p.y, TileType.OBSIDIAN);
          if (callbacks.onSteamReaction) callbacks.onSteamReaction(p.x, p.y);
        } else if (curTile === TileType.AIR) {
          this.setTile(p.x, p.y, TileType.LAVA);
          this.setLavaLevel(p.x, p.y, p.level);
          if (callbacks.onLavaFlow) callbacks.onLavaFlow(p.x, p.y);
        }
      }
    }

    // 2. Process Pending Water Countdowns
    for (const [key, p] of this.pendingWater) {
      p.timer -= dt;
      if (callbacks.onWaterSimmer) callbacks.onWaterSimmer(p.x, p.y);

      if (p.timer <= 0) {
        this.pendingWater.delete(key);
        const curTile = this.getTile(p.x, p.y);

        // If target tile has lava, or has an adjacent lava neighbor: OBSIDIAN!
        if (curTile === TileType.LAVA || this.hasAdjacentTile(p.x, p.y, TileType.LAVA)) {
          this.setTile(p.x, p.y, TileType.OBSIDIAN);
          if (callbacks.onSteamReaction) callbacks.onSteamReaction(p.x, p.y);
        } else if (curTile === TileType.AIR) {
          this.setTile(p.x, p.y, TileType.WATER);
          this.setWaterLevel(p.x, p.y, p.level);
          if (callbacks.onWaterFlow) callbacks.onWaterFlow(p.x, p.y);
        }
      }
    }

    // 3. Scan Active Chunks for Breaches & Immediate Lava/Water Collision
    this.liquidTimer += dt;
    if (this.liquidTimer < 0.2) return;
    this.liquidTimer = 0;

    const centerCx = Math.floor(centerTileX / CHUNK_SIZE);
    const centerCy = Math.floor(centerTileY / CHUNK_SIZE);

    for (let ccy = centerCy - 2; ccy <= centerCy + 2; ccy++) {
      for (let ccx = centerCx - 2; ccx <= centerCx + 2; ccx++) {
        const chunk = this.getChunk(ccx, ccy);
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const tile = chunk.getTile(lx, ly);
            const wx = ccx * CHUNK_SIZE + lx;
            const wy = ccy * CHUNK_SIZE + ly;

            // Direct Contact Reaction: Lava next to Water -> turns into Obsidian
            if (tile === TileType.LAVA && this.hasAdjacentTile(wx, wy, TileType.WATER)) {
              this.setTile(wx, wy, TileType.OBSIDIAN);
              this.pendingLava.delete(`${wx},${wy}`);
              if (callbacks.onSteamReaction) callbacks.onSteamReaction(wx, wy);
              continue;
            }

            // Lava Spreading
            if (tile === TileType.LAVA) {
              const level = chunk.getLavaLevel(lx, ly) || 5;
              if (level > 1) {
                const neighbors = [
                  { x: wx + 1, y: wy },
                  { x: wx - 1, y: wy },
                  { x: wx, y: wy + 1 },
                  { x: wx, y: wy - 1 },
                ];

                for (const n of neighbors) {
                  const nTile = this.getTile(n.x, n.y);
                  const nKey = `${n.x},${n.y}`;

                  if (nTile === TileType.WATER) {
                    this.setTile(n.x, n.y, TileType.OBSIDIAN);
                    if (callbacks.onSteamReaction) callbacks.onSteamReaction(n.x, n.y);
                  } else if (nTile === TileType.AIR && !this.pendingLava.has(nKey)) {
                    // If water is also trying to enter here: instant obsidian!
                    if (this.pendingWater.has(nKey)) {
                      this.pendingWater.delete(nKey);
                      this.setTile(n.x, n.y, TileType.OBSIDIAN);
                      if (callbacks.onSteamReaction) callbacks.onSteamReaction(n.x, n.y);
                    } else {
                      this.pendingLava.set(nKey, {
                        x: n.x,
                        y: n.y,
                        type: TileType.LAVA,
                        level: level - 1,
                        timer: 0.65,
                        maxTimer: 0.65,
                      });
                      if (callbacks.onLavaTelegraph) callbacks.onLavaTelegraph(n.x, n.y);
                    }
                  }
                }
              }
            }

            // Water Spreading
            else if (tile === TileType.WATER) {
              const level = chunk.getWaterLevel(lx, ly) || 6;
              if (level > 1) {
                const neighbors = [
                  { x: wx + 1, y: wy },
                  { x: wx - 1, y: wy },
                  { x: wx, y: wy + 1 },
                  { x: wx, y: wy - 1 },
                ];

                for (const n of neighbors) {
                  const nTile = this.getTile(n.x, n.y);
                  const nKey = `${n.x},${n.y}`;

                  if (nTile === TileType.LAVA) {
                    this.setTile(n.x, n.y, TileType.OBSIDIAN);
                    if (callbacks.onSteamReaction) callbacks.onSteamReaction(n.x, n.y);
                  } else if (nTile === TileType.AIR && !this.pendingWater.has(nKey)) {
                    if (this.pendingLava.has(nKey)) {
                      this.pendingLava.delete(nKey);
                      this.setTile(n.x, n.y, TileType.OBSIDIAN);
                      if (callbacks.onSteamReaction) callbacks.onSteamReaction(n.x, n.y);
                    } else {
                      this.pendingWater.set(nKey, {
                        x: n.x,
                        y: n.y,
                        type: TileType.WATER,
                        level: level - 1,
                        timer: 0.65,
                        maxTimer: 0.65,
                      });
                      if (callbacks.onWaterTelegraph) callbacks.onWaterTelegraph(n.x, n.y);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private hasAdjacentTile(wx: number, wy: number, target: TileType): boolean {
    return (
      this.getTile(wx + 1, wy) === target ||
      this.getTile(wx - 1, wy) === target ||
      this.getTile(wx, wy + 1) === target ||
      this.getTile(wx, wy - 1) === target
    );
  }

  // Bomb explosion
  public explode(centerTileX: number, centerTileY: number, radius: number): { brokenTiles: { x: number; y: number; tile: TileType }[]; drops: TileDrop[] } {
    const brokenTiles: { x: number; y: number; tile: TileType }[] = [];
    const allDrops: TileDrop[] = [];

    // Clear and solidify any pending lava breaches in blast radius
    for (const [key, p] of this.pendingLava) {
      const dx = p.x - centerTileX;
      const dy = p.y - centerTileY;
      if (Math.hypot(dx, dy) <= radius) {
        this.pendingLava.delete(key);
        this.setTile(p.x, p.y, TileType.HARD_STONE);
      }
    }
    for (const [key, p] of this.pendingWater) {
      const dx = p.x - centerTileX;
      const dy = p.y - centerTileY;
      if (Math.hypot(dx, dy) <= radius) {
        this.pendingWater.delete(key);
        this.setTile(p.x, p.y, TileType.AIR);
      }
    }

    const minX = Math.floor(centerTileX - radius);
    const maxX = Math.ceil(centerTileX + radius);
    const minY = Math.floor(centerTileY - radius);
    const maxY = Math.ceil(centerTileY + radius);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerTileX;
        const dy = y - centerTileY;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d <= radius) {
          // Blast shatters torches
          this.removeTorch(x, y);

          const tile = this.getTile(x, y);
          if (tile === TileType.AIR || tile === TileType.BEDROCK) continue;

          if (tile === TileType.LAVA) {
            // Explosive shockwave cools and hardens molten lava into solid granite/crust!
            this.setTile(x, y, TileType.HARD_STONE);
            brokenTiles.push({ x, y, tile });
            continue;
          }

          const def = TILE_DEFINITIONS[tile];
          // Explosive power decreases with distance
          const blastPower = (1 - d / (radius + 0.5)) * 100;

          if (blastPower >= def.blastResistance) {
            this.setTile(x, y, TileType.AIR);
            brokenTiles.push({ x, y, tile });

            for (const drop of def.drops) {
              if (Math.random() <= drop.chance) {
                allDrops.push({ ...drop });
              }
            }
          } else {
            // Apply partial damage from blast
            this.damageTile(x, y, blastPower * 0.1, 999);
          }
        }
      }
    }

    return { brokenTiles, drops: allDrops };
  }

  public addTorch(wx: number, wy: number): boolean {
    if (this.getTile(wx, wy) !== TileType.AIR) return false;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cy);
    if (chunk.hasTorch(lx, ly)) return false;
    chunk.addTorch(lx, ly);
    return true;
  }

  public removeTorch(wx: number, wy: number): boolean {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return this.getChunk(cx, cy).removeTorch(lx, ly);
  }

  public hasTorch(wx: number, wy: number): boolean {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return this.getChunk(cx, cy).hasTorch(lx, ly);
  }

  public getVisibleTorches(minTx: number, maxTx: number, minTy: number, maxTy: number): Torch[] {
    const minCx = Math.floor(minTx / CHUNK_SIZE);
    const maxCx = Math.floor(maxTx / CHUNK_SIZE);
    const minCy = Math.floor(minTy / CHUNK_SIZE);
    const maxCy = Math.floor(maxTy / CHUNK_SIZE);

    const result: Torch[] = [];

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let ccx = minCx; ccx <= maxCx; ccx++) {
        const chunk = this.getChunk(ccx, cy);
        for (const t of chunk.torches) {
          const wx = ccx * CHUNK_SIZE + t.lx;
          const wy = cy * CHUNK_SIZE + t.ly;
          if (wx >= minTx && wx <= maxTx && wy >= minTy && wy <= maxTy) {
            result.push({
              tileX: wx,
              tileY: wy,
              flickerOffset: t.flickerOffset,
            });
          }
        }
      }
    }

    return result;
  }

  public getSavedDeltas(): SavedChunkDelta[] {
    const deltasMap = new Map<string, SavedChunkDelta>(this.savedDeltas);
    for (const [key, chunk] of this.chunks.entries()) {
      if (chunk.isModified || chunk.modifiedTiles.size > 0) {
        const changes: [number, number, number][] = [];
        for (const [idx, type] of chunk.modifiedTiles.entries()) {
          const lx = idx % CHUNK_SIZE;
          const ly = Math.floor(idx / CHUNK_SIZE);
          changes.push([lx, ly, type]);
        }
        deltasMap.set(key, {
          layer: chunk.layer ?? 0,
          cx: chunk.cx,
          cy: chunk.cy,
          changes,
          torches: chunk.torches.map(t => ({ lx: t.lx, ly: t.ly, flickerOffset: t.flickerOffset })),
        });
      }
    }
    return Array.from(deltasMap.values());
  }

  public applySavedDeltas(deltas: SavedChunkDelta[]) {
    this.savedDeltas.clear();
    for (const delta of deltas) {
      const deltaLayer = delta.layer ?? 0;
      const key = this.getChunkKey(delta.cx, delta.cy, deltaLayer);
      this.savedDeltas.set(key, delta);
      const chunk = this.chunks.get(key);
      if (chunk) {
        for (const [lx, ly, tileType] of delta.changes) {
          chunk.tiles[ly * CHUNK_SIZE + lx] = tileType;
          chunk.modifiedTiles.set(ly * CHUNK_SIZE + lx, tileType);
          if (tileType !== TileType.LAVA) chunk.lavaLevels[ly * CHUNK_SIZE + lx] = 0;
          if (tileType !== TileType.WATER) chunk.waterLevels[ly * CHUNK_SIZE + lx] = 0;
        }
        chunk.torches = delta.torches.map(t => ({ lx: t.lx, ly: t.ly, flickerOffset: t.flickerOffset }));
        chunk.isModified = true;
      }
    }
  }

  public reset(newSeed: number) {
    this.seed = newSeed;
    this.currentLayer = 0;
    this.noiseCave = new SimplexNoise(newSeed);
    this.noiseOre = new SimplexNoise(newSeed + 101);
    this.noiseTerrain = new SimplexNoise(newSeed + 202);
    this.noiseLava = new SimplexNoise(newSeed + 303);
    this.noiseWater = new SimplexNoise(newSeed + 404);
    this.chunks.clear();
    this.savedDeltas.clear();
    this.pendingLava.clear();
    this.pendingWater.clear();
    this.liquidTimer = 0;
  }
}
