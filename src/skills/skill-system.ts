/// <reference path="../entities/player/player.ts" />

namespace Jamble {
  export interface Skill {
    id: string;
    name: string;
    execute(player: Player): void;
  }

  export class MoveSkill implements Skill {
    id = 'move';
    name = 'Move';
    
    execute(player: Player) {
      // Movement is handled via input system
      // This skill just enables the capability
    }
  }

  export class JumpSkill implements Skill {
    id = 'jump';
    name = 'Jump';
    
    execute(player: Player) {
      player.jump();
    }
  }

  export class SkillManager {
    private equippedSkills: Map<string, Skill> = new Map();
    
    constructor() {
      // Auto-equip basic skills for now
      this.equipSkill(new MoveSkill());
      this.equipSkill(new JumpSkill());
    }

    equipSkill(skill: Skill) {
      this.equippedSkills.set(skill.id, skill);
    }

    hasSkill(id: string): boolean {
      return this.equippedSkills.has(id);
    }

    useSkill(id: string, player: Player) {
      const skill = this.equippedSkills.get(id);
      if (skill) {
        skill.execute(player);
      }
    }

    getEquippedSkills(): Skill[] {
      return Array.from(this.equippedSkills.values());
    }
  }
}