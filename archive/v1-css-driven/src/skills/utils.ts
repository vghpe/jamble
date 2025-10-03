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
}
