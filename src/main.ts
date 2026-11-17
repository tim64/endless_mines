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

const audio = new SoundManager();
const world = new World(Math.floor(Math.random() * 100000));
const player = new Player(8, 8); // Spawn in the center of Miner's Starter Bunker
const camera = new Camera(window.innerWidth, window.innerHeight);
camera.follow(player.x, player.y, 1.0);
const renderer = new Renderer(canvas);
const hud = new HUD(player);

const bombs: Bomb[] = [];

// Screen shake effect
let screenShake = 0;

// Active Placeable Item Management (Bombs vs Torches)
type PlaceableItem = 'bomb' | 'torch';
let activeItem: PlaceableItem = 'bomb';

hud.onItemSelect = (item) => {
  activeItem = item;
};

// Grid Cardinal Direction Management (No Diagonals!)
type CardinalDir = 'Up' | 'Down' | 'Left' | 'Right';
const dirStack: CardinalDir[] = [];
let isSpacePressed = false;

// Mouse State
let mouseScreenX = 0;
let mouseScreenY = 0;
let isMouseDown = false;
let hoveredTile: { tx: number; ty: number } | null = null;
let digSoundTimer = 0;
let lavaBurnTimer = 0;

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

function pushDir(dir: CardinalDir) {
  const idx = dirStack.indexOf(dir);
  if (idx !== -1) dirStack.splice(idx, 1);
  dirStack.push(dir);
}

function removeDir(dir: CardinalDir) {
  const idx = dirStack.indexOf(dir);
  if (idx !== -1) dirStack.splice(idx, 1);
}

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
  if (e.repeat && e.code !== 'Space') return;

  if (e.code === 'KeyW' || e.code === 'ArrowUp') pushDir('Up');
  else if (e.code === 'KeyS' || e.code === 'ArrowDown') pushDir('Down');
  else if (e.code === 'KeyA' || e.code === 'ArrowLeft') pushDir('Left');
  else if (e.code === 'KeyD' || e.code === 'ArrowRight') pushDir('Right');

  if (e.code === 'Space') {
    isSpacePressed = true;
  }

  // Hotkeys for active item
  if (e.code === 'Digit1') {
    activeItem = 'bomb';
    hud.setActiveItem('bomb');
  } else if (e.code === 'Digit2') {
    activeItem = 'torch';
    hud.setActiveItem('torch');
  } else if (e.code === 'KeyQ') {
    activeItem = activeItem === 'bomb' ? 'torch' : 'bomb';
    hud.setActiveItem(activeItem);
  }

  // Key E: Use Active Item (Bomb or Torch)
  if (e.code === 'KeyE') {
    useActiveItem();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') removeDir('Up');
  else if (e.code === 'KeyS' || e.code === 'ArrowDown') removeDir('Down');
  else if (e.code === 'KeyA' || e.code === 'ArrowLeft') removeDir('Left');
  else if (e.code === 'KeyD' || e.code === 'ArrowRight') removeDir('Right');

  if (e.code === 'Space') {
    isSpacePressed = false;
  }
});

// Mouse Listeners
window.addEventListener('mousemove', (e) => {
  mouseScreenX = e.clientX;
  mouseScreenY = e.clientY;
});

