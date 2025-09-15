/// <reference path="./types.ts" />
namespace Jamble {
  export interface SkillDescriptor {
    id: string;
    name: string;
    slot: SkillSlot;
    priority?: number;
    prerequisites?: string[]; // skill ids that must be equipped
    excludes?: string[];      // skill ids that cannot co-exist
    create: () => Skill;      // factory returning a fresh Skill instance
  }

  export interface SlotLimits { [slot: string]: number }

  export class SkillManager {
    private registry = new Map<string, SkillDescriptor>();
    private equipped = new Map<string, Skill>(); // id -> skill instance
    private slotCounts = new Map<SkillSlot, number>();
    private slotLimits: SlotLimits;
    public lastError: string | null = null;
    private caps: PlayerCapabilities;

    constructor(caps: PlayerCapabilities, limits?: Partial<SlotLimits>){
      this.caps = caps;
      this.slotLimits = { movement: 2, utility: 2, ultimate: 1, ...(limits || {}) } as SlotLimits;
    }

    register(desc: SkillDescriptor): void {
      this.registry.set(desc.id, desc);
    }

    getAvailable(): SkillDescriptor[] { return Array.from(this.registry.values()); }
    getEquipped(): Skill[] { return Array.from(this.equipped.values()); }

    isEquipped(id: string): boolean { return this.equipped.has(id); }

    private countInSlot(slot: SkillSlot): number {
      let n = 0; for (const s of this.equipped.values()) if (s.slot === slot) n++; return n;
    }

    private canEquip(desc: SkillDescriptor): boolean {
      // slot capacity
      const cap = (this.slotLimits as any)[desc.slot] ?? 0;
      if (this.countInSlot(desc.slot) >= cap){ this.lastError = `No free ${desc.slot} slots`; return false; }
      // prerequisites
      if (desc.prerequisites && desc.prerequisites.some(id => !this.equipped.has(id))){
        this.lastError = `Missing prerequisites for ${desc.id}`; return false;
      }
      // excludes
      if (desc.excludes && desc.excludes.some(id => this.equipped.has(id))){
        this.lastError = `Cannot equip ${desc.id} with excluded skill present`; return false;
      }
      this.lastError = null; return true;
    }

    equip(id: string): boolean {
      const desc = this.registry.get(id); if (!desc){ this.lastError = `Unknown skill ${id}`; return false; }
      if (this.equipped.has(id)) return true;
      if (!this.canEquip(desc)) return false;
      const inst = desc.create();
      try { inst.onEquip && inst.onEquip(this.caps); } catch(_){}
      this.equipped.set(id, inst);
      return true;
    }

    unequip(id: string): boolean {
      const inst = this.equipped.get(id); if (!inst) return true;
      try { inst.onUnequip && inst.onUnequip(); } catch(_){}
      this.equipped.delete(id);
      return true;
    }

    clear(): void { for (const id of Array.from(this.equipped.keys())) this.unequip(id); }

    handleInput(intent: InputIntent, ctx: SkillContext): boolean {
      // Sort equipped by priority descending
      const list = Array.from(this.equipped.values()).sort((a,b) => (b.priority||0) - (a.priority||0));
      for (const s of list){
        if (s.onInput && s.onInput(intent, ctx, this.caps)) return true;
      }
      return false;
    }

    tick(ctx: SkillContext): void { for (const s of this.equipped.values()) if (s.onTick) s.onTick(ctx, this.caps); }
    onLand(ctx: SkillContext): void { for (const s of this.equipped.values()) if (s.onLand) s.onLand(ctx, this.caps); }
  }
}

