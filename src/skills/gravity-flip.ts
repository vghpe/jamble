/// <reference path="./types.ts" />
/// <reference path="./utils.ts" />
/// <reference path="../core/settings.ts" />

namespace Jamble {
  export interface GravityFlipConfig {
    cooldownMs?: number;
  }

  export class GravityFlipSkill implements Skill {
    readonly id: string;
    readonly name: string = 'Gravity Flip';
    readonly slot: SkillSlot = 'movement';
    readonly priority: number;
    
    private cd: CooldownTimer | null = null;
    private inverted: boolean = false;

    constructor(id: string = 'gravity-flip', priority = 25, cfg: GravityFlipConfig = {}) {
      this.id = id;
      this.priority = priority;
      this.cd = cfg.cooldownMs && cfg.cooldownMs > 0 ? new CooldownTimer(cfg.cooldownMs) : null;
    }

    onEquip(_caps: PlayerCapabilities): void {
      this.inverted = false;
      console.log(`[GravityFlip] Equipped`);
    }

    onUnequip(): void {
      // Note: We don't reset gravity here since it should persist when changing skills
      console.log('[GravityFlip] Unequipped');
    }

    onInput(intent: InputIntent, ctx: SkillContext, caps: PlayerCapabilities): boolean {
      // Handle both tap and air-tap for gravity flip
      if (intent !== InputIntent.Tap && intent !== InputIntent.AirTap) return false;
      
      const now = ctx.nowMs;
      if (this.cd && !this.cd.isReady(now)) {
        console.log(`[GravityFlip] Cooldown not ready`);
        return false;
      }

      // Perform the gravity flip
      this.flipGravity(ctx, caps);
      
      if (this.cd) this.cd.tryConsume(now);
      return true;
    }

    onTick(_ctx: SkillContext, _caps: PlayerCapabilities): void {
      // No need to handle gravity in onTick since Player class now handles inverted gravity
    }

    onLand(ctx: SkillContext, _caps: PlayerCapabilities): void {
      const ground = this.inverted ? 'ceiling' : 'floor';
      console.log(`[GravityFlip] Landing on ${ground} - jumpHeight: ${ctx.jumpHeight}, inverted: ${this.inverted}`);
    }



    private flipGravity(_ctx: SkillContext, caps: PlayerCapabilities): void {
      console.log(`[GravityFlip] Triggering gravity flip`);
      
      // Use the player's built-in gravity flip functionality
      caps.flipGravity();
      
      // Update our internal state to match
      this.inverted = !this.inverted;
    }





    // Getter for debug purposes
    public isInverted(): boolean {
      return this.inverted;
    }
  }
}