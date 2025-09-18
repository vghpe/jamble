/// <reference path="./types.ts" />

namespace Jamble {
  interface SlotLayerTemplate {
    type: SlotType;
    columns: number;
    yPercent: number;
    jitterXPct: number;
    jitterYPct: number;
    invalidColumns?: number[];
  }

  const SLOT_LAYER_TEMPLATES: ReadonlyArray<SlotLayerTemplate> = [
    { type: 'ground', columns: 8, yPercent: 0, jitterXPct: 1.5, jitterYPct: 0, invalidColumns: [0, 7] },
    { type: 'air_low', columns: 8, yPercent: 28, jitterXPct: 2.5, jitterYPct: 4 },
    { type: 'air_mid', columns: 8, yPercent: 55, jitterXPct: 2.5, jitterYPct: 4 },
    { type: 'air_high', columns: 8, yPercent: 78, jitterXPct: 2.5, jitterYPct: 4 },
    { type: 'ceiling', columns: 8, yPercent: 100, jitterXPct: 1.5, jitterYPct: 0 }
  ];

  interface SlotMetrics {
    width: number;
    height: number;
  }

  export interface SlotDefinition {
    readonly id: string;
    readonly type: SlotType;
    readonly column: number;
    readonly layerIndex: number;
    readonly xPercent: number;
    readonly yPercent: number;
    readonly xPx: number;
    readonly yPx: number;
    readonly invalid: boolean;
    occupied: boolean;
    elementId: string | null;
    elementType: LevelElementType | null;
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  function jitter(id: string, salt: number, range: number): number {
    if (range <= 0) return 0;
    let hash = 2166136261 ^ salt;
    for (let i = 0; i < id.length; i++){
      hash ^= id.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const normalized = (hash >>> 0) / 0xffffffff;
    return (normalized * 2 - 1) * range;
  }

  export class SlotManager {
    private host: HTMLElement;
    private metrics: SlotMetrics = { width: 0, height: 0 };
    private slots: SlotDefinition[] = [];
    private slotsByType = new Map<SlotType, SlotDefinition[]>();
    private slotByElementId = new Map<string, SlotDefinition>();

    constructor(host: HTMLElement){
      this.host = host;
      this.rebuild();
    }

    rebuild(): void {
      const rect = this.host.getBoundingClientRect();
      const width = rect.width || this.host.offsetWidth || 1;
      const height = rect.height || this.host.offsetHeight || 1;
      this.metrics = { width, height };
      this.slots = [];
      this.slotsByType.clear();
      this.slotByElementId.clear();

      SLOT_LAYER_TEMPLATES.forEach((template, layerIndex) => {
        const layerSlots: SlotDefinition[] = [];
        const stride = 100 / template.columns;
        for (let column = 0; column < template.columns; column++){
          const baseXPct = (column + 0.5) * stride;
          const id = template.type + '-' + column;
          const offsetX = jitter(id, 0x1f123bb5, template.jitterXPct);
          const offsetY = jitter(id, 0x9e3779b9, template.jitterYPct);
          const xPercent = clamp(baseXPct + offsetX, 0, 100);
          const yPercent = clamp(template.yPercent + offsetY, 0, 100);
          const slot: SlotDefinition = {
            id,
            type: template.type,
            column,
            layerIndex,
            xPercent,
            yPercent,
            xPx: (xPercent / 100) * this.metrics.width,
            yPx: (yPercent / 100) * this.metrics.height,
            invalid: template.invalidColumns ? template.invalidColumns.indexOf(column) !== -1 : false,
            occupied: false,
            elementId: null,
            elementType: null
          };
          layerSlots.push(slot);
          this.slots.push(slot);
        }
        this.slotsByType.set(template.type, layerSlots);
      });
    }

    getAllSlots(): ReadonlyArray<SlotDefinition> {
      return this.slots;
    }

    getSlotsByType(type: SlotType): ReadonlyArray<SlotDefinition> {
      return this.slotsByType.get(type) || [];
    }

    getMetrics(): SlotMetrics {
      return this.metrics;
    }

    getSlotForElement(elementId: string): SlotDefinition | undefined {
      return this.slotByElementId.get(elementId);
    }

    releaseSlot(elementId: string): void {
      const slot = this.slotByElementId.get(elementId);
      if (!slot) return;
      slot.occupied = false;
      slot.elementId = null;
      slot.elementType = null;
      this.slotByElementId.delete(elementId);
    }

    acquireSlot(elementId: string, elementType: LevelElementType, placement?: ElementPlacementOptions): SlotDefinition | null {
      const candidates = this.filterCandidates(elementType, placement);
      if (candidates.length === 0) return null;
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      selected.occupied = true;
      selected.elementId = elementId;
      selected.elementType = elementType;
      this.slotByElementId.set(elementId, selected);
      return selected;
    }

    private filterCandidates(elementType: LevelElementType, placement?: ElementPlacementOptions): SlotDefinition[] {
      const allowStartZone = placement?.allowStartZone === true;
      const validTypes = placement?.validSlotTypes;
      const blocked = placement?.blockedNeighbors;

      const candidates: SlotDefinition[] = [];
      for (const slot of this.slots){
        if (slot.occupied) continue;
        if (!allowStartZone && slot.invalid) continue;
        if (validTypes && validTypes.length > 0 && validTypes.indexOf(slot.type) === -1) continue;
        if (blocked && this.violatesNeighborRule(slot, blocked)) continue;
        candidates.push(slot);
      }
      return candidates;
    }

    private violatesNeighborRule(candidate: SlotDefinition, rule: NeighborBlockRule): boolean {
      const distance = Math.max(0, Math.floor(rule.distance));
      if (distance <= 0 || !rule.types || rule.types.length === 0) return false;
      for (const slot of this.slots){
        if (!slot.occupied) continue;
        if (!slot.elementType || rule.types.indexOf(slot.elementType) === -1) continue;
        const dx = Math.abs(slot.column - candidate.column);
        const dy = Math.abs(slot.layerIndex - candidate.layerIndex);
        const chebyshev = Math.max(dx, dy);
        if (chebyshev <= distance) return true;
      }
      return false;
    }
  }
}
