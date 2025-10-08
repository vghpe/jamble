/// <reference path="player.ts" />

namespace Jamble {
  export class PlayerAnim {
    private targetScaleX: number = 1;
    private targetScaleY: number = 1;
    private readonly animationSpeed: number = 8;

    // In-air stretch tuning
    private readonly airStretchFactor: number = 0.05;
    private readonly airSquashFactor: number = 0.02;
    private readonly airVelocityUnit: number = 40; // px/s per 1 unit

    // Landing squash tuning
    private readonly landScaleX: number = 1.4;
    private readonly landScaleY: number = 0.6;
    private readonly landHoldS: number = 0.15; // 150ms
    private readonly landFullSpeed: number = 500; // px/s to reach full squash

    private landingActive: boolean = false;
    private landingHoldTimerS: number = 0;

    constructor(private player: Player) {}

    update(deltaTime: number): void {
      const anim = this.player.render.animation;
      if (!anim) return;

      // If we left the ground while a landing hold is active, cancel immediately
      if (!this.player.grounded && this.landingActive) {
        this.landingActive = false;
        this.landingHoldTimerS = 0;
        // Keep current animation values; set targets to current to avoid snapping
        this.targetScaleX = anim.scaleX;
        this.targetScaleY = anim.scaleY;
      }

      // Exponential smoothing tweener
      const lerpFactor = 1 - Math.pow(0.001, deltaTime * this.animationSpeed);
      anim.scaleX += (this.targetScaleX - anim.scaleX) * lerpFactor;
      anim.scaleY += (this.targetScaleY - anim.scaleY) * lerpFactor;

      // In-air stretch (when ascending) if not holding a landing squash
      if (!this.player.grounded && !this.landingActive) {
        const vUnits = Math.max(0, -this.player.velocityY / this.airVelocityUnit);
        const stretchY = 1 + vUnits * this.airStretchFactor;
        const squashX = 1 - vUnits * this.airSquashFactor;
        anim.scaleX = squashX;
        anim.scaleY = stretchY;
        this.targetScaleX = squashX;
        this.targetScaleY = stretchY;
      }

      // Landing hold countdown
      if (this.landingActive) {
        this.landingHoldTimerS -= deltaTime;
        if (this.landingHoldTimerS <= 0) {
          this.targetScaleX = 1;
          this.targetScaleY = 1;
          this.landingActive = false;
        }
      }
    }

    onLanded(velocityYAtImpact: number = 0): void {
      const anim = this.player.render.animation;
      if (!anim) return;
      // Scale squash amount with impact speed up to full at ~500 px/s
      const ratio = Math.max(0, Math.min(1, Math.abs(velocityYAtImpact) / this.landFullSpeed));
      const sx = 1 + (this.landScaleX - 1) * ratio;
      const sy = 1 - (1 - this.landScaleY) * ratio;

      // Immediate squash; tweener will smooth back after hold
      anim.scaleX = sx;
      anim.scaleY = sy;
      this.targetScaleX = sx;
      this.targetScaleY = sy;
      this.landingActive = true;
      this.landingHoldTimerS = this.landHoldS;
    }
  }
}

