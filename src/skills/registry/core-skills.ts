/// <reference path="../types.ts" />
/// <reference path="../jump.ts" />
/// <reference path="../dash.ts" />
/// <reference path="../move.ts" />
/// <reference path="../hover.ts" />

namespace Jamble {
  type CoreSkillDescriptor<TCfg = any> = SkillDescriptor & {
    symbol: string;
    type: string;
  };

  const CORE_SKILLS: CoreSkillDescriptor[] = [
    {
      id: 'move',
      name: 'Move',
      symbol: 'M',
      type: 'move',
      slot: 'movement',
      priority: 5,
      defaults: {},
      create: (_cfg) => new MoveSkill('move', 5)
    },
    {
      id: 'jump',
      name: 'Jump',
      symbol: 'J',
      type: 'jump',
      slot: 'movement',
      priority: 10,
      defaults: { strength: 7 },
      create: (cfg) => new JumpSkill('jump', 10, cfg)
    },
    {
      id: 'jump.high',
      name: 'Jump High',
      symbol: 'H',
      type: 'jump',
      slot: 'movement',
      priority: 10,
      defaults: { strength: 10 },
      create: (cfg) => new JumpSkill('jump.high', 10, cfg)
    },
    {
      id: 'dash',
      name: 'Dash',
      symbol: 'D',
      type: 'dash',
      slot: 'movement',
      priority: 20,
      defaults: { 
        speed: 280,
        durationMs: 220,
        cooldownMs: 150
      },
      create: (cfg) => new DashSkill('dash', 20, cfg)
    },
    {
      id: 'dash.phase',
      name: 'Phase Dash',
      symbol: 'D+',
      type: 'dash',
      slot: 'movement',
      priority: 20,
      defaults: { 
        speed: 280,
        durationMs: 220,
        cooldownMs: 200, // Slightly longer cooldown for the more powerful variant
        invincible: true // New property to indicate collision immunity
      },
      create: (cfg) => new DashSkill('dash.phase', 20, cfg)
    },
    {
      id: 'hover',
      name: 'Hover',
      symbol: 'H~',
      type: 'hover',
      slot: 'movement',
      priority: 15,
      defaults: {
        targetHeight: 40,     // Hover at 120px above ground
        bobAmplitude: 8,       // 8px up/down bobbing
        bobPeriodMs: 2000,     // 2 second bob cycle
        liftSpeed: 200,        // Lift speed in px/s
        fallSpeed: 300         // Fall speed in px/s when hover disabled
      },
      create: (cfg) => new HoverSkill('hover', 15, cfg)
    }
  ];

  export function registerCoreSkills(manager: SkillManager): void {
    CORE_SKILLS.forEach(desc => manager.register(desc));
  }

  export function getCoreSkillDefinition(id: string): CoreSkillDescriptor | undefined {
    return CORE_SKILLS.find(def => def.id === id);
  }

  export function getCoreSkillDefinitions(): CoreSkillDescriptor[] {
    return CORE_SKILLS.slice();
  }
}