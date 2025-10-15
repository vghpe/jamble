namespace Jamble {
  /**
   * Sensation panel – displays a normalized (0-1) sensation value.
   * The panel is agnostic to what the value means; it just renders it with color mapping.
   * External code (NPC) controls the value and its changes over time.
   */
  export class SensationPanel extends LineGraphPanel {
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

    constructor(parent: HTMLElement, width: number, height: number, options: LineGraphOptions = {}) {
      super(parent, width, height, {
        ...options,
        initialValue: options.initialValue ?? 0.2,
        strokeStyle: options.strokeStyle ?? '#59a869'
      });

      this.currentValue = options.initialValue ?? 0.2;
      this.zoneColors = this.buildZoneColors();
    }

    /**
     * Set the current sensation value (0-1 normalized).
     * This should be called by external code (e.g., NPC system) to update the display.
     */
    setValue(value: number): void {
      this.currentValue = Math.max(0, Math.min(1, value));
    }

    /**
     * Get the current sensation value.
     */
    getValue(): number {
      return this.currentValue;
    }

    protected generateSample(_sampleIntervalSeconds: number): number | null {
      // Simply return the current value - no internal state changes
      return this.currentValue;
    }

    protected getStrokeColor(value: number): string {
      const index = Math.min(this.zoneCount - 1, Math.max(0, Math.floor(value * this.zoneCount)));
      return this.zoneColors[index];
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
