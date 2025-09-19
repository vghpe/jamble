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

  interface NormalizedOrigin {
    x: number;
    y: number;
    xUnit: ElementOriginUnit;
    yUnit: ElementOriginUnit;
  }

  export interface SlotApplicationOptions {
    origin?: ElementOrigin | null;
  }

  export interface SlotApplicationResult {
    originApplied: boolean;
    needsRetry: boolean;
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

  export interface SlotNormalDistributionOptions {
    enabled: boolean;
    intensity: number;
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
    private noiseOptions: SlotNoiseOptions = { enabled: false, horizontal: 1, vertical: 1 };
    private normalDistribution: SlotNormalDistributionOptions = { enabled: false, intensity: 0.6 };

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
        const distributionXPcts = this.normalDistribution.enabled
          ? this.computeNormalColumnPercents(template.columns)
          : null;
        for (let column = 0; column < template.columns; column++){
          const baseXPct = distributionXPcts
            ? distributionXPcts[column]
            : (column + 0.5) * stride;
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

    getNormalDistributionOptions(): SlotNormalDistributionOptions {
      return { ...this.normalDistribution };
    }

    setNormalDistributionOptions(options: Partial<SlotNormalDistributionOptions>): void {
      this.normalDistribution = {
        ...this.normalDistribution,
        ...options
      };
      if (this.normalDistribution.intensity < 0) this.normalDistribution.intensity = 0;
      if (this.normalDistribution.intensity > 1) this.normalDistribution.intensity = 1;
      this.normalDistribution.enabled = options.enabled !== undefined ? options.enabled : this.normalDistribution.enabled;
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

    applySlotToElement(element: LevelElement, slot: SlotDefinition, options: SlotApplicationOptions = {}): SlotApplicationResult {
      const result: SlotApplicationResult = { originApplied: false, needsRetry: false };
      const origin = options.origin ? this.normalizeOrigin(options.origin) : null;
      if (origin){
        const leftPx = this.applySlotWithOrigin(element, slot, origin);
        if (leftPx !== null){
          this.applyPostOriginAdjustments(element, slot, leftPx);
          result.originApplied = true;
        } else {
          result.needsRetry = true;
        }
      }
      if (!result.originApplied){
        this.applySlotFallback(element, slot);
      }
      return result;
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

    private normalizeOrigin(origin: ElementOrigin): NormalizedOrigin {
      const normalizedX = Number.isFinite(origin.x) ? origin.x : 0.5;
      const normalizedY = Number.isFinite(origin.y) ? origin.y : 0;
      const xUnit: ElementOriginUnit = origin.xUnit === 'px' ? 'px' : 'fraction';
      const yUnit: ElementOriginUnit = origin.yUnit === 'px' ? 'px' : 'fraction';
      return { x: normalizedX, y: normalizedY, xUnit, yUnit };
    }

    private applySlotWithOrigin(element: LevelElement, slot: SlotDefinition, origin: NormalizedOrigin): number | null {
      const host = (element.el.offsetParent as HTMLElement | null) || element.el.parentElement;
      if (!host) return null;
      const hostRect = host.getBoundingClientRect();
      const hostWidth = host.offsetWidth || hostRect.width;
      const hostHeight = host.offsetHeight || hostRect.height;
      if (hostWidth <= 0 || hostHeight <= 0) return null;

      const elRect = element.el.getBoundingClientRect();
      const elWidth = element.el.offsetWidth || elRect.width || 1;
      const elHeight = element.el.offsetHeight || elRect.height || 1;

      const originX = origin.xUnit === 'px'
        ? origin.x
        : clamp(origin.x, 0, 1) * elWidth;
      const originY = origin.yUnit === 'px'
        ? origin.y
        : clamp(origin.y, 0, 1) * elHeight;

      const maxLeft = Math.max(0, hostWidth - elWidth);
      const maxBottom = Math.max(0, hostHeight - elHeight);
      const leftPx = clamp(slot.xPx - originX, 0, maxLeft);
      const bottomPx = clamp(slot.yPx - originY, 0, maxBottom);

      element.el.style.left = leftPx.toFixed(1) + 'px';
      element.el.style.bottom = bottomPx.toFixed(1) + 'px';

      return leftPx;
    }

    private applyPostOriginAdjustments(element: LevelElement, slot: SlotDefinition, leftPx: number): void {
      if (element.type === 'bird' && typeof (element as any).assignSlot === 'function'){
        (element as any).assignSlot(slot, leftPx);
      }
    }

    private applySlotFallback(element: LevelElement, slot: SlotDefinition): void {
      if (element.type === 'bird' && typeof (element as any).assignSlot === 'function'){
        (element as any).assignSlot(slot);
        return;
      }
      if ((element.type === 'tree' || element.type === 'tree_ceiling') && typeof (element as any).setLeftPct === 'function'){
        (element as any).setLeftPct(slot.xPercent);
        const host = element.el.parentElement as HTMLElement | null;
        if (host && typeof (element as any).applyVerticalFromSlot === 'function'){
          (element as any).applyVerticalFromSlot(slot, host);
        }
        return;
      }
      if (typeof (element as any).setLeftPct === 'function'){
        (element as any).setLeftPct(slot.xPercent);
      }
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

    private computeNormalColumnPercents(columns: number): number[] {
      if (columns <= 0) return [];
      const intensity = clamp(this.normalDistribution.intensity, 0, 1);
      const stride = 100 / columns;

      const basePercents: number[] = new Array(columns);
      for (let column = 0; column < columns; column++){
        basePercents[column] = (column + 0.5) * stride;
      }

      if (intensity <= 0) return basePercents;

      const spreadMin = 0.18;
      const spreadMax = 0.36;
      const spread = spreadMin + intensity * (spreadMax - spreadMin);

      const gaussianPercents: number[] = new Array(columns);
      const minErfInput = -1 + Number.EPSILON;
      const maxErfInput = 1 - Number.EPSILON;
      for (let column = 0; column < columns; column++){
        const normalized = (column + 0.5) / columns;
        const centered = 2 * normalized - 1;
        const safeCentered = clamp(centered, minErfInput, maxErfInput);
        const z = Math.SQRT2 * inverseErf(safeCentered);
        const rawValue = clamp(0.5 + z * spread, 0, 1);
        gaussianPercents[column] = rawValue * 100;
      }

      let min = gaussianPercents[0];
      let max = gaussianPercents[0];
      for (let i = 1; i < gaussianPercents.length; i++){
        const value = gaussianPercents[i];
        if (value < min) min = value;
        if (value > max) max = value;
      }

      if (max - min <= 1e-6) return basePercents;

      const firstBase = basePercents[0];
      const lastBase = basePercents[columns - 1];

      const scaledGaussian = gaussianPercents.map(value => {
        const normalized = (value - min) / (max - min);
        return firstBase + normalized * (lastBase - firstBase);
      });

      return scaledGaussian.map((value, idx) => {
        const base = basePercents[idx];
        return base + (value - base) * intensity;
      });
    }
  }

  function inverseErf(x: number): number {
    if (x <= -1 || x >= 1){
      if (x === -1) return Number.NEGATIVE_INFINITY;
      if (x === 1) return Number.POSITIVE_INFINITY;
      return Number.NaN;
    }
    const a = 0.147;
    const ln = Math.log(1 - x * x);
    const part1 = 2 / (Math.PI * a) + ln / 2;
    const part2 = ln / a;
    const sign = x < 0 ? -1 : 1;
    const inside = part1 * part1 - part2;
    if (inside <= 0) return 0;
    return sign * Math.sqrt(Math.sqrt(inside) - part1);
  }
}
