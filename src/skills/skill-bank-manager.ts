/// <reference path="./types.ts" />
/// <reference path="./registry/core-skills.ts" />
/// <reference path="./registry/skill-deck-config.ts" />

namespace Jamble {
  export interface SkillBankView {
    id: string;
    name: string;
    type: string;
    symbol: string;
    active: boolean;
  }

  export interface SkillSlotView {
    slotId: string;
    skillId: string | null;
    name?: string;
    symbol?: string;
    active: boolean;
  }

  export class SkillBankManager {
    private slotLimit: number;
    private activeSkills: Set<string> = new Set();
    private slotAssignments: Map<string, string | null> = new Map(); // slotId -> skillId
    private config: SkillDeckConfig;

    constructor(config: SkillDeckConfig = CoreSkillDeckConfig) {
      this.config = config;
      this.slotLimit = config.limits.movement || 4;
      this.initializeSlots();
      this.applyDefaultLoadout();
    }

    private initializeSlots(): void {
      for (let i = 0; i < this.slotLimit; i++) {
        const slotId = 'skill-slot-' + i;
        this.slotAssignments.set(slotId, null);
      }
    }

    private applyDefaultLoadout(): void {
      const defaultSkills = this.config.defaultLoadout.slice(0, this.slotLimit);
      const slotIds = Array.from(this.slotAssignments.keys());
      
      defaultSkills.forEach((skillId, index) => {
        if (index < slotIds.length) {
          const slotId = slotIds[index];
          this.slotAssignments.set(slotId, skillId);
          this.activeSkills.add(skillId);
        }
      });
    }

    getBankView(): SkillBankView[] {
      const allSkills = getCoreSkillDefinitions();
      return allSkills.map(desc => ({
        id: desc.id,
        name: desc.name,
        type: desc.type,
        symbol: desc.symbol,
        active: this.activeSkills.has(desc.id)
      }));
    }

    getSlotView(): SkillSlotView[] {
      const result: SkillSlotView[] = [];
      const allSkills = getCoreSkillDefinitions();
      const skillMap = new Map(allSkills.map(s => [s.id, s]));

      for (const [slotId, skillId] of this.slotAssignments) {
        const skill = skillId ? skillMap.get(skillId) : null;
        result.push({
          slotId,
          skillId,
          name: skill?.name,
          symbol: skill?.symbol,
          active: skillId !== null
        });
      }

      return result.sort((a, b) => a.slotId.localeCompare(b.slotId));
    }

    setActive(skillId: string, active: boolean): boolean {
      const skill = getCoreSkillDefinition(skillId);
      if (!skill) return false;

      if (active) {
        return this.addSkillToSlot(skillId);
      } else {
        return this.removeSkillFromSlot(skillId);
      }
    }

    private addSkillToSlot(skillId: string): boolean {
      // Check if already active
      if (this.activeSkills.has(skillId)) return true;

      // Check slot capacity
      if (this.activeSkills.size >= this.slotLimit) return false;

      // Find first empty slot
      for (const [slotId, currentSkillId] of this.slotAssignments) {
        if (currentSkillId === null) {
          this.slotAssignments.set(slotId, skillId);
          this.activeSkills.add(skillId);
          return true;
        }
      }

      return false; // No empty slots
    }

    private removeSkillFromSlot(skillId: string): boolean {
      if (!this.activeSkills.has(skillId)) return true;

      // Find and remove from slot
      for (const [slotId, currentSkillId] of this.slotAssignments) {
        if (currentSkillId === skillId) {
          this.slotAssignments.set(slotId, null);
          this.activeSkills.delete(skillId);
          return true;
        }
      }

      return false;
    }

    getActiveSkillIds(): string[] {
      return Array.from(this.activeSkills);
    }

    getSlotLimit(): number {
      return this.slotLimit;
    }

    // Convert current state to settings format for persistence
    toSettingsFormat(): { loadout: SkillSlotConfig[] } {
      const loadout: SkillSlotConfig[] = [];
      
      for (const [slotId, skillId] of this.slotAssignments) {
        loadout.push({
          slotId,
          skillId,
          active: skillId !== null
        });
      }

      return { loadout };
    }

    // Load from settings format
    fromSettingsFormat(settings: { loadout?: SkillSlotConfig[] }): void {
      if (!settings.loadout) return;

      // Clear current state
      this.activeSkills.clear();
      for (const slotId of this.slotAssignments.keys()) {
        this.slotAssignments.set(slotId, null);
      }

      // Apply saved loadout
      settings.loadout.forEach(config => {
        if (config.active && config.skillId) {
          this.slotAssignments.set(config.slotId, config.skillId);
          this.activeSkills.add(config.skillId);
        }
      });
    }
  }
}