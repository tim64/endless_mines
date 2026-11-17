import { CHUNK_SIZE, TILE_DEFINITIONS } from '../constants';
import { TileType } from '../types';

export class Chunk {
  public cx: number;
  public cy: number;
  public tiles: Uint8Array;
  public damage: Float32Array;
  public lavaLevels: Uint8Array;
  public waterLevels: Uint8Array;
  public torches: { lx: number; ly: number; flickerOffset: number }[] = [];
  public isModified: boolean = false;

  constructor(cx: number, cy: number) {
    this.cx = cx;
    this.cy = cy;
    this.tiles = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    this.damage = new Float32Array(CHUNK_SIZE * CHUNK_SIZE);
    this.lavaLevels = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    this.waterLevels = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  }

  private getIndex(lx: number, ly: number): number {
    return ly * CHUNK_SIZE + lx;
  }

  public getTile(lx: number, ly: number): TileType {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) {
      return TileType.BEDROCK;
    }
    return this.tiles[this.getIndex(lx, ly)];
  }

  public setTile(lx: number, ly: number, type: TileType) {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return;
    const idx = this.getIndex(lx, ly);
    this.tiles[idx] = type;
    this.damage[idx] = 0;
    if (type !== TileType.AIR) {
      this.removeTorch(lx, ly);
    }
    if (type !== TileType.LAVA) {
      this.lavaLevels[idx] = 0;
    }
    if (type !== TileType.WATER) {
      this.waterLevels[idx] = 0;
    }
    this.isModified = true;
  }

  public addTorch(lx: number, ly: number, flickerOffset: number = Math.random() * 100) {
    if (!this.hasTorch(lx, ly)) {
      this.torches.push({ lx, ly, flickerOffset });
      this.isModified = true;
    }
  }

  public removeTorch(lx: number, ly: number): boolean {
    const idx = this.torches.findIndex(t => t.lx === lx && t.ly === ly);
    if (idx !== -1) {
      this.torches.splice(idx, 1);
      this.isModified = true;
      return true;
    }
    return false;
  }

  public hasTorch(lx: number, ly: number): boolean {
    return this.torches.some(t => t.lx === lx && t.ly === ly);
  }

  public getLavaLevel(lx: number, ly: number): number {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return 0;
    return this.lavaLevels[this.getIndex(lx, ly)];
  }

  public setLavaLevel(lx: number, ly: number, level: number) {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return;
    this.lavaLevels[this.getIndex(lx, ly)] = level;
    this.isModified = true;
  }

  public getWaterLevel(lx: number, ly: number): number {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return 0;
    return this.waterLevels[this.getIndex(lx, ly)];
  }

  public setWaterLevel(lx: number, ly: number, level: number) {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return;
    this.waterLevels[this.getIndex(lx, ly)] = level;
    this.isModified = true;
  }

  public getDamage(lx: number, ly: number): number {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return 0;
    return this.damage[this.getIndex(lx, ly)];
  }

  public applyDamage(lx: number, ly: number, amount: number): { broken: boolean; tile: TileType } {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) {
      return { broken: false, tile: TileType.BEDROCK };
    }
    const idx = this.getIndex(lx, ly);
    const tile = this.tiles[idx];
    if (tile === TileType.AIR || tile === TileType.BEDROCK) {
      return { broken: false, tile };
    }

    const def = TILE_DEFINITIONS[tile as TileType];
    this.damage[idx] += amount;
    this.isModified = true;

    if (this.damage[idx] >= def.maxHp) {
      this.tiles[idx] = TileType.AIR;
      this.damage[idx] = 0;
      return { broken: true, tile };
    }

    return { broken: false, tile };
  }

  public resetDamage(lx: number, ly: number) {
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return;
    this.damage[this.getIndex(lx, ly)] = 0;
  }
}
