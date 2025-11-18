/// <reference path="line-graph-base.ts" />
/// <reference path="../../../systems/editor-mode-manager.ts" />

namespace Jamble {
  export interface HeartRateMonitorOptions extends LineGraphOptions {
    frequency?: number;
    amplitude?: number;
  }

  /**
   * Activity monitor - displays legacy sine wave activity simulation.
   */
  export class HeartRateMonitor extends LineGraphPanel {
    private time: number = 0;
    private frequency: number;
    private amplitude: number;

    constructor(parent: HTMLElement, width: number, height: number, options: HeartRateMonitorOptions = {}) {
      super(parent, width, height, options);
      this.frequency = options.frequency ?? 0.5;
      this.amplitude = options.amplitude ?? 0.3;
    }

    protected generateSample(sampleIntervalSeconds: number): number | null {
      this.time += this.frequency * sampleIntervalSeconds;
      const normalized = Math.sin(this.time * Math.PI * 2) * this.amplitude + 0.5;
      return Math.max(0, Math.min(1, normalized));
    }

    getFrequency(): number { return this.frequency; }
    getAmplitude(): number { return this.amplitude; }

    setFrequency(value: number): void {
      this.frequency = Math.max(0.05, Math.min(5, value));
    }

    setAmplitude(value: number): void {
      this.amplitude = Math.max(0.05, Math.min(0.45, value));
    }
  }
}
