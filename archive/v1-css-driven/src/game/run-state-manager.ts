/// <reference path="../core/settings.ts" />

namespace Jamble {
  export type RunState = 'idle' | 'countdown' | 'running' | 'finished';

  export interface RunSnapshot {
    state: RunState;
    lapsTarget: number;
    lapsRemaining: number;
    runsCompleted: number;
  }

  export class RunStateManager {
    private state: RunState = 'idle';
    private lapsTarget = 1;
    private lapsRemaining = 1;
    private runsCompleted = 0;

    setInitialLaps(value: number): void {
      const clamped = this.clampLaps(value);
      this.lapsTarget = clamped;
      this.lapsRemaining = clamped;
      this.state = 'idle';
    }

    startCountdown(lapsValue: number): void {
      const target = this.clampLaps(lapsValue);
      this.lapsTarget = target;
      this.lapsRemaining = target;
      this.state = 'countdown';
    }

    startRun(): void {
      if (this.state !== 'countdown') return;
      this.state = 'running';
    }

    handleEdgeArrival(): boolean {
      if (this.state !== 'running') return false;
      if (this.lapsRemaining > 0) this.lapsRemaining -= 1;
      if (this.lapsRemaining <= 0){
        this.finishRun();
        return true;
      }
      return false;
    }

    finishRun(): void {
      this.runsCompleted += 1;
      this.state = 'finished';
      this.lapsRemaining = 0;
    }

    resetToIdle(lapsValue: number): void {
      this.lapsTarget = this.clampLaps(lapsValue);
      this.lapsRemaining = this.lapsTarget;
      this.state = 'idle';
    }

    getSnapshot(): RunSnapshot {
      return {
        state: this.state,
        lapsTarget: this.lapsTarget,
        lapsRemaining: this.lapsRemaining,
        runsCompleted: this.runsCompleted
      };
    }

    getRunsCompleted(): number {
      return this.runsCompleted;
    }

    setRunsCompleted(value: number): void {
      this.runsCompleted = Math.max(0, Math.floor(value));
    }

    setLapsValue(value: number): void {
      const clamped = this.clampLaps(value);
      this.lapsTarget = clamped;
      this.lapsRemaining = clamped;
    }

    applyLapValue(value: number): void {
      const clamped = this.clampLaps(value);
      this.lapsTarget = clamped;
      this.lapsRemaining = clamped;
    }

    getLapsRemaining(): number {
      return this.lapsRemaining;
    }

    getLapsTarget(): number {
      return this.lapsTarget;
    }

    getState(): RunState {
      return this.state;
    }

    private clampLaps(value: number): number {
      if (!Number.isFinite(value)) return 1;
      return Math.max(1, Math.min(9, Math.floor(value)));
    }
  }
}
