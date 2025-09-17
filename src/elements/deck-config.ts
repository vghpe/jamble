/// <reference path="./types.ts" />

namespace Jamble {
  export interface ElementDeckEntry {
    id: string;
    definitionId: string;
    name: string;
    type: LevelElementType;
    config?: any;
  }

  export interface ElementHandSlotConfig {
    slotId: string;
    cardId: string | null;
    active: boolean;
  }

  export interface ElementsSettings {
    deck: ElementDeckEntry[];
    hand: ElementHandSlotConfig[];
  }

  export interface DeckCardBlueprint {
    id: string;
    definitionId: string;
    name: string;
    type: LevelElementType;
    quantity?: number;
    config?: any;
  }

  export interface DeckConfig {
    pool: DeckCardBlueprint[];
  }

  export const CoreDeckConfig: DeckConfig = {
    pool: [
      { id: 'treeA', definitionId: 'tree.basic', name: 'Tree A', type: 'tree', quantity: 3 },
      { id: 'birdA', definitionId: 'bird.basic', name: 'Bird A', type: 'bird', quantity: 3 }
    ]
  };

  const HAND_SLOTS = 5;

  function generateCardId(baseId: string, index: number): string {
    return baseId + '-' + (index + 1);
  }

  export function expandDeck(config: DeckConfig): ElementDeckEntry[] {
    const deck: ElementDeckEntry[] = [];
    config.pool.forEach(blueprint => {
      const qty = Math.max(1, blueprint.quantity ?? 1);
      for (let i = 0; i < qty; i++){
        const id = generateCardId(blueprint.id, i);
        deck.push({
          id,
          definitionId: blueprint.definitionId,
          name: qty > 1 ? blueprint.name + ' ' + (i + 1) : blueprint.name,
          type: blueprint.type,
          config: blueprint.config
        });
      }
    });
    return deck;
  }

  export function deriveElementsSettings(config: DeckConfig): ElementsSettings {
    const deck = expandDeck(config);
    const hand: ElementHandSlotConfig[] = [];
    const mutableDeck = deck.slice();

    for (let i = 0; i < HAND_SLOTS; i++){
      const slotId = 'slot-' + i;
      if (mutableDeck.length === 0){
        hand.push({ slotId, cardId: null, active: false });
        continue;
      }
      const index = Math.floor(Math.random() * mutableDeck.length);
      const [card] = mutableDeck.splice(index, 1);
      hand.push({ slotId, cardId: card.id, active: true });
    }

    return { deck, hand };
  }
}
