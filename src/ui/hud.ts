import { Player } from '../entities/player';
import { PICKAXE_TIERS, TILE_SIZE } from '../constants';

export class HUD {
  private player: Player;

  // DOM Elements
  private hpEl!: HTMLElement;
  private hudGoldEl!: HTMLElement;
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
  private resObsidianEl!: HTMLElement;
  private resGoldEl!: HTMLElement;

  private btnCraftBomb!: HTMLButtonElement;
  private btnCraftDynamite!: HTMLButtonElement;
  private btnCraftTorch!: HTMLButtonElement;
  private btnUpgradePickaxe!: HTMLButtonElement;
  private btnCraftMedkit!: HTMLButtonElement;
  private btnUpgradeLight!: HTMLButtonElement;
  private pickaxeCostEl!: HTMLElement;
  private lightCostEl!: HTMLElement;

  // Save / World Elements
  private btnSaveGame!: HTMLButtonElement;
  private btnExportSave!: HTMLButtonElement;
  private btnImportSave!: HTMLButtonElement;
  private inputImportSave!: HTMLInputElement;
  private btnResetGame!: HTMLButtonElement;
  private saveStatusEl!: HTMLElement;
  private statusTimer: number | null = null;

  // Hotbar
  private slotBombEl!: HTMLElement;
  private slotTorchEl!: HTMLElement;
  private hotbarBombsCountEl!: HTMLElement;
  private hotbarTorchesCountEl!: HTMLElement;

  public activeItem: 'bomb' | 'torch' = 'bomb';
  public onItemSelect?: (item: 'bomb' | 'torch') => void;
  public onSave?: () => void;
  public onExport?: () => void;
  public onImport?: (file: File) => void;
  public onReset?: () => void;

  constructor(player: Player) {
    this.player = player;
    this.initElements();
    this.bindEvents();
  }

  private initElements() {
    this.hpEl = document.getElementById('hud-hp')!;
    this.hudGoldEl = document.getElementById('hud-gold')!;
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
    this.resObsidianEl = document.getElementById('res-obsidian')!;
    this.resGoldEl = document.getElementById('res-gold')!;

    this.btnCraftBomb = document.getElementById('btn-craft-bomb') as HTMLButtonElement;
    this.btnCraftDynamite = document.getElementById('btn-craft-dynamite') as HTMLButtonElement;
    this.btnCraftTorch = document.getElementById('btn-craft-torch') as HTMLButtonElement;
    this.btnUpgradePickaxe = document.getElementById('btn-upgrade-pickaxe') as HTMLButtonElement;
    this.btnCraftMedkit = document.getElementById('btn-craft-medkit') as HTMLButtonElement;
    this.btnUpgradeLight = document.getElementById('btn-upgrade-light') as HTMLButtonElement;
    this.pickaxeCostEl = document.getElementById('pickaxe-cost')!;
    this.lightCostEl = document.getElementById('light-cost')!;

    this.btnSaveGame = document.getElementById('btn-save-game') as HTMLButtonElement;
    this.btnExportSave = document.getElementById('btn-export-save') as HTMLButtonElement;
    this.btnImportSave = document.getElementById('btn-import-save') as HTMLButtonElement;
    this.inputImportSave = document.getElementById('input-import-save') as HTMLInputElement;
    this.btnResetGame = document.getElementById('btn-reset-game') as HTMLButtonElement;
    this.saveStatusEl = document.getElementById('save-status')!;

    this.slotBombEl = document.getElementById('slot-bomb')!;
    this.slotTorchEl = document.getElementById('slot-torch')!;
    this.hotbarBombsCountEl = document.getElementById('hotbar-bombs-count')!;
    this.hotbarTorchesCountEl = document.getElementById('hotbar-torches-count')!;
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

    // 1.2 Craft Dynamite Bundle: 3 Gold + 1 Sulfur -> +3 Bombs
    this.btnCraftDynamite.addEventListener('click', () => {
      if (this.player.inventory.gold >= 3 && this.player.inventory.sulfur >= 1) {
        this.player.inventory.gold -= 3;
        this.player.inventory.sulfur -= 1;
        this.player.bombs += 3;
        this.update();
      }
    });

    // 1.5 Craft Torches: 1 Coal + 2 Dirt -> +3 Torches
    this.btnCraftTorch.addEventListener('click', () => {
      if (this.player.inventory.coal >= 1 && this.player.inventory.dirt >= 2) {
        this.player.inventory.coal -= 1;
        this.player.inventory.dirt -= 2;
        this.player.inventory.torches += 3;
        this.update();
      }
    });

    // Hotbar click events
    this.slotBombEl.addEventListener('click', () => {
      this.setActiveItem('bomb');
      if (this.onItemSelect) this.onItemSelect('bomb');
    });

    this.slotTorchEl.addEventListener('click', () => {
      this.setActiveItem('torch');
      if (this.onItemSelect) this.onItemSelect('torch');
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
      } else if (nextTier === 4 && this.player.inventory.gems >= 4 && this.player.inventory.obsidian >= 2) {
        this.player.inventory.gems -= 4;
        this.player.inventory.obsidian -= 2;
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

    // 5. Save & World Management
    this.btnSaveGame.addEventListener('click', () => {
      if (this.onSave) this.onSave();
    });

    this.btnExportSave.addEventListener('click', () => {
      if (this.onExport) this.onExport();
    });

    this.btnImportSave.addEventListener('click', () => {
      this.inputImportSave.value = '';
      this.inputImportSave.click();
    });

    this.inputImportSave.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        if (this.onImport) this.onImport(file);
      }
    });

