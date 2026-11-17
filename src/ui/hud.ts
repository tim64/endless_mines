import { Player } from '../entities/player';
import { PICKAXE_TIERS, TILE_SIZE } from '../constants';

export class HUD {
  private player: Player;

  // DOM Elements
  private hpEl!: HTMLElement;
  private pickaxeEl!: HTMLElement;
  private bombsEl!: HTMLElement;
  private depthEl!: HTMLElement;
  private coordsEl!: HTMLElement;

  private resDirtEl!: HTMLElement;
  private resStoneEl!: HTMLElement;
  private resCoalEl!: HTMLElement;
  private resIronEl!: HTMLElement;
  private resSulfurEl!: HTMLElement;
  private resGemsEl!: HTMLElement;

  private btnCraftBomb!: HTMLButtonElement;
  private btnUpgradePickaxe!: HTMLButtonElement;
  private btnCraftMedkit!: HTMLButtonElement;
  private btnUpgradeLight!: HTMLButtonElement;
  private pickaxeCostEl!: HTMLElement;
  private lightCostEl!: HTMLElement;

  constructor(player: Player) {
    this.player = player;
    this.initElements();
    this.bindEvents();
  }

  private initElements() {
    this.hpEl = document.getElementById('hud-hp')!;
    this.pickaxeEl = document.getElementById('hud-pickaxe')!;
    this.bombsEl = document.getElementById('hud-bombs')!;
    this.depthEl = document.getElementById('hud-depth')!;
    this.coordsEl = document.getElementById('hud-coords')!;

    this.resDirtEl = document.getElementById('res-dirt')!;
    this.resStoneEl = document.getElementById('res-stone')!;
    this.resCoalEl = document.getElementById('res-coal')!;
    this.resIronEl = document.getElementById('res-iron')!;
    this.resSulfurEl = document.getElementById('res-sulfur')!;
    this.resGemsEl = document.getElementById('res-gems')!;

    this.btnCraftBomb = document.getElementById('btn-craft-bomb') as HTMLButtonElement;
    this.btnUpgradePickaxe = document.getElementById('btn-upgrade-pickaxe') as HTMLButtonElement;
    this.btnCraftMedkit = document.getElementById('btn-craft-medkit') as HTMLButtonElement;
    this.btnUpgradeLight = document.getElementById('btn-upgrade-light') as HTMLButtonElement;
    this.pickaxeCostEl = document.getElementById('pickaxe-cost')!;
    this.lightCostEl = document.getElementById('light-cost')!;
  }

  private bindEvents() {
    // 1. Craft Bomb: 1 Coal + 1 Sulfur
    this.btnCraftBomb.addEventListener('click', () => {
      if (this.player.inventory.coal >= 1 && this.player.inventory.sulfur >= 1) {
        this.player.inventory.coal -= 1;
        this.player.inventory.sulfur -= 1;
        this.player.bombs += 1;
        this.update();
      }
    });

    // 2. Upgrade Pickaxe
    this.btnUpgradePickaxe.addEventListener('click', () => {
      const nextTier = this.player.pickaxeTier + 1;
      if (nextTier >= PICKAXE_TIERS.length) return;

      if (nextTier === 2 && this.player.inventory.stone >= 10) {
        this.player.inventory.stone -= 10;
        this.player.pickaxeTier = 2;
      } else if (nextTier === 3 && this.player.inventory.iron >= 12) {
        this.player.inventory.iron -= 12;
        this.player.pickaxeTier = 3;
      } else if (nextTier === 4 && this.player.inventory.gems >= 4) {
        this.player.inventory.gems -= 4;
        this.player.pickaxeTier = 4;
      }
      this.update();
    });

    // 3. Medkit (+50 HP): 5 Dirt + 5 Coal
    this.btnCraftMedkit.addEventListener('click', () => {
      if (this.player.hp < this.player.maxHp && this.player.inventory.dirt >= 5 && this.player.inventory.coal >= 5) {
        this.player.inventory.dirt -= 5;
        this.player.inventory.coal -= 5;
        this.player.heal(50);
        this.update();
      }
    });

    // 4. Upgrade Light: 5 Coal + 2 Iron
    this.btnUpgradeLight.addEventListener('click', () => {
      if (this.player.inventory.coal >= 5 && this.player.inventory.iron >= 2) {
        this.player.inventory.coal -= 5;
        this.player.inventory.iron -= 2;
        this.player.lightRadius += 25;
        this.update();
      }
    });
  }

  public update() {
    const p = this.player;

    // Stats
    this.hpEl.innerText = `${Math.ceil(p.hp)}`;
    this.hpEl.style.color = p.hp > 40 ? '#a3be8c' : '#bf616a';

    const pick = p.getPickaxe();
    this.pickaxeEl.innerText = `${pick.name} (ур. ${pick.tier})`;
    this.bombsEl.innerText = `${p.bombs}`;

    const tx = Math.floor(p.x / TILE_SIZE);
    const ty = Math.floor(p.y / TILE_SIZE);
    const dist = Math.floor(Math.sqrt(tx * tx + ty * ty));
    this.depthEl.innerText = `${dist} м`;
    this.coordsEl.innerText = `${tx}, ${ty}`;

    // Resources
    this.resDirtEl.innerText = `${p.inventory.dirt}`;
    this.resStoneEl.innerText = `${p.inventory.stone}`;
    this.resCoalEl.innerText = `${p.inventory.coal}`;
    this.resIronEl.innerText = `${p.inventory.iron}`;
    this.resSulfurEl.innerText = `${p.inventory.sulfur}`;
    this.resGemsEl.innerText = `${p.inventory.gems}`;

    // Crafting availability
    this.btnCraftBomb.disabled = !(p.inventory.coal >= 1 && p.inventory.sulfur >= 1);

    // Pickaxe upgrade costs
    const nextTier = p.pickaxeTier + 1;
    if (nextTier >= PICKAXE_TIERS.length) {
      this.btnUpgradePickaxe.disabled = true;
      this.pickaxeCostEl.innerText = 'МАКС.';
    } else if (nextTier === 2) {
      this.pickaxeCostEl.innerText = '10 Камня';
      this.btnUpgradePickaxe.disabled = p.inventory.stone < 10;
    } else if (nextTier === 3) {
      this.pickaxeCostEl.innerText = '12 Железа';
      this.btnUpgradePickaxe.disabled = p.inventory.iron < 12;
    } else if (nextTier === 4) {
      this.pickaxeCostEl.innerText = '4 Самоцвета';
      this.btnUpgradePickaxe.disabled = p.inventory.gems < 4;
    }

    this.btnCraftMedkit.disabled = !(p.hp < p.maxHp && p.inventory.dirt >= 5 && p.inventory.coal >= 5);
    this.btnUpgradeLight.disabled = !(p.inventory.coal >= 5 && p.inventory.iron >= 2);
  }
}
