/// <reference path="../core/settings.ts" />
/// <reference path="./player.ts" />
/// <reference path="../skills/manager.ts" />

namespace Jamble {
  export interface BoundaryEvent {
    hit: boolean;
    newDirection?: 1 | -1;
    alignmentFn?: () => void;
  }

  export class MovementSystem {
    private impulses: Array<{ speed: number; remainingMs: number }> = [];

    constructor(private gameEl: HTMLElement) {}

    public tick(
      deltaMs: number,
      deltaSec: number,
      player: Player,
      direction: 1 | -1,
      skills: SkillManager
    ): BoundaryEvent {
      // Early return if player is frozen
      if (player.frozenStart || player.frozenDeath) {
        return { hit: false };
      }

      // Apply base movement if Move skill is equipped
      if (skills.isEquipped('move')) {
        const base = Jamble.Settings.current.playerSpeed;
        const dx = base * deltaSec * direction;
        player.moveX(dx);
      }

      // Apply horizontal impulses (from Dash skill, etc.)
      this.processImpulses(deltaMs, deltaSec, direction, player);

      // Check for boundary collisions
      return this.checkBoundaries(player, direction);
    }

    public addImpulse(speed: number, durationMs: number): void {
      this.impulses.push({ speed, remainingMs: Math.max(0, durationMs) });
    }

    public clearImpulses(): void {
      this.impulses.length = 0;
    }

    public getActiveImpulses(): ReadonlyArray<{ speed: number; remainingMs: number }> {
      return this.impulses;
    }

    private processImpulses(deltaMs: number, deltaSec: number, direction: 1 | -1, player: Player): void {
      if (this.impulses.length === 0) return;

      // Sum all active impulse speeds
      let totalSpeed = 0;
      for (const imp of this.impulses) {
        totalSpeed += Math.max(0, imp.speed);
      }

      // Apply combined impulse movement
      if (totalSpeed > 0) {
        const dxImp = totalSpeed * deltaSec * direction;
        player.moveX(dxImp);
      }

      // Decrement remaining time and remove finished impulses
      for (const imp of this.impulses) {
        imp.remainingMs -= deltaMs;
      }
      this.impulses = this.impulses.filter(i => i.remainingMs > 0);
    }

    private checkBoundaries(player: Player, direction: 1 | -1): BoundaryEvent {
      if (direction === 1 && this.reachedRight(player)) {
        return {
          hit: true,
          newDirection: -1,
          alignmentFn: () => player.snapRight(this.gameEl.offsetWidth)
        };
      }

      if (direction === -1 && this.reachedLeft(player)) {
        return {
          hit: true,
          newDirection: 1,
          alignmentFn: () => player.setX(Jamble.Settings.current.playerStartOffset)
        };
      }

      return { hit: false };
    }

    private reachedRight(player: Player): boolean {
      const rightLimit = this.gameEl.offsetWidth - Jamble.Settings.current.playerStartOffset;
      return player.getRight(this.gameEl.offsetWidth) >= rightLimit;
    }

    private reachedLeft(player: Player): boolean {
      return player.x <= Jamble.Settings.current.playerStartOffset;
    }
  }
}
