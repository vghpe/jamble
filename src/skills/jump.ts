/// <reference path="./types.ts" />
/// <reference path="../settings.ts" />
namespace Jamble {
  export class JumpSkill implements Skill {
    readonly id: string; readonly name: string = 'Jump'; readonly slot: SkillSlot = 'movement'; readonly priority: number;
    private cd: CooldownTimer | null = null;
    private cfg: { strength: number };
    constructor(id: string = 'jump', priority = 10, cfg: { strength: number, cooldownMs?: number } = { strength: 7 }){
      this.id = id; this.priority = priority; this.cfg = { strength: cfg.strength };
      this.cd = cfg.cooldownMs && cfg.cooldownMs > 0 ? new CooldownTimer(cfg.cooldownMs) : null;
    }
    onInput(intent: InputIntent, ctx: SkillContext, caps: PlayerCapabilities): boolean {
      if (intent !== InputIntent.Tap && intent !== InputIntent.AirTap) return false;
      if (!ctx.grounded && intent !== InputIntent.AirTap) return false; // default Jump handles ground tap
      const now = ctx.nowMs;
      if (this.cd && !this.cd.isReady(now)) return false;
      const ok = caps.requestJump(this.cfg.strength);
      if (ok && this.cd) this.cd.tryConsume(now);
      return ok;
    }
  }
}
