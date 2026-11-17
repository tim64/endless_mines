import { TILE_SIZE } from '../constants';

export class Bomb {
  public x: number; // World pixel coordinates
  public y: number;
  public tileX: number;
  public tileY: number;
  public timer: number = 2.5; // seconds
  public maxTimer: number = 2.5;
  public radius: number = 3.2; // tiles radius
  public isDetonated: boolean = false;

  constructor(tileX: number, tileY: number) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = (tileX + 0.5) * TILE_SIZE;
    this.y = (tileY + 0.5) * TILE_SIZE;
  }

  public update(dt: number): boolean {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.isDetonated = true;
      return true; // Explode!
    }
    return false;
  }

  public getPulsePhase(): number {
    // Faster pulsing as timer runs down
    const speed = 4 + (1 - this.timer / this.maxTimer) * 16;
    return Math.sin(this.timer * speed);
  }
}
