export class Camera {
  public x: number = 0; // World pixels
  public y: number = 0;
  public zoom: number = 2.5; // Default retro 2.5x pixel zoom
  public targetX: number = 0;
  public targetY: number = 0;

  public viewportWidth: number = 800;
  public viewportHeight: number = 600;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  public resize(width: number, height: number) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public follow(tx: number, ty: number, lerpFactor: number = 0.15) {
    this.targetX = tx;
    this.targetY = ty;
    this.x += (this.targetX - this.x) * lerpFactor;
    this.y += (this.targetY - this.y) * lerpFactor;
  }

  public screenToWorld(sx: number, sy: number): { wx: number; wy: number } {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;
    const wx = (sx - cx) / this.zoom + this.x;
    const wy = (sy - cy) / this.zoom + this.y;
    return { wx, wy };
  }

  public worldToScreen(wx: number, wy: number): { sx: number; sy: number } {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;
    const sx = (wx - this.x) * this.zoom + cx;
    const sy = (wy - this.y) * this.zoom + cy;
    return { sx, sy };
  }

  public getVisibleWorldBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;
    return {
      minX: this.x - halfW,
      maxX: this.x + halfW,
      minY: this.y - halfH,
      maxY: this.y + halfH,
    };
  }
}
