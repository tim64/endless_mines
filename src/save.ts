import { Player } from './entities/player';
import { World } from './world/world';
import type { Inventory, SavedChunkDelta, GameSaveData } from './types';

export type { SavedChunkDelta, GameSaveData };

const LOCAL_STORAGE_KEY = 'mine_bombers_retro_save';

export class SaveManager {
  /**
   * Serializes current game state into a compact JSON object.
   */
  public static createSaveData(player: Player, world: World): GameSaveData {
    return {
      version: 1,
      timestamp: Date.now(),
      player: {
        layer: world.currentLayer,
        tileX: player.tileX,
        tileY: player.tileY,
        hp: player.hp,
        pickaxeTier: player.pickaxeTier,
        bombs: player.bombs,
        lightRadius: player.lightRadius,
        inventory: { ...player.inventory },
      },
      world: {
        seed: world.seed,
        modifiedChunks: world.getSavedDeltas(),
      },
    };
  }

  /**
   * Saves state into browser LocalStorage.
   */
  public static saveToLocalStorage(player: Player, world: World): boolean {
    try {
      const data = this.createSaveData(player, world);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  }

  /**
   * Loads state from browser LocalStorage if present.
   */
  public static loadFromLocalStorage(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as GameSaveData;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return null;
    }
  }

  /**
   * Clears LocalStorage save (Reset progress).
   */
  public static clearLocalStorage() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear save:', e);
    }
  }

  /**
   * Downloads a single compact .json save file to user's computer.
   */
  public static exportToFile(player: Player, world: World) {
    const data = this.createSaveData(player, world);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `mine_bombers_world_${world.seed}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Parses an imported .json file.
   */
  public static importFromFile(file: File): Promise<GameSaveData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = e.target?.result as string;
          const data = JSON.parse(raw) as GameSaveData;
          if (!data || data.version !== 1 || !data.player || !data.world) {
            throw new Error('Некорректный формат файла сохранения');
          }
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }
}
