/// <reference path="./types.ts" />
namespace Jamble {
  export class CooldownTimer {
    private readyAt = 0;
    private durationMs: number;
    constructor(durationMs: number){ this.durationMs = Math.max(0, durationMs); }
    reset(): void { this.readyAt = 0; }
    isReady(nowMs: number): boolean { return nowMs >= this.readyAt; }
    tryConsume(nowMs: number): boolean {
      if (!this.isReady(nowMs)) return false;
      this.readyAt = nowMs + this.durationMs;
      return true;
    }
  }

  export class ChargesPool {
    private max: number;
    private regenMs: number;
    private charges: number;
    private lastUseMs = 0;
    constructor(options: { max: number; regenMs: number; initial?: number }){
      this.max = Math.max(0, options.max);
      this.regenMs = Math.max(0, options.regenMs);
      this.charges = Math.min(this.max, Math.max(0, options.initial ?? this.max));
    }
    get count(): number { return this.charges; }
    tryUse(nowMs: number): boolean {
      this.tick(nowMs);
      if (this.charges <= 0) return false;
      this.charges -= 1; this.lastUseMs = nowMs; return true;
    }
    tick(nowMs: number): void {
      if (this.charges >= this.max || this.regenMs <= 0) return;
      const elapsed = nowMs - this.lastUseMs;
      if (elapsed <= 0) return;
      const gained = Math.floor(elapsed / this.regenMs);
      if (gained > 0){
        this.charges = Math.min(this.max, this.charges + gained);
        this.lastUseMs += gained * this.regenMs;
      }
    }
    refillAll(): void { this.charges = this.max; this.lastUseMs = 0; }
  }
}

