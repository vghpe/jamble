/// <reference path="economy-manager.ts" />

namespace Jamble {
  export interface ShopItem {
    id: string;
    name: string;
    price: number;
  }

  export class ShopManager {
    private static instance: ShopManager;
    private economyManager: EconomyManager;
    private availableItems: ShopItem[] = [];
    private purchasedItems: Set<string> = new Set();

    private constructor() {
      this.economyManager = EconomyManager.getInstance();
      this.initializeShopItems();
    }

    static getInstance(): ShopManager {
      if (!ShopManager.instance) {
        ShopManager.instance = new ShopManager();
      }
      return ShopManager.instance;
    }

    private initializeShopItems(): void {
      this.availableItems = [
        { id: 'jump-boost', name: 'Jump Boost', price: 25 },
        { id: 'speed-boost', name: 'Speed Boost', price: 20 },
        { id: 'heavy-mass', name: 'Heavy Mass', price: 35 },
        { id: 'double-jump', name: 'Double Jump', price: 50 },
        { id: 'dash', name: 'Dash', price: 30 },
        { id: 'wall-jump', name: 'Wall Jump', price: 40 },
        { id: 'lucky-coin', name: 'Lucky Coin', price: 45 },
        { id: 'magnet', name: 'Magnet', price: 60 }
      ];
    }

    getAllItems(): ShopItem[] {
      return [...this.availableItems];
    }

    getItemById(id: string): ShopItem | undefined {
      return this.availableItems.find(item => item.id === id);
    }

    canPurchase(itemId: string): boolean {
      const item = this.getItemById(itemId);
      if (!item || this.isItemOwned(itemId)) return false;
      return this.economyManager.canAfford(item.price);
    }

    purchaseItem(itemId: string): { success: boolean; message: string } {
      const item = this.getItemById(itemId);
      if (!item) {
        return { success: false, message: 'Item not found' };
      }

      if (this.isItemOwned(itemId)) {
        return { success: false, message: 'Already owned' };
      }

      if (!this.economyManager.canAfford(item.price)) {
        return { success: false, message: 'Not enough currency' };
      }

      if (this.economyManager.spendCurrency(item.price)) {
        this.purchasedItems.add(itemId);
        return { success: true, message: 'Purchase successful' };
      }

      return { success: false, message: 'Purchase failed' };
    }

    isItemOwned(itemId: string): boolean {
      return this.purchasedItems.has(itemId);
    }
  }
}