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

        if (tile === TileType.LAVA) {
          const time = performance.now() * 0.003;
          const bubble = Math.sin(time * 2 + tx * 1.5 + ty * 2.2);

          // Magma base color with subtle heat shimmer
          ctx.fillStyle = bubble > 0.3 ? '#ff4d00' : '#cc2900';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          // Hot inner glow
          ctx.fillStyle = '#ff9900';
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          // Yellow bubbling core
          ctx.fillStyle = '#ffee33';
          const bx = 4 + Math.floor((Math.sin(time * 3 + tx * 3) + 1) * 3);
          const by = 4 + Math.floor((Math.cos(time * 3 + ty * 3) + 1) * 3);
          ctx.fillRect(px + bx, py + by, 3, 3);

          // Floating dark crust fleck
          ctx.fillStyle = '#6b1100';
          const cxFleck = (tx * 7 + ty * 3) % 9 + 2;
          const cyFleck = (tx * 3 + ty * 7) % 9 + 2;
          ctx.fillRect(px + cxFleck, py + cyFleck, 3, 2);

          // Chance to spawn floating ember particle
          if (Math.random() < 0.02) {
            this.addParticle(px + Math.random() * TILE_SIZE, py + Math.random() * TILE_SIZE, '#ffaa00', 1, 25);
          }
          continue;
        }

        if (tile === TileType.WATER) {
          const time = performance.now() * 0.003;
          const ripple = Math.sin(time * 2 + tx * 1.8 + ty * 2.1);

          // Deep fluid water
          ctx.fillStyle = ripple > 0.2 ? '#227cc9' : '#175c96';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          // Lighter water surface wave
          ctx.fillStyle = '#4da6ff';
          const waveY = py + 3 + Math.floor((ripple + 1) * 4);
          ctx.fillRect(px + 1, Math.min(py + TILE_SIZE - 2, waveY), TILE_SIZE - 2, 2);

          // Water foam bubble
          ctx.fillStyle = '#b3d9ff';
          const bx = 3 + Math.floor((Math.sin(time * 2 + tx * 2) + 1) * 4);
          const by = 3 + Math.floor((Math.cos(time * 2 + ty * 2) + 1) * 4);
          ctx.fillRect(px + bx, py + by, 2, 2);

          // Small splash particle chance
          if (Math.random() < 0.015) {
            this.addParticle(px + Math.random() * TILE_SIZE, py + Math.random() * TILE_SIZE, '#80c0ff', 1, 15);
          }
          continue;
        }

        if (tile === TileType.OBSIDIAN) {
          // Deep glossy volcanic glass
          ctx.fillStyle = '#161124';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#0d0917';
          ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
          ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
          ctx.fillStyle = '#8b5cf6';
          ctx.fillRect(px + 4, py + 4, 3, 3);
          ctx.fillRect(px + 10, py + 9, 2, 2);
          ctx.fillStyle = '#c084fc';
          ctx.fillRect(px + 5, py + 5, 1, 1);
        } else if (tile === TileType.SNOW) {
          // Soft crisp snow with icy border
          ctx.fillStyle = '#f0f9ff';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#bae6fd';
          ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
          ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
          const hash = Math.abs(tx * 23 + ty * 37);
          if (hash % 4 === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 3 + (hash % 8), py + 3 + ((hash >> 2) % 8), 2, 2);
          }
        } else if (tile === TileType.ICE) {
          // Translucent frosty cyan ice
          ctx.fillStyle = '#7dd3fc';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(px + 3, py + 7, 5, 1);
          ctx.fillRect(px + 7, py + 8, 4, 1);
          ctx.fillRect(px + 10, py + 9, 3, 1);
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
          ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
        } else if (tile === TileType.PACKED_ICE) {
          // Deep solid arctic blue ice
          ctx.fillStyle = '#1d4ed8';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(px + 2, py + 2, 4, 2);
          ctx.fillRect(px + 8, py + 8, 5, 2);
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
          ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
        } else if (tile === TileType.RUIN_BRICK) {
          // Ancient mossy dark purple stone brick
          ctx.fillStyle = '#2b2138';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#181220';
          ctx.fillRect(px, py + 7, TILE_SIZE, 1);
          ctx.fillRect(px, py + TILE_SIZE - 1, TILE_SIZE, 1);
          ctx.fillRect(px + 8, py, 1, 7);
          ctx.fillRect(px + 4, py + 8, 1, 7);
          ctx.fillStyle = '#4c3a63';
          ctx.fillRect(px + 1, py + 1, 6, 1);
          ctx.fillRect(px + 9, py + 1, 6, 1);
          ctx.fillRect(px + 1, py + 8, 2, 1);
          ctx.fillRect(px + 5, py + 8, 10, 1);
        } else if (tile === TileType.CURSED_STONE) {
          // Ominous abyssal stone with dark magenta streaks
          ctx.fillStyle = '#171120';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#0f0a15';
          ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
          ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
          const pulse = Math.sin(performance.now() * 0.003 + tx * 2 + ty * 3);
          ctx.fillStyle = pulse > 0 ? '#a21caf' : '#701a75';
          ctx.fillRect(px + 4, py + 5, 3, 2);
          ctx.fillRect(px + 7, py + 6, 4, 1);
          ctx.fillRect(px + 10, py + 7, 2, 3);
        } else if (tile === TileType.BONE_BLOCK) {
          // Fossilized bone strata
          ctx.fillStyle = '#d6cbbe';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#9c8e7e';
          ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
          ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
          ctx.fillStyle = '#786b5c';
          ctx.fillRect(px + 3, py + 6, 5, 2);
          ctx.fillRect(px + 8, py + 7, 5, 2);
        } else if (tile === TileType.VOID_CRYSTAL) {
          // Deep eldritch glowing crystal
          ctx.fillStyle = '#2a163d';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#180c24';
          ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
          ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
          const glint = Math.sin(performance.now() * 0.005 + tx * 3 + ty * 2);
          ctx.fillStyle = glint > 0.4 ? '#f472b6' : '#d946ef';
          ctx.fillRect(px + 5, py + 4, 6, 7);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + 7, py + 6, 2, 2);
        } else {
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
            } else if (tile === TileType.GOLD || tile === TileType.SILVER) {
              const time = performance.now() * 0.004;
              const glint = Math.sin(time + tx * 3.1 + ty * 5.3);
              if (glint > 0.5) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(px + ox + 1, py + oy + 1, 1, 1);
              }
            }
          }
        }

        const def = TILE_DEFINITIONS[tile];

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

    // 1.5 Render Pending Lava Warnings (Telegraphed glowing cracks before eruption!)
    const pendingLava = world.getPendingLava();
    for (const pl of pendingLava) {
      const px = pl.x * TILE_SIZE;
      const py = pl.y * TILE_SIZE;
      const progress = 1.0 - pl.timer / pl.maxTimer;

      ctx.save();
      // Flashing hot orange warning fill
      const pulse = Math.sin(performance.now() * 0.02) * 0.15;
      ctx.fillStyle = `rgba(255, 60, 0, ${0.25 + progress * 0.4 + pulse})`;
      ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Fiery fissures cracking through the rock/floor
      ctx.strokeStyle = `rgba(255, 210, 0, ${0.6 + progress * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + 2, py + 8);
      ctx.lineTo(px + 7, py + 6);
      ctx.lineTo(px + 14, py + 10);
      ctx.moveTo(px + 7, py + 6);
      ctx.lineTo(px + 9, py + 2);
      ctx.stroke();

      ctx.restore();
    }

    // 1.6 Render Pending Water Warnings (Swirling blue water trickles before breach!)
    const pendingWater = world.getPendingWater();
    for (const pw of pendingWater) {
      const px = pw.x * TILE_SIZE;
      const py = pw.y * TILE_SIZE;
      const progress = 1.0 - pw.timer / pw.maxTimer;

      ctx.save();
      // Flashing cyan/blue warning fill
      const pulse = Math.sin(performance.now() * 0.02) * 0.15;
      ctx.fillStyle = `rgba(0, 140, 255, ${0.25 + progress * 0.35 + pulse})`;
      ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Water trickle fissures
      ctx.strokeStyle = `rgba(130, 210, 255, ${0.6 + progress * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 4);
      ctx.lineTo(px + 8, py + 9);
      ctx.lineTo(px + 13, py + 6);
      ctx.moveTo(px + 8, py + 9);
      ctx.lineTo(px + 9, py + 14);
      ctx.stroke();

      ctx.restore();
    }

    // 2. Render Hover/Target Selector
    if (hoveredTile) {
      const hx = hoveredTile.tx * TILE_SIZE;
      const hy = hoveredTile.ty * TILE_SIZE;
      ctx.strokeStyle = '#88c0d0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx - 0.5, hy - 0.5, TILE_SIZE + 1, TILE_SIZE + 1);
    }

    // 2.5 Render Torches
    const torches = world.getVisibleTorches(minTileX, maxTileX, minTileY, maxTileY);
    for (const t of torches) {
      const tx = (t.tileX + 0.5) * TILE_SIZE;
      const ty = (t.tileY + 0.5) * TILE_SIZE;

      ctx.save();
      // Wooden stick
      ctx.fillStyle = '#855427';
      ctx.fillRect(tx - 1, ty - 2, 2, 6);

      // Flickering flame
      const time = performance.now() * 0.006 + t.flickerOffset;
      const flicker = Math.sin(time * 3);

      // Outer orange flame
      ctx.fillStyle = '#ff6a00';
      ctx.beginPath();
      ctx.arc(tx, ty - 3 + flicker * 0.4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright yellow core
      ctx.fillStyle = '#ffee33';
      ctx.fillRect(tx - 1, ty - 4 + flicker * 0.4, 2, 2);

      // Spark chance
      if (Math.random() < 0.015) {
        this.addParticle(tx, ty - 4, '#ffcc00', 1, 15);
      }
      ctx.restore();
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

    // 5. Atmospheric Layer Particles (Snow in Winter, Void Embers in Ruins)
    if (player.tileY < 0 && Math.random() < 0.4) {
      const bounds = camera.getVisibleWorldBounds();
      const sx = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const sy = bounds.minY - 5;
      this.particles.push({
        x: sx,
        y: sy,
        vx: -15 + Math.random() * 30,
        vy: 30 + Math.random() * 40,
        color: '#f0f9ff',
        size: 1.5 + Math.random() * 2,
        life: 0,
        maxLife: 2.2,
      });
    } else if (player.tileY >= 80 && Math.random() < 0.25) {
      const bounds = camera.getVisibleWorldBounds();
      const sx = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const sy = bounds.maxY + 5;
      const colors = ['#d946ef', '#c084fc', '#f43f5e', '#7e22ce'];
      this.particles.push({
        x: sx,
        y: sy,
        vx: -10 + Math.random() * 20,
        vy: -(25 + Math.random() * 35),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1.5 + Math.random() * 2,
        life: 0,
        maxLife: 2.0,
      });
    }

    // 5.2 Render Particles
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
    this.renderLighting(world, player, bombs, camera);
  }

  private renderLighting(world: World, player: Player, bombs: Bomb[], camera: Camera) {
    const lCtx = this.lightCtx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // Ambient darkness depends on world layer (biome):
    let ambientStyle = 'rgba(5, 6, 9, 0.92)'; // Default underground darkness
    if (player.tileY < 0) {
      // Winter world: frosty daylight / pale cold twilight
      const depthRatio = Math.min(1.0, Math.abs(player.tileY) / 10);
      ambientStyle = `rgba(18, 28, 48, ${0.40 - depthRatio * 0.15})`; // bright, soft cold daylight!
    } else if (player.tileY >= 80) {
      // Sinister ruins: deep eerie purple-crimson abyss darkness
      ambientStyle = 'rgba(15, 4, 18, 0.94)';
    }
    lCtx.fillStyle = ambientStyle;
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

    // Lava Illumination
    const bounds = camera.getVisibleWorldBounds();
    const minTileX = Math.floor(bounds.minX / TILE_SIZE) - 1;
    const maxTileX = Math.ceil(bounds.maxX / TILE_SIZE) + 1;
    const minTileY = Math.floor(bounds.minY / TILE_SIZE) - 1;
    const maxTileY = Math.ceil(bounds.maxY / TILE_SIZE) + 1;

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (world.getTile(tx, ty) === TileType.LAVA) {
          const ls = camera.worldToScreen((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE);
          const lRad = (28 + Math.sin(performance.now() * 0.005 + tx) * 3) * camera.zoom;
          const lGrad = lCtx.createRadialGradient(ls.sx, ls.sy, 2, ls.sx, ls.sy, lRad);
          lGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
          lGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.6)');
          lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lCtx.fillStyle = lGrad;
          lCtx.beginPath();
          lCtx.arc(ls.sx, ls.sy, lRad, 0, Math.PI * 2);
          lCtx.fill();
        } else if (world.getTile(tx, ty) === TileType.WATER) {
          const ls = camera.worldToScreen((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE);
          const lRad = 16 * camera.zoom;
          const lGrad = lCtx.createRadialGradient(ls.sx, ls.sy, 1, ls.sx, ls.sy, lRad);
          lGrad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
          lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lCtx.fillStyle = lGrad;
          lCtx.beginPath();
          lCtx.arc(ls.sx, ls.sy, lRad, 0, Math.PI * 2);
          lCtx.fill();
        } else if (world.getTile(tx, ty) === TileType.VOID_CRYSTAL) {
          const ls = camera.worldToScreen((tx + 0.5) * TILE_SIZE, (ty + 0.5) * TILE_SIZE);
          const vRad = 24 * camera.zoom;
          const vGrad = lCtx.createRadialGradient(ls.sx, ls.sy, 2, ls.sx, ls.sy, vRad);
          vGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
          vGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          lCtx.fillStyle = vGrad;
          lCtx.beginPath();
          lCtx.arc(ls.sx, ls.sy, vRad, 0, Math.PI * 2);
          lCtx.fill();
        }
      }
    }

    // Pending Lava Warning Glow
    for (const pl of world.getPendingLava()) {
      const ls = camera.worldToScreen((pl.x + 0.5) * TILE_SIZE, (pl.y + 0.5) * TILE_SIZE);
      const lRad = 20 * camera.zoom;
      const lGrad = lCtx.createRadialGradient(ls.sx, ls.sy, 1, ls.sx, ls.sy, lRad);
      lGrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = lGrad;
      lCtx.beginPath();
      lCtx.arc(ls.sx, ls.sy, lRad, 0, Math.PI * 2);
      lCtx.fill();
    }

    // Pending Water Warning Glow
    for (const pw of world.getPendingWater()) {
      const ls = camera.worldToScreen((pw.x + 0.5) * TILE_SIZE, (pw.y + 0.5) * TILE_SIZE);
      const lRad = 18 * camera.zoom;
      const lGrad = lCtx.createRadialGradient(ls.sx, ls.sy, 1, ls.sx, ls.sy, lRad);
      lGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
      lGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = lGrad;
      lCtx.beginPath();
      lCtx.arc(ls.sx, ls.sy, lRad, 0, Math.PI * 2);
      lCtx.fill();
    }

    // Torch Warm Radial Illumination
    for (const t of world.getVisibleTorches(minTileX, maxTileX, minTileY, maxTileY)) {
      const ts = camera.worldToScreen((t.tileX + 0.5) * TILE_SIZE, (t.tileY + 0.5) * TILE_SIZE);
      const flicker = Math.sin(performance.now() * 0.008 + t.flickerOffset) * 4;
      const tRad = (52 + flicker) * camera.zoom;
      const tGrad = lCtx.createRadialGradient(ts.sx, ts.sy, 2, ts.sx, ts.sy, tRad);
      tGrad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
      tGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.65)');
      tGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = tGrad;
      lCtx.beginPath();
      lCtx.arc(ts.sx, ts.sy, tRad, 0, Math.PI * 2);
      lCtx.fill();
    }

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
