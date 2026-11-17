import { TILE_SIZE, TILE_DEFINITIONS } from './constants';
import { TileType } from './types';
import { World } from './world/world';
import { Player } from './entities/player';
import { Bomb } from './entities/bomb';
import { Camera } from './renderer/camera';
import { Renderer } from './renderer/renderer';
import { HUD } from './ui/hud';
import { SoundManager } from './audio';

// Setup Canvas and Engine
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const container = document.getElementById('game-container') as HTMLDivElement;

const audio = new SoundManager();
const world = new World(Math.floor(Math.random() * 100000));
const player = new Player(0, 0); // Spawn at center
const camera = new Camera(window.innerWidth, window.innerHeight);
const renderer = new Renderer(canvas);
const hud = new HUD(player);

const bombs: Bomb[] = [];

// Screen shake effect
let screenShake = 0;

// Input State
const keys: Record<string, boolean> = {};
let mouseScreenX = 0;
let mouseScreenY = 0;
let isMouseDown = false;
let hoveredTile: { tx: number; ty: number } | null = null;
let digSoundTimer = 0;

// Window Resize Handler
function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  camera.resize(w, h);
  renderer.resize(w, h);
}
window.addEventListener('resize', handleResize);
handleResize();

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  // Key E: Place Bomb
  if (e.code === 'KeyE') {
    tryPlaceBomb();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Mouse Listeners
window.addEventListener('mousemove', (e) => {
  mouseScreenX = e.clientX;
  mouseScreenY = e.clientY;
});

window.addEventListener('mousedown', (e) => {
  // Ignore clicks inside UI panels
  if ((e.target as HTMLElement).closest('#hud, #crafting-panel, #controls-hint')) {
    return;
  }

  if (e.button === 0) {
    isMouseDown = true;
  } else if (e.button === 2) {
    e.preventDefault();
    tryPlaceBomb();
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    isMouseDown = false;
  }
});

// Prevent context menu for right click bomb placement
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Zoom with Mouse Wheel
window.addEventListener('wheel', (e) => {
  if (e.deltaY < 0) {
    camera.zoom = Math.min(4.5, camera.zoom + 0.2);
  } else {
    camera.zoom = Math.max(1.5, camera.zoom - 0.2);
  }
}, { passive: true });

function tryPlaceBomb() {
  if (player.bombs <= 0) return;

  const pt = player.getTileCoord();
  // Don't place two bombs in the exact same spot
  const existing = bombs.find(b => b.tileX === pt.tx && b.tileY === pt.ty);
  if (existing) return;

  player.bombs--;
  bombs.push(new Bomb(pt.tx, pt.ty));
  audio.playBombPlace();
  hud.update();
}

// Main Game Loop
let lastTime = performance.now();

function gameLoop(now: number) {
  const dt = Math.min(0.05, (now - lastTime) / 1000); // Clamped delta time
  lastTime = now;

  // 1. Process Player Movement
  let inputX = 0;
  let inputY = 0;
  if (keys['KeyW'] || keys['ArrowUp']) inputY -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) inputY += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;

  player.move(inputX, inputY, dt, world);

  // 2. Camera Follow & Screen Shake
  camera.follow(player.x, player.y);
  if (screenShake > 0) {
    screenShake -= dt * 2.5;
    camera.x += (Math.random() - 0.5) * screenShake * 16;
    camera.y += (Math.random() - 0.5) * screenShake * 16;
  }

  // 3. Mouse Hover & Target Tile Calculation
  const worldPos = camera.screenToWorld(mouseScreenX, mouseScreenY);
  const hoverTx = Math.floor(worldPos.wx / TILE_SIZE);
  const hoverTy = Math.floor(worldPos.wy / TILE_SIZE);
  hoveredTile = { tx: hoverTx, ty: hoverTy };

  // 4. Mining Logic
  let targetMiningX: number | null = null;
  let targetMiningY: number | null = null;

  const playerTile = player.getTileCoord();

  // Spacebar digs in the facing direction
  if (keys['Space']) {
    targetMiningX = playerTile.tx + player.facingX;
    targetMiningY = playerTile.ty + player.facingY;
  } else if (isMouseDown && hoveredTile) {
    // Check distance between player and clicked tile (mining range max ~2.6 tiles)
    const pTileX = playerTile.tx;
    const pTileY = playerTile.ty;
    const distToTile = Math.hypot(hoveredTile.tx - pTileX, hoveredTile.ty - pTileY);

    if (distToTile <= 2.6) {
      targetMiningX = hoveredTile.tx;
      targetMiningY = hoveredTile.ty;
    }
  }

  if (targetMiningX !== null && targetMiningY !== null) {
    const tile = world.getTile(targetMiningX, targetMiningY);
    if (tile !== TileType.AIR && tile !== TileType.BEDROCK) {
      const pick = player.getPickaxe();
      const res = world.damageTile(targetMiningX, targetMiningY, pick.power * dt, pick.tier);

      // Dig sound and particles
      digSoundTimer += dt;
      if (digSoundTimer >= 0.18) {
        audio.playDig();
        digSoundTimer = 0;
      }

      const def = TILE_DEFINITIONS[tile];
      const targetPx = (targetMiningX + 0.5) * TILE_SIZE;
      const targetPy = (targetMiningY + 0.5) * TILE_SIZE;
      renderer.addParticle(targetPx, targetPy, def.color, 2, 40);

      // Block broken!
      if (res.broken) {
        audio.playBreak();
        renderer.addParticle(targetPx, targetPy, def.color, 12, 70);

        for (const drop of res.drops) {
          player.addResource(drop.resource, drop.count);
          audio.playCollect();
          renderer.addFloatingText(
            targetPx,
            targetPy,
            `+${drop.count} ${drop.resource.toUpperCase()}`,
            def.detailColor || '#88c0d0'
          );
        }
        hud.update();
      }
    }
  }

  // 5. Update Bombs & Explosions
  for (let i = bombs.length - 1; i >= 0; i--) {
    const bomb = bombs[i];
    const exploded = bomb.update(dt);
    if (exploded) {
      // Explode!
      audio.playExplosion();
      screenShake = 1.0;
      renderer.addExplosionParticles(bomb.x, bomb.y, bomb.radius * TILE_SIZE);

      const expRes = world.explode(bomb.tileX, bomb.tileY, bomb.radius);

      // Collect dropped resources from explosion
      for (const drop of expRes.drops) {
        player.addResource(drop.resource, drop.count);
        renderer.addFloatingText(
          bomb.x,
          bomb.y,
          `+${drop.count} ${drop.resource.toUpperCase()}`,
          '#ebcb8b'
        );
      }

      // Damage player if inside blast radius
      const distToPlayer = Math.hypot(player.x - bomb.x, player.y - bomb.y) / TILE_SIZE;
      if (distToPlayer <= bomb.radius) {
        const damage = Math.round((1 - distToPlayer / bomb.radius) * 75);
        player.takeDamage(damage);
        renderer.addFloatingText(player.x, player.y, `-${damage} HP!`, '#bf616a');
      }

      bombs.splice(i, 1);
      hud.update();
    }
  }

  // 6. Update Visual Effects & Particles
  renderer.updateEffects(dt);

  // 7. Render Everything
  renderer.render(world, player, bombs, camera, hoveredTile);

  // 8. Update HUD coords
  hud.update();

  requestAnimationFrame(gameLoop);
}

// Start Game Loop
requestAnimationFrame(gameLoop);
