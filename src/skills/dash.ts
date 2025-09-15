/// <reference path="./types.ts" />
/// <reference path="../settings.ts" />
namespace Jamble {
  export class DashSkill implements Skill {
    readonly id: string; readonly name: string = 'Dash'; readonly slot: SkillSlot = 'movement'; readonly priority: number;
    private cd: CooldownTimer;
    private usedThisAir: boolean = false;
    constructor(id: string = 'dash', priority = 20, cooldownMs = 150){ this.id = id; this.priority = priority; this.cd = new CooldownTimer(cooldownMs); }
    onEquip(caps: PlayerCapabilities): void { /* no-op for now */ }
    onLand(_ctx: SkillContext, _caps: PlayerCapabilities): void { this.usedThisAir = false; }
    onInput(intent: InputIntent, ctx: SkillContext, caps: PlayerCapabilities): boolean {
      if (intent !== InputIntent.AirTap) return false; // default: dash only on air tap
      if (ctx.grounded) return false;
      if (this.usedThisAir) return false;
      const now = ctx.nowMs;
      if (!this.cd.isReady(now)) return false;
      const ok = caps.startDash(Jamble.Settings.current.dashSpeed, Jamble.Settings.current.dashDurationMs);
      if (ok){ this.cd.tryConsume(now); this.usedThisAir = true; }
      return ok;
    }
  }
}

