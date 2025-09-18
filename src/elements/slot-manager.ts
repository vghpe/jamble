/// <reference path="./types.ts" />

namespace Jamble {
  interface SlotLayerTemplate {
    type: SlotType;
    columns: number;
    yPercent: number;
    noiseX: number;
    noiseY: number;
    invalidColumns?: number[];
  }

  const SLOT_LAYER_TEMPLATES: ReadonlyArray<SlotLayerTemplate> = [
    { type: 'ground', columns: 8, yPercent: 0, noiseX: 1.5, noiseY: 0, invalidColumns: [0, 7] },
    { type: 'air_low', columns: 8, yPercent: 28, noiseX: 2.5, noiseY: 4 },
    { type: 'air_mid', columns: 8, yPercent: 55, noiseX: 2.5, noiseY: 4 },
    { type: 'air_high', columns: 8, yPercent: 78, noiseX: 2.5, noiseY: 4 },
    { type: 'ceiling', columns: 8, yPercent: 100, noiseX: 1.5, noiseY: 0 }
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

  const NOISE_SEED = 142857;
  const PERM_SIZE = 256;
  const PERM_MASK = PERM_SIZE - 1;
  const gradients: Array<[number, number]> = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2],
    [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2]
  ];
  const NOISE_SCALE_PRIMARY_X = 2.1;
  const NOISE_SCALE_PRIMARY_Y = 1.7;
  const NOISE_SCALE_SECONDARY_X = 1.9;
  const NOISE_SCALE_SECONDARY_Y = 2.4;

  export interface SlotNoiseOptions {
    enabled: boolean;
    horizontal: number;
    vertical: number;
  }

  function mulberry32(seed: number): () => number {
    return function(){
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const perm = (() => {
    const p = new Uint8Array(PERM_SIZE * 2);
    const source = new Uint8Array(PERM_SIZE);
    for (let i = 0; i < PERM_SIZE; i++) source[i] = i;
    const rnd = mulberry32(NOISE_SEED);
    for (let i = PERM_SIZE - 1; i >= 0; i--){
      const j = Math.floor(rnd() * (i + 1));
      const tmp = source[i];
      source[i] = source[j];
      source[j] = tmp;
    }
    for (let i = 0; i < PERM_SIZE * 2; i++){
      p[i] = source[i & PERM_MASK];
    }
    return p;
  })();

  function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function grad(hash: number, x: number, y: number): number {
    const g = gradients[hash % gradients.length];
    return g[0] * x + g[1] * y;
  }

  function perlin2D(x: number, y: number): number {
    const xi = Math.floor(x) & PERM_MASK;
    const yi = Math.floor(y) & PERM_MASK;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[xi + perm[yi]];
    const ab = perm[xi + perm[yi + 1]];
    const ba = perm[xi + 1 + perm[yi]];
    const bb = perm[xi + 1 + perm[yi + 1]];

    const x1 = grad(aa, xf, yf);
    const x2 = grad(ba, xf - 1, yf);
    const y1 = x1 + u * (x2 - x1);

    const x3 = grad(ab, xf, yf - 1);
    const x4 = grad(bb, xf - 1, yf - 1);
    const y2 = x3 + u * (x4 - x3);

    return y1 + v * (y2 - y1);
  }

  export class SlotManager {
    private host: HTMLElement;
    private metrics: SlotMetrics = { width: 0, height: 0 };
    private slots: SlotDefinition[] = [];
    private slotsByType = new Map<SlotType, SlotDefinition[]>();
    private slotByElementId = new Map<string, SlotDefinition>();
    private noiseOptions: SlotNoiseOptions = { enabled: true, horizontal: 1, vertical: 1 };

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
          const slotId = template.type + '-' + column;
          const nx = template.columns > 1 ? column / (template.columns - 1) : 0;
          const ny = SLOT_LAYER_TEMPLATES.length > 1 ? layerIndex / (SLOT_LAYER_TEMPLATES.length - 1) : 0;
          const noiseEnabled = this.noiseOptions.enabled;
          const amplitudeX = noiseEnabled ? template.noiseX * Math.max(0, this.noiseOptions.horizontal) : 0;
          const amplitudeY = noiseEnabled ? template.noiseY * Math.max(0, this.noiseOptions.vertical) : 0;
          const noiseX = amplitudeX !== 0 ? perlin2D(nx * NOISE_SCALE_PRIMARY_X + 0.31, ny * NOISE_SCALE_PRIMARY_Y + 3.73) : 0;
          const noiseY = amplitudeY !== 0 ? perlin2D(nx * NOISE_SCALE_SECONDARY_X + 4.11, ny * NOISE_SCALE_SECONDARY_Y + 1.19 + 7.0) : 0;
          const offsetX = noiseX * amplitudeX;
          const offsetY = noiseY * amplitudeY;
          const xPercent = clamp(baseXPct + offsetX, 0, 100);
          const yPercent = clamp(template.yPercent + offsetY, 0, 100);
          const slot: SlotDefinition = {
            id: slotId,
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

  getNoiseOptions(): SlotNoiseOptions {
    return { ...this.noiseOptions };
  }

  setNoiseOptions(options: Partial<SlotNoiseOptions>): void {
    this.noiseOptions = {
      ...this.noiseOptions,
      ...options
    };
    if (this.noiseOptions.horizontal < 0) this.noiseOptions.horizontal = 0;
    if (this.noiseOptions.vertical < 0) this.noiseOptions.vertical = 0;
    this.noiseOptions.enabled = options.enabled !== undefined ? options.enabled : this.noiseOptions.enabled;
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