window.addEventListener('mousedown', (e) => {
  // Ignore clicks inside UI panels
  if ((e.target as HTMLElement).closest('#hud, #crafting-panel, #hotbar, #controls-hint')) {
    return;
  }

  if (e.button === 0) {
    isMouseDown = true;
  } else if (e.button === 2) {
    e.preventDefault();
    useActiveItem();
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

function useActiveItem() {
  if (activeItem === 'bomb') {
    tryPlaceBomb();
  } else if (activeItem === 'torch') {
    tryPlaceTorch();
  }
}

function tryPlaceBomb() {
  if (player.bombs <= 0) return;

  const pt = player.getTileCoord();
  // Don't place two bombs in the exact same tile
  const existing = bombs.find(b => b.tileX === pt.tx && b.tileY === pt.ty);
  if (existing) return;

  player.bombs--;
  bombs.push(new Bomb(pt.tx, pt.ty));
  audio.playBombPlace();
  hud.update();
}

function tryPlaceTorch() {
  if (player.inventory.torches <= 0) return;

  const pt = player.getTileCoord();
  // Can only place torch on empty AIR tile and where no torch exists yet
  if (world.getTile(pt.tx, pt.ty) !== TileType.AIR || world.hasTorch(pt.tx, pt.ty)) {
    return;
  }

  const placed = world.addTorch(pt.tx, pt.ty);
  if (placed) {
    player.inventory.torches--;
    audio.playTorchPlace();
    renderer.addParticle((pt.tx + 0.5) * TILE_SIZE, (pt.ty + 0.5) * TILE_SIZE, '#ffaa00', 6, 20);
    hud.update();
  }
}

// Main Game Loop
let lastTime = performance.now();

function gameLoop(now: number) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // 1. Update Player Grid Transition
  player.update(dt);

  // 2. Process Grid Movement & Auto-Mining when bumping into walls
  let bumpingWallTile: { tx: number; ty: number } | null = null;

  if (dirStack.length > 0) {
    const activeDir = dirStack[dirStack.length - 1];
    let dx = 0;
    let dy = 0;
    if (activeDir === 'Up') dy = -1;
    else if (activeDir === 'Down') dy = 1;
    else if (activeDir === 'Left') dx = -1;
    else if (activeDir === 'Right') dx = 1;

    const stepRes = player.tryStep(dx, dy, world);
    if (stepRes.hitWall && stepRes.wallTile) {
      bumpingWallTile = stepRes.wallTile;
    }
  }

  // 3. Camera Follow & Screen Shake
  camera.follow(player.x, player.y);
  if (screenShake > 0) {
    screenShake -= dt * 2.5;
    camera.x += (Math.random() - 0.5) * screenShake * 16;
    camera.y += (Math.random() - 0.5) * screenShake * 16;
  }

  // 4. Mouse Hover & Target Tile Calculation
  const worldPos = camera.screenToWorld(mouseScreenX, mouseScreenY);
  const hoverTx = Math.floor(worldPos.wx / TILE_SIZE);
  const hoverTy = Math.floor(worldPos.wy / TILE_SIZE);
  hoveredTile = { tx: hoverTx, ty: hoverTy };

  // 5. Determine Mining Target:
  // Priority:
  //   A) Holding move into a wall (auto-digging forward!)
  //   B) Holding Spacebar (digs the facing tile)
  //   C) Holding Left Click on an adjacent tile
  let targetMiningX: number | null = null;
  let targetMiningY: number | null = null;

  const facingTile = player.getFacingTileCoord();

  if (bumpingWallTile) {
    targetMiningX = bumpingWallTile.tx;
    targetMiningY = bumpingWallTile.ty;
  } else if (isSpacePressed) {
    targetMiningX = facingTile.tx;
    targetMiningY = facingTile.ty;
  } else if (isMouseDown && hoveredTile) {
    const distToTile = Math.hypot(hoveredTile.tx - player.tileX, hoveredTile.ty - player.tileY);
    if (distToTile <= 2.2) {
      targetMiningX = hoveredTile.tx;
      targetMiningY = hoveredTile.ty;
      player.setFacing(hoveredTile.tx - player.tileX, hoveredTile.ty - player.tileY);
    }
  }

  // 6. Mine Block if Target Chosen
  if (targetMiningX !== null && targetMiningY !== null) {
    const tile = world.getTile(targetMiningX, targetMiningY);
    if (tile !== TileType.AIR && tile !== TileType.BEDROCK && tile !== TileType.LAVA && tile !== TileType.WATER) {
      const pick = player.getPickaxe();
      const res = world.damageTile(targetMiningX, targetMiningY, pick.power * dt, pick.tier);

      // Digging Audio & Particles
      digSoundTimer += dt;
      if (digSoundTimer >= 0.16) {
        audio.playDig();
        digSoundTimer = 0;
      }

      const def = TILE_DEFINITIONS[tile];
      const targetPx = (targetMiningX + 0.5) * TILE_SIZE;
      const targetPy = (targetMiningY + 0.5) * TILE_SIZE;
      renderer.addParticle(targetPx, targetPy, def.color, 2, 40);

      // Block Broken!
      if (res.broken) {
        audio.playBreak();
        renderer.addParticle(targetPx, targetPy, def.color, 14, 70);

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

  // 7. Update Bombs & Explosions
  for (let i = bombs.length - 1; i >= 0; i--) {
    const bomb = bombs[i];
    const exploded = bomb.update(dt);
    if (exploded) {
      // Detonate!
      audio.playExplosion();
      screenShake = 1.0;
      renderer.addExplosionParticles(bomb.x, bomb.y, bomb.radius * TILE_SIZE);

      const expRes = world.explode(bomb.tileX, bomb.tileY, bomb.radius);

      // Collect dropped resources
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
      const distToPlayer = Math.hypot(player.tileX - bomb.tileX, player.tileY - bomb.tileY);
      if (distToPlayer <= bomb.radius) {
        const damage = Math.round((1 - distToPlayer / bomb.radius) * 75);
        player.takeDamage(damage);
        renderer.addFloatingText(player.x, player.y, `-${damage} HP!`, '#bf616a');
      }

      bombs.splice(i, 1);
      hud.update();
    }
  }

  // 8. Update Liquids Simulation (Lava & Water Flows + Obsidian Reaction)
  world.updateLiquids(dt, player.tileX, player.tileY, {
    // Lava Callbacks
    onLavaFlow: (wx, wy) => {
      audio.playLavaSizzle();
      const lpx = (wx + 0.5) * TILE_SIZE;
      const lpy = (wy + 0.5) * TILE_SIZE;
      renderer.addParticle(lpx, lpy, '#ff6600', 8, 45);
      renderer.addParticle(lpx, lpy, '#555555', 4, 25);
    },
    onLavaTelegraph: (wx, wy) => {
      audio.playLavaSizzle();
      const lpx = (wx + 0.5) * TILE_SIZE;
      const lpy = (wy + 0.5) * TILE_SIZE;
      renderer.addParticle(lpx, lpy, '#ffcc00', 6, 35);
      renderer.addParticle(lpx, lpy, '#888888', 4, 20);
    },
    onLavaSimmer: (wx, wy) => {
      if (Math.random() < 0.2) {
        const lpx = (wx + 0.5) * TILE_SIZE;
        const lpy = (wy + 0.5) * TILE_SIZE;
        renderer.addParticle(lpx + (Math.random() - 0.5) * 8, lpy + (Math.random() - 0.5) * 8, '#ff9900', 1, 25);
      }
    },
    // Water Callbacks
    onWaterFlow: (wx, wy) => {
      audio.playWaterSplash();
      const lpx = (wx + 0.5) * TILE_SIZE;
      const lpy = (wy + 0.5) * TILE_SIZE;
      renderer.addParticle(lpx, lpy, '#4da6ff', 8, 35);
      renderer.addParticle(lpx, lpy, '#b3d9ff', 4, 20);
    },
    onWaterTelegraph: (wx, wy) => {
      audio.playWaterSplash();
      const lpx = (wx + 0.5) * TILE_SIZE;
      const lpy = (wy + 0.5) * TILE_SIZE;
      renderer.addParticle(lpx, lpy, '#80c0ff', 6, 25);
    },
    onWaterSimmer: (wx, wy) => {
      if (Math.random() < 0.15) {
        const lpx = (wx + 0.5) * TILE_SIZE;
        const lpy = (wy + 0.5) * TILE_SIZE;
        renderer.addParticle(lpx + (Math.random() - 0.5) * 8, lpy + (Math.random() - 0.5) * 8, '#b3d9ff', 1, 15);
      }
    },
    // Steam Reaction (Lava + Water -> Obsidian Formation!)
    onSteamReaction: (wx, wy) => {
      audio.playSteamHiss();
      const px = (wx + 0.5) * TILE_SIZE;
      const py = (wy + 0.5) * TILE_SIZE;
      // Dense rising cloud of hot steam
      for (let i = 0; i < 22; i++) {
        renderer.addParticle(px + (Math.random() - 0.5) * 12, py + (Math.random() - 0.5) * 12, '#f1f5f9', 2.5, 45);
        renderer.addParticle(px + (Math.random() - 0.5) * 12, py + (Math.random() - 0.5) * 12, '#94a3b8', 1.5, 25);
      }
      renderer.addFloatingText(px, py - 8, 'ОБСИДИАН!', '#a855f7');
    },
  });

  // 9. Player Liquid Hazard Check
  const currentTile = world.getTile(player.tileX, player.tileY);
  if (currentTile === TileType.LAVA) {
    lavaBurnTimer += dt;
    renderer.addParticle(player.x, player.y, '#ff4400', 2, 35);
    renderer.addParticle(player.x, player.y, '#444444', 1, 15);

    player.takeDamage(35 * dt);

    if (lavaBurnTimer >= 0.45) {
      audio.playLavaSizzle();
      renderer.addFloatingText(player.x, player.y - 10, 'ОГОНЬ! -15', '#ff4400');
      lavaBurnTimer = 0;
    }
    hud.update();
  } else if (currentTile === TileType.WATER) {
    // Water cools down the player and splashes
    if (Math.random() < 0.15) {
      renderer.addParticle(player.x, player.y + 4, '#80c0ff', 1, 15);
    }
  }

  // 10. Update Effects & Particles
  renderer.updateEffects(dt);

  // 11. Render Screen
  // Pass facing tile as target indicator if not mouse hovering
  const activeTarget = (targetMiningX !== null && targetMiningY !== null)
    ? { tx: targetMiningX, ty: targetMiningY }
    : (hoveredTile || facingTile);

  renderer.render(world, player, bombs, camera, activeTarget);

  // 12. Update HUD
  hud.update();

  requestAnimationFrame(gameLoop);
}

// Start Game Loop
requestAnimationFrame(gameLoop);
