/// <reference path="../level/elements/types.ts" />
/// <reference path="../level/elements/level-element-manager.ts" />
/// <reference path="../level/elements/laps.ts" />
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
    private lapsCardId: string | null = null;
    private lapsValue = 1;

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

    getCardMeta(cardId: string): ElementDeckEntry | undefined {
      return this.instances.get(cardId) || this.deck.find(card => card.id === cardId);
    }

    setCardActive(cardId: string, active: boolean): boolean {
      const slot = this.handSlots.find(s => s.cardId === cardId);
      if (!slot) return false;
      if (slot.active === active) return false;
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

    incrementLaps(): number {
      const lapsElement = this.getLapsElement();
      if (!lapsElement) return this.lapsValue;
      const next = lapsElement.increment();
      this.lapsValue = next;
      this.updateLapsConfig(next);
      return this.lapsValue;
    }

    getLapsValue(): number {
      return this.lapsValue;
    }

    setLapsValue(value: number): number {
      const clamped = this.clampLaps(value);
      const lapsElement = this.getLapsElement();
      if (lapsElement) lapsElement.setValue(clamped);
      this.lapsValue = clamped;
      this.updateLapsConfig(clamped);
      return this.lapsValue;
    }

    resetLapsValue(): number {
      return this.setLapsValue(1);
    }

    getLapsCardId(): string | null {
      return this.lapsCardId;
    }

    isLapsCard(cardId: string): boolean {
      return !!this.lapsCardId && this.lapsCardId === cardId;
    }

    resetForIdle(): void {
      const lapsId = this.lapsCardId;
      const pool = this.deck.filter(card => card.id !== lapsId);
      const available = pool.slice();

      this.handSlots.forEach(slot => {
        slot.active = false;
        if (lapsId && slot.cardId === lapsId){
          // keep laps card in place for now
          return;
        }
        if (available.length === 0){
          slot.cardId = null;
          return;
        }
        const index = Math.floor(Math.random() * available.length);
        const [card] = available.splice(index, 1);
        slot.cardId = card.id;
      });

      if (lapsId && !this.handSlots.some(slot => slot.cardId === lapsId)){
        const target = this.handSlots[0];
        if (target.cardId){
          // return displaced card to available pool if desired
        }
        target.cardId = lapsId;
      }
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
          if (instance instanceof LapsElement){
            this.lapsCardId = card.id;
            this.lapsValue = instance.getValue();
          }
        }
      });
      if (!this.lapsCardId){
        const lapsEntry = this.deck.find(card => card.definitionId === 'laps.basic');
        if (lapsEntry) this.lapsCardId = lapsEntry.id;
      }
    }

    private getLapsElement(): LapsElement | null {
      if (!this.lapsCardId) return null;
      const instance = this.levelElements.get(this.lapsCardId);
      if (instance && instance instanceof LapsElement) return instance;
      return null;
    }

    private updateLapsConfig(value: number): void {
      if (this.lapsCardId){
        const meta = this.instances.get(this.lapsCardId);
        if (meta){
          meta.config = { ...(meta.config || {}), value };
        }
        const deckEntry = this.deck.find(card => card.id === this.lapsCardId);
        if (deckEntry){
          deckEntry.config = { ...(deckEntry.config || {}), value };
        }
      }
    }

    private clampLaps(value: number): number {
      if (!Number.isFinite(value)) return 1;
      return Math.max(1, Math.min(9, Math.floor(value)));
    }
  }
}
