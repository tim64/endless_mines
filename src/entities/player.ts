import { TILE_SIZE, PICKAXE_TIERS } from '../constants';
import { Inventory, PickaxeInfo, TileType } from '../types';
import { World } from '../world/world';

export class Player {
  // Discrete Grid Coordinates
  public tileX: number = 0;
  public tileY: number = 0;
  public targetTileX: number = 0;
  public targetTileY: number = 0;

  // Grid Movement Animation State
  public isMoving: boolean = false;
  public moveProgress: number = 0.0; // 0.0 to 1.0
  public stepDuration: number = 0.14; // Seconds per tile step (crisp & responsive)

  // Interpolated World Pixel Coordinates for smooth rendering
  public x: number = 0;
  public y: number = 0;

  public hp: number = 100;
  public maxHp: number = 100;

  public inventory: Inventory = {
    dirt: 0,
    stone: 0,
    coal: 0,
    iron: 0,
    sulfur: 0,
    gems: 0,
    obsidian: 0,
  };

  public pickaxeTier: number = 1; // starts with Wooden Pickaxe
  public bombs: number = 3;
  public lightRadius: number = 105; // in pixels

  // Strictly Cardinal Facing: (0, 1) = Down, (0, -1) = Up, (-1, 0) = Left, (1, 0) = Right
  public facingX: number = 0;
  public facingY: number = 1;

  constructor(startTileX: number = 0, startTileY: number = 0) {
    this.tileX = startTileX;
    this.tileY = startTileY;
    this.targetTileX = startTileX;
    this.targetTileY = startTileY;
    this.updatePixelCoords();
  }

  public getPickaxe(): PickaxeInfo {
    return PICKAXE_TIERS[this.pickaxeTier] || PICKAXE_TIERS[0];
  }

  public getTileCoord(): { tx: number; ty: number } {
    return {
      tx: this.tileX,
      ty: this.tileY,
    };
  }

  public getFacingTileCoord(): { tx: number; ty: number } {
    return {
      tx: this.tileX + this.facingX,
      ty: this.tileY + this.facingY,
    };
  }

  public updatePixelCoords() {
    const curPxX = (this.tileX + 0.5) * TILE_SIZE;
    const curPxY = (this.tileY + 0.5) * TILE_SIZE;
    const tarPxX = (this.targetTileX + 0.5) * TILE_SIZE;
    const tarPxY = (this.targetTileY + 0.5) * TILE_SIZE;

    // Smooth movement interpolation
    this.x = curPxX + (tarPxX - curPxX) * this.moveProgress;
    this.y = curPxY + (tarPxY - curPxY) * this.moveProgress;
  }

  public update(dt: number) {
    if (this.isMoving) {
      this.moveProgress += dt / this.stepDuration;
      if (this.moveProgress >= 1.0) {
        this.tileX = this.targetTileX;
        this.tileY = this.targetTileY;
        this.moveProgress = 0.0;
        this.isMoving = false;
      }
    }
    this.updatePixelCoords();
  }

  /**
   * Attempts a cardinal grid move.
   * If wall is encountered, turns to face it and reports wall collision (for mining).
   */
  public tryStep(
    dirX: number,
    dirY: number,
    world: World
  ): { moved: boolean; hitWall: boolean; wallTile?: { tx: number; ty: number } } {
    // Strictly cardinal: horizontal takes precedence if specified, else vertical
    if (dirX !== 0) {
      this.facingX = dirX > 0 ? 1 : -1;
      this.facingY = 0;
    } else if (dirY !== 0) {
      this.facingX = 0;
      this.facingY = dirY > 0 ? 1 : -1;
    }

    if (this.isMoving) {
      return { moved: false, hitWall: false };
    }

    const nextTx = this.tileX + this.facingX;
    const nextTy = this.tileY + this.facingY;

    if (world.isSolid(nextTx, nextTy)) {
      return {
        moved: false,
        hitWall: true,
        wallTile: { tx: nextTx, ty: nextTy },
      };
    }

    // Free tile -> start stepping into it
    this.targetTileX = nextTx;
    this.targetTileY = nextTy;
    this.isMoving = true;
    this.moveProgress = 0.0;

    return { moved: true, hitWall: false };
  }

  public setFacing(dirX: number, dirY: number) {
    if (Math.abs(dirX) >= Math.abs(dirY) && dirX !== 0) {
      this.facingX = dirX > 0 ? 1 : -1;
      this.facingY = 0;
    } else if (dirY !== 0) {
      this.facingX = 0;
      this.facingY = dirY > 0 ? 1 : -1;
    }
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
