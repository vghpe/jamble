/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export type SlotType = 'ground' | 'air_low' | 'air_mid' | 'air_high' | 'ceiling';

  export interface Slot {
    id: string;
    type: SlotType;
    x: number;
    y: number;
    occupied: boolean;
    gameObjectId?: string;
  }

  export class SlotManager {
    private slots: Slot[] = [];
    private gameWidth: number;
    private gameHeight: number;

    constructor(gameWidth: number, gameHeight: number) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.generateSlots();
    }

    private generateSlots() {
      const layers = [
        { type: 'ground' as SlotType, yPercent: 0, columns: 6 },
        { type: 'air_low' as SlotType, yPercent: 25, columns: 6 },
        { type: 'air_mid' as SlotType, yPercent: 50, columns: 6 },
        { type: 'air_high' as SlotType, yPercent: 75, columns: 6 },
        { type: 'ceiling' as SlotType, yPercent: 100, columns: 6 }
      ];

      layers.forEach(layer => {
        for (let col = 0; col < layer.columns; col++) {
          const x = (col + 0.5) * (this.gameWidth / layer.columns);
          const y = (layer.yPercent / 100) * this.gameHeight;
          
          this.slots.push({
            id: `${layer.type}-${col}`,
            type: layer.type,
            x: x,
            y: y,
            occupied: false
          });
        }
      });
    }

    getAllSlots(): Slot[] {
      return [...this.slots];
    }

    getSlotsByType(type: SlotType): Slot[] {
      return this.slots.filter(slot => slot.type === type);
    }

    getAvailableSlots(type?: SlotType): Slot[] {
      const filteredSlots = type ? this.getSlotsByType(type) : this.slots;
      return filteredSlots.filter(slot => !slot.occupied);
    }

    occupySlot(slotId: string, gameObjectId: string): boolean {
      const slot = this.slots.find(s => s.id === slotId);
      if (!slot || slot.occupied) return false;
      
      slot.occupied = true;
      slot.gameObjectId = gameObjectId;
      return true;
    }

    freeSlot(slotId: string): boolean {
      const slot = this.slots.find(s => s.id === slotId);
      if (!slot) return false;
      
      slot.occupied = false;
      slot.gameObjectId = undefined;
      return true;
    }
  }
}