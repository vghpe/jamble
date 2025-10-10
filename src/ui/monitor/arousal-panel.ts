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

    private moveTowards(current: number, target: number, maxDelta: number): number {
      if (Math.abs(target - current) <= maxDelta) {
        return target;
      }
      return current + Math.sign(target - current) * maxDelta;
    }
  }
}
