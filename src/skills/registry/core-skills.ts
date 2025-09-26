/// <reference path="../types.ts" />
/// <reference path="../jump.ts" />
/// <reference path="../dash.ts" />
/// <reference path="../move.ts" />

namespace Jamble {
  type CoreSkillDescriptor<TCfg = any> = SkillDescriptor & {
    symbol: string;
    type: string; // for exclusivity like 'jump', 'dash', 'move'
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
      defaults: { strength: 7 }, // Default from embeddedDefaults in settings
      create: (cfg) => new JumpSkill('jump', 10, cfg)
    },
    {
      id: 'jump.high',
      name: 'Jump High',
      symbol: 'H',
      type: 'jump',
      slot: 'movement',
      priority: 10,
      defaults: { strength: 10 }, // Higher jump strength
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
        speed: 280,      // Default from embeddedDefaults in settings
        durationMs: 220, // Default from embeddedDefaults in settings
        cooldownMs: 150  // Default that was hardcoded in game.ts
      },
      create: (cfg) => new DashSkill('dash', 20, cfg)
    }
  ];

  export function registerCoreSkills(manager: SkillManager): void {
    CORE_SKILLS.forEach(desc => manager.register(desc));
  }

  export function getCoreSkillDefinition(id: string): CoreSkillDescriptor | undefined {
    return CORE_SKILLS.find(def => def.id === id);
  }

  export function getCoreSkillDefinitions(): ReadonlyArray<CoreSkillDescriptor> {
    return CORE_SKILLS;
  }
}