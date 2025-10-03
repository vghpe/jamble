/// <reference path="../level/elements/types.ts" />
/// <reference path="../level/elements/level-element-manager.ts" />
/// <reference path="../level/registry/deck-config.ts" />

namespace Jamble {
  interface HandSlotState {
    readonly slotId: string;
    readonly cardId: string | null;
    isActive(): boolean;
    setActive(active: boolean): void;
  }

  interface HandViewEntry {
    id: string;
    definitionId: string;
    name: string;
    type: LevelElementType;
    emoji: string;
    active: boolean;
    available: boolean;
  }

  export class HandManager {
    private deck: ElementDeckEntry[];
    private handSlots: Array<{ slotId: string; cardId: string | null; active: boolean }>;
    private instances = new Map<string, ElementDeckEntry>();

    constructor(private levelElements: LevelElementManager, settings: ElementsSettings){
      this.deck = settings.deck.map(card => ({ ...card }));
      this.handSlots = settings.hand.map(slot => ({ ...slot }));
      this.initializeDeckElements();
    }

    getDeckEntries(): ReadonlyArray<ElementDeckEntry> {
      return this.deck.map(card => ({ ...card }));
    }

    getHandView(): ReadonlyArray<HandViewEntry> {
      return this.handSlots.map((slot, index) => {
        if (!slot.cardId){
          return {
            id: 'placeholder-' + index,
            definitionId: 'placeholder',
            name: 'Empty',
            type: 'empty',
            emoji: '…',
            active: false,
            available: false
          };
        }
        const meta = this.instances.get(slot.cardId) || this.deck.find(card => card.id === slot.cardId);
        if (!meta){
          return {
            id: slot.cardId,
            definitionId: 'unknown',
            name: 'Unknown',
            type: 'empty',
            emoji: '❔',
            active: slot.active,
            available: false
          };
        }
        return {
          id: slot.cardId,
          definitionId: meta.definitionId,
          name: meta.name,
          type: meta.type,
          emoji: meta.emoji || '❔',
          active: slot.active,
          available: true
        };
      });
    }

    getSlotCount(): number {
      return this.handSlots.length;
    }

    getCardMeta(cardId: string): ElementDeckEntry | undefined {
      return this.instances.get(cardId) || this.deck.find(card => card.id === cardId);
    }

    setCardActive(cardId: string, active: boolean): boolean {
      const slot = this.handSlots.find(s => s.cardId === cardId);
      if (!slot) return false;
      if (slot.active === active) return false;
      
      // Home elements must always be active
      const cardMeta = this.getCardMeta(cardId);
      if (cardMeta && cardMeta.type === 'home') {
        slot.active = true;
        return true;
      }
      
      slot.active = active;
      return true;
    }

    isCardActive(cardId: string): boolean {
      const slot = this.handSlots.find(s => s.cardId === cardId);
      return !!slot && !!slot.active;
    }

    forEachSlot(callback: (slot: HandSlotState) => void): void {
      this.handSlots.forEach(slot => {
        callback({
          slotId: slot.slotId,
          cardId: slot.cardId,
          isActive: () => slot.active,
          setActive: (active: boolean) => { slot.active = active; }
        });
      });
    }



    resetForIdle(): void {
      const available = this.deck.slice();

      this.handSlots.forEach(slot => {
        slot.active = false;
        if (available.length === 0){
          slot.cardId = null;
          return;
        }
        const index = Math.floor(Math.random() * available.length);
        const [card] = available.splice(index, 1);
        slot.cardId = card.id;
        
        // Home elements must always be active
        if (card.type === 'home') {
          slot.active = true;
        }
      });
    }

    private initializeDeckElements(): void {
      this.deck.forEach(card => {
        const instance = this.levelElements.spawnFromRegistry(card.definitionId, {
          instanceId: card.id,
          config: card.config,
          active: false
        });
        if (instance){
          this.instances.set(card.id, { ...card });
        }
      });
    }
  }
}
