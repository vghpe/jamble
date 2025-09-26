/// <reference path="./types.ts" />
/// <reference path="./utils.ts" />
/// <reference path="../core/settings.ts" />

namespace Jamble {
  export interface GravityFlipConfig {
    cooldownMs?: number;
  }

  /**
   * VVVVVV-style gravity flip skill that toggles player gravity direction.
   * When activated, switches between floor and ceiling as the "ground".
   * Preserves player world position and provides smooth physics transitions.
   */
  export class GravityFlipSkill implements Skill {
    readonly id: string;
    readonly name: string = 'Gravity Flip';
    readonly slot: SkillSlot = 'movement';
    readonly priority: number;
    
    private cd: CooldownTimer | null = null;

    constructor(id: string = 'gravity-flip', priority = 25, cfg: GravityFlipConfig = {}) {
      this.id = id;
      this.priority = priority;
      this.cd = cfg.cooldownMs && cfg.cooldownMs > 0 ? new CooldownTimer(cfg.cooldownMs) : null;
    }

    onInput(intent: InputIntent, ctx: SkillContext, caps: PlayerCapabilities): boolean {
      // Handle both tap and air-tap for gravity flip
      if (intent !== InputIntent.Tap && intent !== InputIntent.AirTap) return false;
      
      const now = ctx.nowMs;
      if (this.cd && !this.cd.isReady(now)) return false;

      // Trigger gravity flip through player capabilities
      caps.flipGravity();
      
      if (this.cd) this.cd.tryConsume(now);
      return true;
    }
  }
}