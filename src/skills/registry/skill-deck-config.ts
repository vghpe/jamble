/// <reference path="../types.ts" />

namespace Jamble {
  export interface SkillLoadoutEntry {
    id: string;
    skillId: string;
    name: string;
    type: string;
    symbol: string;
    active: boolean;
  }

  export interface SkillSlotConfig {
    slotId: string;
    skillId: string | null;
    active: boolean;
  }

  export interface SkillsSettings {
    loadout: SkillSlotConfig[];
    configs: { [skillId: string]: any };
  }

  export interface SkillLoadoutBlueprint {
    skillId: string;
    active?: boolean;
  }

  export interface SkillDeckConfig {
    limits: { [slot: string]: number }; // slot limits like { movement: 4 }
    defaultLoadout: string[]; // default skill IDs to equip
  }

  export const CoreSkillDeckConfig: SkillDeckConfig = {
    limits: { movement: 6, utility: 2, ultimate: 1 },
    defaultLoadout: [] // Start with no skills selected - user must choose
  };

  const HAND_SLOTS = 8; // Max skills in movement slot for now

  function generateSlotId(index: number): string {
    return 'skill-slot-' + index;
  }

  export function expandSkillLoadout(config: SkillDeckConfig): SkillLoadoutEntry[] {
    const loadout: SkillLoadoutEntry[] = [];
    const allSkills = Jamble.getCoreSkillDefinitions();
    
    allSkills.forEach(descriptor => {
      const id = generateSlotId(loadout.length);
      const isActive = config.defaultLoadout.includes(descriptor.id);
      
      loadout.push({
        id,
        skillId: descriptor.id,
        name: descriptor.name,
        type: descriptor.type,
        symbol: descriptor.symbol,
        active: isActive
      });
    });
    
    return loadout;
  }

  export function deriveSkillsSettings(config: SkillDeckConfig): SkillsSettings {
    const loadout: SkillSlotConfig[] = [];
    const defaultActiveSkills = config.defaultLoadout.slice();

    // Create slots up to the movement limit
    const slotLimit = config.limits.movement || 4;
    for (let i = 0; i < slotLimit; i++){
      const slotId = generateSlotId(i);
      const skillId = defaultActiveSkills[i] || null;
      
      loadout.push({
        slotId,
        skillId,
        active: skillId !== null
      });
    }

    return { 
      loadout,
      configs: {} // Start with empty configs, will be populated by user preferences
    };
  }
}