/// <reference path="line-graph-base.ts" />

namespace Jamble {
  /**
   * Sensation monitor – displays a normalized (0-1) sensation value.
   * The panel is agnostic to what the value means; it just renders it with color mapping.
   * External code (NPC) controls the value and its changes over time.
   */
  export class SensationMonitor extends LineGraphPanel {
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
    private debugMode: boolean = true;
    private showSweetSpot: boolean = true;

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

    /**
     * Enable/disable sweet spot visualization
     */
    setShowSweetSpot(enabled: boolean): void {
      this.showSweetSpot = enabled;
    }

    /**
     * Get sweet spot visualization state
     */
    getShowSweetSpot(): boolean {
      return this.showSweetSpot;
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
      // Get dimensions first
      const width = (this as any).logicalWidth;
      const height = (this as any).logicalHeight;
      
      // Clear canvas (copied from parent)
      this.ctx.clearRect(0, 0, width, height);
      
      // Draw sweet spot zone AFTER clear but BEFORE line
      if (this.showSweetSpot && this.npc) {
        this.renderSweetSpotZone();
      }
      
      // Draw the line graph (copied from parent LineGraphPanel.render)
      const totalSegments = (this as any).dataBuffer.length - 1;
      if (totalSegments > 0) {
        const sampleSpacing = (this as any).sampleSpacing;
        const totalWidth = totalSegments * sampleSpacing;
        const startX = width - totalWidth;

        for (let i = 0; i < totalSegments; i++) {
          const x1 = startX + i * sampleSpacing;
          const x2 = startX + (i + 1) * sampleSpacing;
          const y1 = (this as any).valueToY((this as any).dataBuffer[i], height);
          const y2 = (this as any).valueToY((this as any).dataBuffer[i + 1], height);

          const age = (i + 1) / totalSegments;
          const opacity = Math.pow(age, 1.5);
          const segmentValue = (this as any).dataBuffer[i + 1];
          const strokeColor = this.getStrokeColor(segmentValue);

          this.ctx.save();
          this.ctx.globalAlpha = opacity;
          this.ctx.strokeStyle = strokeColor;
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(x1, y1);
          this.ctx.lineTo(x2, y2);
          this.ctx.stroke();
          this.ctx.restore();
        }
      }
      
      // Draw pain threshold line on top
      if (this.debugMode && this.npc) {
        this.renderPainThresholdLine();
      }
    }

    /**
     * Render sweet spot zone as yellow rectangle behind the line
     */
    private renderSweetSpotZone(): void {
      if (!this.npc) return;
      
      const crescendoConfig = (this.npc as any).crescendoConfig;
      if (!crescendoConfig) return;
      
      const arousalRange = this.npc.getArousalRange();
      const targetValue = crescendoConfig.targetArousalValue;
      const tolerance = crescendoConfig.arousalTolerance;
      
      // Calculate zone bounds in arousal space
      const zoneMin = targetValue - tolerance;
      const zoneMax = targetValue + tolerance;
      
      // Convert to normalized 0-1 values
      const normalizedMin = this.mapArousalToNormalized(zoneMin, arousalRange);
      const normalizedMax = this.mapArousalToNormalized(zoneMax, arousalRange);
      
      // Convert to canvas Y coordinates (note: Y increases downward)
      const yTop = this.computeYFromNormalized(normalizedMax);
      const yBottom = this.computeYFromNormalized(normalizedMin);
      const zoneHeight = yBottom - yTop;
      
      // Get canvas dimensions
      const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
      
      // Draw yellow rectangle for better contrast
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(216, 251, 255, 1)'; 
      this.ctx.fillRect(0, yTop, canvasWidth, zoneHeight);
      this.ctx.restore();
    }

    /**
     * Render pain threshold line on top
     */
    private renderPainThresholdLine(): void {
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
      
      this.drawPainThresholdLabel(y);
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
    
    private drawPainThresholdLabel(y: number): void {
      const labelColor = '#ff6b35';
      const label = 'Pain Threshold';
      const offsetX = 6;
      const offsetY = 6;
      
      this.ctx.save();
      this.ctx.fillStyle = labelColor;
      this.ctx.font = '8px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'alphabetic';
      this.ctx.fillText(label, offsetX, y - offsetY);
      this.ctx.restore();
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