    this.btnResetGame.addEventListener('click', () => {
      const ok = confirm('Сбросить весь прогресс, удалить сохранение и начать заново в новом мире?');
      if (ok && this.onReset) {
        this.onReset();
      }
    });
  }

  public showSaveStatus(msg: string, isError: boolean = false) {
    if (!this.saveStatusEl) return;
    this.saveStatusEl.innerText = msg;
    this.saveStatusEl.style.color = isError ? '#bf616a' : '#a3be8c';
    this.saveStatusEl.style.opacity = '1';

    if (this.statusTimer !== null) {
      window.clearTimeout(this.statusTimer);
    }
    this.statusTimer = window.setTimeout(() => {
      this.saveStatusEl.style.opacity = '0';
      this.statusTimer = null;
    }, 3500);
  }

  public setActiveItem(item: 'bomb' | 'torch') {
    this.activeItem = item;
    if (item === 'bomb') {
      this.slotBombEl.classList.add('active');
      this.slotTorchEl.classList.remove('active');
    } else {
      this.slotTorchEl.classList.add('active');
      this.slotBombEl.classList.remove('active');
    }
  }

  public update() {
    const p = this.player;

    // Stats
    this.hpEl.innerText = `${Math.ceil(p.hp)}`;
    this.hpEl.style.color = p.hp > 40 ? '#a3be8c' : '#bf616a';
    this.hudGoldEl.innerText = `${p.inventory.gold}`;

    const pick = p.getPickaxe();
    this.pickaxeEl.innerText = `${pick.name} (ур. ${pick.tier})`;
    this.bombsEl.innerText = `${p.bombs}`;

    // Hotbar counts
    this.hotbarBombsCountEl.innerText = `${p.bombs}`;
    this.hotbarTorchesCountEl.innerText = `${p.inventory.torches}`;

    const tx = Math.floor(p.x / TILE_SIZE);
    const ty = Math.floor(p.y / TILE_SIZE);
    const dist = Math.floor(Math.sqrt(tx * tx + ty * ty));
    this.depthEl.innerText = `${dist} м`;
    this.coordsEl.innerText = `${tx}, ${ty}`;

    // Resources
    this.resGoldEl.innerText = `${p.inventory.gold}`;
    this.resDirtEl.innerText = `${p.inventory.dirt}`;
    this.resStoneEl.innerText = `${p.inventory.stone}`;
    this.resCoalEl.innerText = `${p.inventory.coal}`;
    this.resIronEl.innerText = `${p.inventory.iron}`;
    this.resSulfurEl.innerText = `${p.inventory.sulfur}`;
    this.resGemsEl.innerText = `${p.inventory.gems}`;
    this.resObsidianEl.innerText = `${p.inventory.obsidian}`;

    // Crafting availability
    this.btnCraftBomb.disabled = !(p.inventory.coal >= 1 && p.inventory.sulfur >= 1);
    this.btnCraftDynamite.disabled = !(p.inventory.gold >= 3 && p.inventory.sulfur >= 1);
    this.btnCraftTorch.disabled = !(p.inventory.coal >= 1 && p.inventory.dirt >= 2);

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
      this.pickaxeCostEl.innerText = '4 Самоцвета + 2 Обсидиана';
      this.btnUpgradePickaxe.disabled = !(p.inventory.gems >= 4 && p.inventory.obsidian >= 2);
    }

    this.btnCraftMedkit.disabled = !(p.hp < p.maxHp && p.inventory.dirt >= 5 && p.inventory.coal >= 5);
    this.btnUpgradeLight.disabled = !(p.inventory.coal >= 5 && p.inventory.iron >= 2);
  }
}
