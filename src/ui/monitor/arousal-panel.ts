namespace Jamble {
  export interface ArousalOptions extends LineGraphOptions {
    baselineValue?: number;
    maintainedValue?: number;
    riseRate?: number;
    decayRate?: number;
  }

  /**
   * Arousal panel – communicates progress toward sustaining a balance threshold.
   * Default state is a low, steady line that rises while balance is maintained.
   */
  export class ArousalPanel extends LineGraphPanel {
    private balanceMaintained: boolean = false;
    private baselineValue: number;
    private maintainedValue: number;
    private riseRate: number;
    private decayRate: number;
    private currentValue: number;
    private readonly zoneCount: number = 6;
    private readonly intensityMin: number = -1;
    private readonly intensityMax: number = 6;
    private readonly baseHue: number = 335;
    private readonly baseSaturation: number = 95.2;
    private readonly baselineLightness: number = 96.0;
    private readonly peakLightness: number = 52.1;
    private readonly highLightness: number = 12.0;
    private readonly zoneColors: string[];

    constructor(parent: HTMLElement, width: number, height: number, options: ArousalOptions = {}) {
      super(parent, width, height, {
        ...options,
        initialValue: options.initialValue ?? options.baselineValue ?? 0.2,
        strokeStyle: options.strokeStyle ?? '#59a869'
      });

      this.baselineValue = Math.max(0, Math.min(1, options.baselineValue ?? 0.2));
      this.maintainedValue = Math.max(this.baselineValue, Math.min(1, options.maintainedValue ?? 0.85));
      this.riseRate = options.riseRate ?? 0.8;   // units per second
      this.decayRate = options.decayRate ?? 0.4; // units per second
      this.currentValue = this.baselineValue;
      this.zoneColors = this.buildZoneColors();
    }

    setBalanceMaintained(value: boolean): void {
      this.balanceMaintained = value;
    }

    /**
     * Optional external tuning of the arousal meter.
     */
    setMaintainedIntensity(amount: number): void {
      const clamped = Math.max(0, Math.min(1, amount));
      this.maintainedValue = Math.max(this.baselineValue, clamped);
    }

    setDecayRate(value: number): void {
      this.decayRate = Math.max(0, Math.min(5, value));
    }

    getDecayRate(): number {
      return this.decayRate;
    }

    setRiseRate(value: number): void {
      this.riseRate = Math.max(0, Math.min(5, value));
    }

    applyImpulse(amount: number): void {
      const clamped = Math.max(0, Math.min(1, this.currentValue + amount));
      this.currentValue = clamped;
      this.pushImmediate(clamped);
    }

    protected generateSample(sampleIntervalSeconds: number): number | null {
      const target = this.balanceMaintained ? this.maintainedValue : this.baselineValue;
      const rate = this.balanceMaintained ? this.riseRate : this.decayRate;

      this.currentValue = this.moveTowards(this.currentValue, target, rate * sampleIntervalSeconds);
      return this.currentValue;
    }

    protected getStrokeColor(value: number): string {
      const index = Math.min(this.zoneCount - 1, Math.max(0, Math.floor(value * this.zoneCount)));
      return this.zoneColors[index];
    }

    private moveTowards(current: number, target: number, maxDelta: number): number {
      if (Math.abs(target - current) <= maxDelta) {
        return target;
      }
      return current + Math.sign(target - current) * maxDelta;
    }

    private buildZoneColors(): string[] {
      const colors: string[] = [];
      for (let i = 0; i < this.zoneCount; i++) {
        const centerNormalized = (i + 0.5) / this.zoneCount;
        const intensity = this.mapNormalizedToIntensity(centerNormalized);
        colors.push(this.colorForIntensity(intensity));
      }
      return colors;
    }

    private mapNormalizedToIntensity(normalized: number): number {
      const clamped = Math.max(0, Math.min(1, normalized));
      return this.intensityMin + (this.intensityMax - this.intensityMin) * clamped;
    }

    private colorForIntensity(intensity: number): string {
      const lightness = this.lightnessForIntensity(intensity);
      return `hsl(${this.baseHue}, ${this.baseSaturation}%, ${lightness.toFixed(2)}%)`;
    }

    private lightnessForIntensity(intensity: number): number {
      if (intensity <= 3) {
        const t = this.clamp01(this.normalizeRange(intensity, this.intensityMin, 3));
        return this.lerp(this.baselineLightness, this.peakLightness, this.smoothstep(t));
      }

      const t = this.clamp01(this.normalizeRange(intensity, 3, this.intensityMax));
      return this.lerp(this.peakLightness, this.highLightness, this.smoothstep(t));
    }

    private normalizeRange(value: number, min: number, max: number): number {
      if (max === min) return 0;
      return (value - min) / (max - min);
    }

    private smoothstep(t: number): number {
      return t * t * (3 - 2 * t);
    }

    private lerp(a: number, b: number, t: number): number {
      return a + (b - a) * t;
    }

    private clamp01(value: number): number {
      return Math.max(0, Math.min(1, value));
    }
  }
}
