/// <reference path="../entities/player/player.ts" />

namespace Jamble {
  export interface CurrencyCollectible {
    currencyValue: number;
    onCollected(player: Player): number; // Returns actual amount given
    isCollected?: boolean; // For one-time collectibles
  }

  export class EconomyManager {
    private static instance: EconomyManager;
    private currency: number = 0;
    private onCurrencyChangeCallbacks: ((amount: number) => void)[] = [];

    private constructor() {}

    static getInstance(): EconomyManager {
      if (!EconomyManager.instance) {
        EconomyManager.instance = new EconomyManager();
      }
      return EconomyManager.instance;
    }

    getCurrency(): number {
      return this.currency;
    }

    addCurrency(amount: number): void {
      this.currency += amount;
      this.notifyCurrencyChange();
    }

    spendCurrency(amount: number): boolean {
      if (this.currency >= amount) {
        this.currency -= amount;
        this.notifyCurrencyChange();
        return true;
      }
      return false;
    }

    canAfford(amount: number): boolean {
      return this.currency >= amount;
    }

    onCurrencyChange(callback: (amount: number) => void): void {
      this.onCurrencyChangeCallbacks.push(callback);
    }

    private notifyCurrencyChange(): void {
      this.onCurrencyChangeCallbacks.forEach(callback => callback(this.currency));
    }
  }
}