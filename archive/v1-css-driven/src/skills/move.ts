/// <reference path="./types.ts" />
namespace Jamble {
  // MoveSkill: placeholder for enabling horizontal auto-run.
  // Step 1: Define skill; Step 2 will gate movement on being equipped.
  export class MoveSkill implements Skill {
    readonly id: string; readonly name: string = 'Move'; readonly slot: SkillSlot = 'movement'; readonly priority: number;
    constructor(id: string = 'move', priority = 5){ this.id = id; this.priority = priority; }
    // No input handling; movement is managed by Game loop and will be gated in Phase 2.
  }
}

