import { TILE_SIZE, PICKAXE_TIERS } from '../constants';
import { Inventory, PickaxeInfo, TileType } from '../types';
import { World } from '../world/world';

export class Player {
  public x: number = 0; // World pixels
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public width: number = 10;
  public height: number = 10;
  public speed: number = 90; // pixels per second

  public hp: number = 100;
  public maxHp: number = 100;

  public inventory: Inventory = {
    dirt: 0,
    stone: 0,
    coal: 0,
    iron: 0,
    sulfur: 0,
    gems: 0,
  };

  public pickaxeTier: number = 1; // starts with Wooden Pickaxe
  public bombs: number = 3;
  public lightRadius: number = 100; // in pixels

  public facingX: number = 0;
  public facingY: number = 1;

  public isMining: boolean = false;
  public miningTargetX: number | null = null;
  public miningTargetY: number | null = null;

  constructor(startX: number = 0, startY: number = 0) {
    this.x = startX;
    this.y = startY;
  }

  public getPickaxe(): PickaxeInfo {
    return PICKAXE_TIERS[this.pickaxeTier] || PICKAXE_TIERS[0];
  }

  public getTileCoord(): { tx: number; ty: number } {
    return {
      tx: Math.floor(this.x / TILE_SIZE),
      ty: Math.floor(this.y / TILE_SIZE),
    };
  }

  public move(inputX: number, inputY: number, dt: number, world: World) {
    if (inputX !== 0 || inputY !== 0) {
      // Normalize diagonal movement
      const len = Math.hypot(inputX, inputY);
      const nx = inputX / len;
      const ny = inputY / len;

      this.facingX = Math.sign(inputX) || this.facingX;
      this.facingY = Math.sign(inputY) || this.facingY;

      const moveDistX = nx * this.speed * dt;
      const moveDistY = ny * this.speed * dt;

      // X collision
      this.tryMoveAxis(moveDistX, 0, world);
      // Y collision
      this.tryMoveAxis(0, moveDistY, world);
    }
  }

  private tryMoveAxis(dx: number, dy: number, world: World) {
    const nextX = this.x + dx;
    const nextY = this.y + dy;
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    const minTileX = Math.floor((nextX - halfW) / TILE_SIZE);
    const maxTileX = Math.floor((nextX + halfW) / TILE_SIZE);
    const minTileY = Math.floor((nextY - halfH) / TILE_SIZE);
    const maxTileY = Math.floor((nextY + halfH) / TILE_SIZE);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (world.isSolid(tx, ty)) {
          // Block collision!
          return;
        }
      }
    }

    this.x = nextX;
    this.y = nextY;
  }

  public setMiningTarget(tx: number | null, ty: number | null) {
    this.miningTargetX = tx;
    this.miningTargetY = ty;
    this.isMining = tx !== null && ty !== null;
  }

  public takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
  }

  public heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  public addResource(res: keyof Inventory, count: number) {
    this.inventory[res] = (this.inventory[res] || 0) + count;
  }
}
