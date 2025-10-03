/// <reference path="./types.ts" />
/// <reference path="../core/settings.ts" />

namespace Jamble {
  export interface HoverConfig {
    targetHeight: number;      // Height above ground to hover at
    bobAmplitude: number;      // How much up/down bobbing movement
    bobPeriodMs: number;       // Time for one complete bob cycle
    liftSpeed: number;         // Speed when rising to hover height
    fallSpeed: number;         // Speed when falling from hover height
  }

  export class HoverSkill implements Skill {
    readonly id: string;
    readonly name: string = 'Hover';
    readonly slot: SkillSlot = 'movement';
    readonly priority: number;
    private cfg: HoverConfig;
    private caps: PlayerCapabilities | null = null;
    private isActive: boolean = false;
    private bobStartMs: number = 0;

    constructor(id: string = 'hover', priority = 15, cfg: HoverConfig) {
      this.id = id;
      this.priority = priority;
      this.cfg = cfg;
    }

    onEquip(caps: PlayerCapabilities, cfg?: any): void {
      this.caps = caps;
      this.isActive = true;
      this.bobStartMs = performance.now();
      
      // Enable hover mode on the player
      this.caps.setHoverMode(true);
    }

    onUnequip(): void {
      this.isActive = false;
      
      // Disable hover mode and restore gravity
      if (this.caps) {
        this.caps.setHoverMode(false);
      }
      this.caps = null;
    }

    onTick(ctx: SkillContext, caps: PlayerCapabilities): void {
      if (!this.isActive) return;
      
      // Calculate bobbing motion
      const now = ctx.nowMs;
      const elapsed = now - this.bobStartMs;
      const bobCycle = (elapsed % this.cfg.bobPeriodMs) / this.cfg.bobPeriodMs;
      const bobOffset = Math.sin(bobCycle * 2 * Math.PI) * this.cfg.bobAmplitude;
      
      const targetHeight = this.cfg.targetHeight + bobOffset;
      
      // Update hover target through capabilities
      caps.setHoverTarget(targetHeight, this.cfg.liftSpeed, this.cfg.fallSpeed);
    }

    // Hover skill prevents jumping since we're not grounded
    onInput(intent: InputIntent, ctx: SkillContext, caps: PlayerCapabilities): boolean {
      if (!this.isActive) return false;
      
      // Block jump input when hovering (not grounded)
      if (intent === InputIntent.Tap) {
        return true; // Consume the input but don't do anything
      }
      
      return false; // Let other inputs pass through
    }
  }
}