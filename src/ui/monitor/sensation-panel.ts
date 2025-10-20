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
    private npc: BaseNPC | null = null;
    private debugMode: boolean = false;

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

    /**
     * Set the NPC reference for debug visualization
     */
    setNPC(npc: BaseNPC): void {
      this.npc = npc;
    }

    /**
     * Enable/disable debug mode (shows thresholds and zones)
     */
    setDebugMode(enabled: boolean): void {
      this.debugMode = enabled;
    }

    /**
     * Get debug mode state
     */
    getDebugMode(): boolean {
      return this.debugMode;
    }

    protected generateSample(_sampleIntervalSeconds: number): number | null {
      // Simply return the current value - no internal state changes
      return this.currentValue;
    }

    protected getStrokeColor(value: number): string {
      const index = Math.min(this.zoneCount - 1, Math.max(0, Math.floor(value * this.zoneCount)));
      return this.zoneColors[index];
    }

    /**
     * Override render to add debug visualization
     */
    render(): void {
      // Call parent render first to draw the line graph
      super.render();
      
      // Add debug overlays if enabled
      if (this.debugMode && this.npc) {
        this.renderDebugOverlay();
      }
    }

    /**
     * Render debug overlay with pain threshold line
     */
    private renderDebugOverlay(): void {
      if (!this.npc) return;
      
      const painThreshold = this.npc.getPainThreshold();
      const arousalRange = this.npc.getArousalRange();
      
      // Convert pain threshold (arousal value) to normalized 0-1 value
      const normalizedPainThreshold = this.mapArousalToNormalized(painThreshold, arousalRange);
      
      // Draw horizontal line at pain threshold
      const y = this.computeYFromNormalized(normalizedPainThreshold);
      
      // Get canvas width from parent context
      const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
      
      this.ctx.save();
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.globalAlpha = 0.8;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(canvasWidth, y);
      this.ctx.stroke();
      this.ctx.restore();
    }

    /**
     * Map arousal value to normalized 0-1 value
     */
    private mapArousalToNormalized(arousalValue: number, range: { min: number; max: number }): number {
      const clamped = Math.max(range.min, Math.min(range.max, arousalValue));
      return (clamped - range.min) / (range.max - range.min);
    }

    /**
     * Convert normalized value to Y coordinate on canvas
     */
    private computeYFromNormalized(value: number): number {
      const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
      const padding = canvasHeight * 0.1; // verticalPaddingRatio from parent
      const usableHeight = canvasHeight - padding * 2;
      return canvasHeight - (value * usableHeight + padding);
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
