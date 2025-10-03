/// <reference path="./types.ts" />
/// <reference path="../core/settings.ts" />
namespace Jamble {
  export class DashSkill implements Skill {
    readonly id: string; readonly name: string = 'Dash'; readonly slot: SkillSlot = 'movement'; readonly priority: number;
    private cd: CooldownTimer;
    private usedThisAir: boolean = false;
    private cfg: DashConfig;
    constructor(id: string = 'dash', priority = 20, cfg: DashConfig){
      this.id = id; this.priority = priority; this.cfg = cfg; this.cd = new CooldownTimer(cfg.cooldownMs);
    }
    onEquip(caps: PlayerCapabilities): void { /* no-op for now */ }
    onLand(_ctx: SkillContext, _caps: PlayerCapabilities): void { this.usedThisAir = false; }
    onInput(intent: InputIntent, ctx: SkillContext, caps: PlayerCapabilities): boolean {
      if (intent !== InputIntent.AirTap) return false; // default: dash only on air tap
      if (ctx.grounded) return false;
      if (this.usedThisAir) return false;
      const now = ctx.nowMs;
      if (!this.cd.isReady(now)) return false;
      // Start dash (vertical freeze + state), and apply horizontal impulse independent of Move
      const ok = caps.startDash(this.cfg.speed, this.cfg.durationMs, this.cfg.invincible);
      if (ok){
        caps.addHorizontalImpulse(this.cfg.speed, this.cfg.durationMs);
        this.cd.tryConsume(now);
        this.usedThisAir = true;
      }
      return ok;
    }
  }
}
