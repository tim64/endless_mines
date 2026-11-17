import { CHUNK_SIZE, TILE_DEFINITIONS, TILE_SIZE } from '../constants';
import { TileType, TileDef, TileDrop } from '../types';
import { Chunk } from './chunk';
import { SimplexNoise } from '../utils/noise';

export interface PendingLava {
  x: number;
  y: number;
  level: number;
  timer: number;
  maxTimer: number;
}

export class World {
  private chunks: Map<string, Chunk> = new Map();
  private noiseCave: SimplexNoise;
  private noiseOre: SimplexNoise;
  private noiseTerrain: SimplexNoise;
  private noiseLava: SimplexNoise;
  private lavaTimer: number = 0;
  private pendingLava: Map<string, PendingLava> = new Map();
  public seed: number;

  constructor(seed: number = 4242) {
    this.seed = seed;
    this.noiseCave = new SimplexNoise(seed);
    this.noiseOre = new SimplexNoise(seed + 101);
    this.noiseTerrain = new SimplexNoise(seed + 202);
    this.noiseLava = new SimplexNoise(seed + 303);
  }

  private getChunkKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  public getChunk(cx: number, cy: number): Chunk {
    const key = this.getChunkKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generateChunk(cx, cy);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  private generateChunk(cx: number, cy: number): Chunk {
    const chunk = new Chunk(cx, cy);

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        const dist = Math.sqrt(wx * wx + wy * wy);

        // Safe starting cavern at (0, 0)
        if (dist <= 3.5) {
          chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.AIR;
          continue;
        }

        // Cave generation using noise
        const caveVal = this.noiseCave.noise2D(wx * 0.05, wy * 0.05);
        const caveWorm = Math.abs(this.noiseCave.noise2D(wx * 0.08, wy * 0.08));

        // Natural winding caves and caverns
        if (caveVal > 0.48 || caveWorm < 0.07) {
          chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.AIR;
          continue;
        }

        // Lava Pockets: deep underground, strictly sealed inside solid rock
        const lavaNoise = this.noiseLava.noise2D(wx * 0.08, wy * 0.08);
        const isFarEnough = dist > 14;
        const isSealedInsideRock = caveVal < 0.32 && caveWorm > 0.16;

        if (isFarEnough && isSealedInsideRock && lavaNoise > 0.62) {
          chunk.tiles[ly * CHUNK_SIZE + lx] = TileType.LAVA;
          chunk.setLavaLevel(lx, ly, 5); // Source lava block
          continue;
        }

        // Base terrain type by distance from spawn
        const terrainNoise = this.noiseTerrain.noise2D(wx * 0.04, wy * 0.04);
        let baseTile: TileType = TileType.DIRT;

        if (dist < 15) {
          baseTile = terrainNoise > 0.3 ? TileType.STONE : TileType.DIRT;
        } else if (dist < 40) {
          if (terrainNoise > 0.4) baseTile = TileType.HARD_STONE;
          else if (terrainNoise > -0.2) baseTile = TileType.STONE;
          else baseTile = TileType.DIRT;
        } else {
          // Deeper / further world
          if (terrainNoise > 0.1) baseTile = TileType.HARD_STONE;
          else baseTile = TileType.STONE;
        }

        // Ore Vein Generation
        const oreNoise = this.noiseOre.noise2D(wx * 0.12, wy * 0.12);
        const rareOreNoise = this.noiseOre.noise2D(wx * 0.18 + 50, wy * 0.18 + 50);

        let finalTile: TileType = baseTile;

        // Coal: common everywhere in stone/dirt
        if (oreNoise > 0.58 && dist > 5) {
          finalTile = TileType.COAL;
        }
        // Sulfur: for bomb crafting, appears in clusters
        else if (oreNoise < -0.62 && dist > 8) {
          finalTile = TileType.SULFUR;
        }
        // Iron: appears further out or deeper
        else if (rareOreNoise > 0.65 && dist > 18) {
          finalTile = TileType.IRON;
        }
        // Gems: rare, in the deep hard stone
        else if (rareOreNoise < -0.72 && dist > 35) {
          finalTile = TileType.GEM;
        }

        chunk.tiles[ly * CHUNK_SIZE + lx] = finalTile;
      }
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
    if (tile === TileType.AIR || tile === TileType.BEDROCK) {
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
    return tile !== TileType.AIR && tile !== TileType.LAVA;
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

  public getPendingLava(): PendingLava[] {
    return Array.from(this.pendingLava.values());
  }

  /**
   * Viscous lava spread simulation with a telegraphed warning delay (~0.65s).
   * Gives the player time to react and step back before molten lava actually spills into the tile!
   */
  public updateLava(
    dt: number,
    centerTileX: number,
    centerTileY: number,
    onFlow?: (wx: number, wy: number) => void,
    onTelegraph?: (wx: number, wy: number) => void,
    onSimmer?: (wx: number, wy: number) => void
  ) {
    // 1. Process pending countdowns every frame
    for (const [key, p] of this.pendingLava) {
      p.timer -= dt;
      if (onSimmer) onSimmer(p.x, p.y);

      if (p.timer <= 0) {
        this.pendingLava.delete(key);
        // Turn into lava only if still empty (not walled off)
        if (this.getTile(p.x, p.y) === TileType.AIR) {
          this.setTile(p.x, p.y, TileType.LAVA);
          this.setLavaLevel(p.x, p.y, p.level);
          if (onFlow) onFlow(p.x, p.y);
        }
      }
    }

    // 2. Scan active chunks periodically for new breaches
    this.lavaTimer += dt;
    if (this.lavaTimer < 0.2) return;
    this.lavaTimer = 0;

    const centerCx = Math.floor(centerTileX / CHUNK_SIZE);
    const centerCy = Math.floor(centerTileY / CHUNK_SIZE);

    // Check active chunks around the player
    for (let ccy = centerCy - 2; ccy <= centerCy + 2; ccy++) {
      for (let ccx = centerCx - 2; ccx <= centerCx + 2; ccx++) {
        const chunk = this.getChunk(ccx, ccy);
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const tile = chunk.getTile(lx, ly);
            if (tile === TileType.LAVA) {
              const level = chunk.getLavaLevel(lx, ly) || 5;
              if (level > 1) {
                const wx = ccx * CHUNK_SIZE + lx;
                const wy = ccy * CHUNK_SIZE + ly;

                const neighbors = [
                  { x: wx + 1, y: wy },
                  { x: wx - 1, y: wy },
                  { x: wx, y: wy + 1 },
                  { x: wx, y: wy - 1 },
                ];

                for (const n of neighbors) {
                  const nKey = `${n.x},${n.y}`;
                  if (this.getTile(n.x, n.y) === TileType.AIR && !this.pendingLava.has(nKey)) {
                    // ~0.65s warning delay so player can react and step back!
                    this.pendingLava.set(nKey, {
                      x: n.x,
                      y: n.y,
                      level: level - 1,
                      timer: 0.65,
                      maxTimer: 0.65,
                    });
                    if (onTelegraph) onTelegraph(n.x, n.y);
                  }
                }
              }
            }
          }
        }
      }
    }
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
}
