/// <reference path="./types.ts" />

namespace Jamble {
  export interface ElementDeckEntry {
    id: string;
    definitionId: string;
    name: string;
    type: LevelElementType;
    emoji: string;
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
    definitionId: string;
    quantity?: number;
    name?: string;
    config?: any;
  }

  export interface DeckConfig {
    pool: DeckCardBlueprint[];
  }

  export const CoreDeckConfig: DeckConfig = {
    pool: [
      { definitionId: 'tree.basic', quantity: 3 },
      { definitionId: 'tree.ceiling', quantity: 3 },
      { definitionId: 'bird.basic', quantity: 3 }
    ]
  };

  const HAND_SLOTS = 5;

  function generateCardId(baseId: string, index: number): string {
    return baseId + '-' + (index + 1);
  }

  export function expandDeck(config: DeckConfig): ElementDeckEntry[] {
    const deck: ElementDeckEntry[] = [];
    config.pool.forEach(blueprint => {
      const descriptor = Jamble.getCoreElementDefinition(blueprint.definitionId);
      if (!descriptor) return;
      const qty = Math.max(1, blueprint.quantity ?? 1);
      const baseName = blueprint.name || descriptor.name;
      for (let i = 0; i < qty; i++){
        const id = generateCardId(blueprint.definitionId, i);
        deck.push({
          id,
          definitionId: blueprint.definitionId,
          name: qty > 1 ? baseName + ' ' + (i + 1) : baseName,
          type: descriptor.type,
          emoji: descriptor.emoji,
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
      hand.push({ slotId, cardId: card.id, active: false });
    }

    return { deck, hand };
  }
}
