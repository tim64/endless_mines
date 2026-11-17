import { TILE_SIZE, TILE_DEFINITIONS } from '../constants';
import { TileType, Particle, FloatingText } from '../types';
import { World } from '../world/world';
import { Player } from '../entities/player';
import { Bomb } from '../entities/bomb';
import { Camera } from './camera';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;

  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    this.lightCanvas = document.createElement('canvas');
    const lCtx = this.lightCanvas.getContext('2d');
    if (!lCtx) throw new Error('Could not get light 2D context');
    this.lightCtx = lCtx;
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.lightCanvas.width = width;
    this.lightCanvas.height = height;

    this.ctx.imageSmoothingEnabled = false;
    this.lightCtx.imageSmoothingEnabled = false;
  }

  public addParticle(x: number, y: number, color: string, count: number = 5, speed: number = 60) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: 1 + Math.random() * 2.5,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.4,
      });
    }
  }

  public addExplosionParticles(x: number, y: number, radiusPx: number) {
    // Blast shockwave sparks
    const colors = ['#ff4400', '#ffbb00', '#ffeeaa', '#444444', '#777777'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radiusPx;
      const spd = 40 + Math.random() * 140;
      this.particles.push({
        x: x + Math.cos(angle) * (dist * 0.3),
        y: y + Math.sin(angle) * (dist * 0.3),
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.5,
      });
    }
  }

  public addFloatingText(x: number, y: number, text: string, color: string = '#88c0d0') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 0,
      maxLife: 1.0,
    });
  }

  public updateEffects(dt: number) {
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.y -= 18 * dt; // Float upwards
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public render(
    world: World,
    player: Player,
    bombs: Bomb[],
    camera: Camera,
    hoveredTile: { tx: number; ty: number } | null
  ) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Clear background
    ctx.fillStyle = '#0e0f14';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    // Camera Transform
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Visible bounds calculation
    const bounds = camera.getVisibleWorldBounds();
    const minTileX = Math.floor(bounds.minX / TILE_SIZE) - 1;
    const maxTileX = Math.ceil(bounds.maxX / TILE_SIZE) + 1;
    const minTileY = Math.floor(bounds.minY / TILE_SIZE) - 1;
    const maxTileY = Math.ceil(bounds.maxY / TILE_SIZE) + 1;

    // 1. Render Visible Tiles
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = world.getTile(tx, ty);
        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE;

        if (tile === TileType.AIR) {
          // Render bedrock floor / dirt background
          ctx.fillStyle = '#171922';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Small gravel flecks in empty tunnels
          if ((tx + ty * 13) % 7 === 0) {
            ctx.fillStyle = '#212431';
            ctx.fillRect(px + 4, py + 4, 2, 2);
          }
          continue;
        }

        const def = TILE_DEFINITIONS[tile];

        // Base tile fill
        ctx.fillStyle = def.color;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Retro Bevel edge
        ctx.fillStyle = def.edgeColor;
        ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
        ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);

        // Tile specific ore speckles
        if (def.detailColor) {
          ctx.fillStyle = def.detailColor;
          const hash = Math.abs(tx * 31 + ty * 17);
          const ox = 3 + (hash % 8);
          const oy = 3 + ((hash >> 3) % 8);
          ctx.fillRect(px + ox, py + oy, 3, 3);
          if (tile === TileType.GEM) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + ox + 1, py + oy + 1, 1, 1);
          }
        }

        // Damage Cracks Overlay
        const dmg = world.getDamage(tx, ty);
        if (dmg > 0 && def.maxHp > 0) {
          const ratio = Math.min(1.0, dmg / def.maxHp);
          ctx.strokeStyle = `rgba(0, 0, 0, ${0.4 + ratio * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 3);
          ctx.lineTo(px + 8, py + 8);
          if (ratio > 0.3) {
            ctx.lineTo(px + 13, py + 6);
            ctx.moveTo(px + 8, py + 8);
            ctx.lineTo(px + 6, py + 14);
          }
          if (ratio > 0.6) {
            ctx.moveTo(px + 4, py + 12);
            ctx.lineTo(px + 12, py + 12);
          }
          ctx.stroke();
        }
      }
    }

    // 2. Render Hover/Target Selector
    if (hoveredTile) {
      const hx = hoveredTile.tx * TILE_SIZE;
      const hy = hoveredTile.ty * TILE_SIZE;
      ctx.strokeStyle = '#88c0d0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx - 0.5, hy - 0.5, TILE_SIZE + 1, TILE_SIZE + 1);
    }

    // 3. Render Bombs
    for (const b of bombs) {
      ctx.save();
      ctx.translate(b.x, b.y);

      const pulse = b.getPulsePhase();
      const radius = 5 + (pulse > 0 ? pulse * 1.5 : 0);

      // Bomb shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(1, 2, radius, 0, Math.PI * 2);
      ctx.fill();

      // Bomb Body (Classic retro black sphere)
      ctx.fillStyle = pulse > 0.6 ? '#bf616a' : '#22252a';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#4c566a';
      ctx.beginPath();
      ctx.arc(-2, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Fuse & Burning Spark
      ctx.strokeStyle = '#d08770';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.quadraticCurveTo(2, -radius - 3, 4, -radius - 4);
      ctx.stroke();

      ctx.fillStyle = '#ebcb8b';
      ctx.fillRect(3, -radius - 5, 2, 2);
      ctx.restore();
    }

    // 4. Render Player
    ctx.save();
    ctx.translate(player.x, player.y);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player Body (Retro Miner Overalls)
    ctx.fillStyle = '#3b4252';
    ctx.fillRect(-4, -2, 8, 7);

    // Helmet (Safety Yellow/Orange)
    ctx.fillStyle = '#d08770';
    ctx.fillRect(-5, -6, 10, 5);

    // Headlamp
    ctx.fillStyle = '#ebcb8b';
    const hx = player.facingX * 3;
    const hy = player.facingY * 3 - 4;
    ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);

    // Pickaxe in hand
    const pick = player.getPickaxe();
    ctx.fillStyle = pick.color;
    const handX = player.facingX * 5;
    const handY = player.facingY * 4;
    ctx.fillRect(handX - 1, handY - 1, 3, 3);

    ctx.restore();

    // 5. Render Particles
    for (const p of this.particles) {
      const alpha = 1.0 - p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;

    // 6. Render Floating Texts
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      const alpha = 1.0 - ft.life / ft.maxLife;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1.0;

    ctx.restore(); // Restore camera transform

    // 7. Dynamic Fog of War / Lighting
    this.renderLighting(player, bombs, camera);
  }

  private renderLighting(player: Player, bombs: Bomb[], camera: Camera) {
    const lCtx = this.lightCtx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Pitch dark ambient underground
    lCtx.fillStyle = 'rgba(5, 6, 9, 0.92)';
    lCtx.fillRect(0, 0, cw, ch);

    lCtx.globalCompositeOperation = 'destination-out';

    // Player Headlamp Light
    const playerScreen = camera.worldToScreen(player.x, player.y);
    const rad = player.lightRadius * camera.zoom;
    const gradient = lCtx.createRadialGradient(
      playerScreen.sx,
      playerScreen.sy,
      rad * 0.15,
      playerScreen.sx,
      playerScreen.sy,
      rad
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    lCtx.fillStyle = gradient;
    lCtx.beginPath();
    lCtx.arc(playerScreen.sx, playerScreen.sy, rad, 0, Math.PI * 2);
    lCtx.fill();

    // Bomb Sparks / Light
    for (const b of bombs) {
      const bs = camera.worldToScreen(b.x, b.y);
      const bRad = (18 + Math.random() * 8) * camera.zoom;
      const bGrad = lCtx.createRadialGradient(bs.sx, bs.sy, 2, bs.sx, bs.sy, bRad);
      bGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
      bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = bGrad;
      lCtx.beginPath();
      lCtx.arc(bs.sx, bs.sy, bRad, 0, Math.PI * 2);
      lCtx.fill();
    }

    lCtx.globalCompositeOperation = 'source-over';

    // Draw darkness onto main canvas
    this.ctx.drawImage(this.lightCanvas, 0, 0);
  }
}
