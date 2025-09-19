namespace Jamble {
  export type Mode = 'idle' | 'pingpong';

  export interface SettingsShape {
    jumpStrength: number;
    gravityUp: number;
    gravityMid: number;
    gravityDown: number;
    playerSpeed: number;
    dashSpeed: number;
    dashDurationMs: number;
    startFreezeTime: number;
    deathFreezeTime: number;
    showResetDelayMs: number;
    shuffleEnabled: boolean;
    shuffleLimit: number;
    playerStartOffset: number;
    deathWiggleDistance: number;
    treeEdgeMarginPct: number;
    treeMinGapPct: number;
    mode: Mode;
    squashEnabled: boolean;
    stretchFactor: number;
    squashFactor: number;
    landSquashDurationMs: number;
    landScaleY: number;
    landScaleX: number;
    airTransformSmoothingMs: number;
    landEaseMs: number;
  }

  export interface SkillsProfile {
    loadout: { movement: string[]; utility: string[]; ultimate: string[] };
    configs: { [skillId: string]: any };
  }

  const embeddedDefaults: SettingsShape = {
    jumpStrength: 7,
    gravityUp: 0.32,
    gravityMid: 0.4,
    gravityDown: 0.65,
    playerSpeed: 130,
    dashSpeed: 280,
    dashDurationMs: 220,
    startFreezeTime: 3000,
    deathFreezeTime: 500,
    showResetDelayMs: 150,
    shuffleEnabled: true,
    shuffleLimit: 3,
    playerStartOffset: 10,
    deathWiggleDistance: 1,
    treeEdgeMarginPct: 10,
    treeMinGapPct: 20,
    mode: 'idle',
    squashEnabled: true,
    stretchFactor: 0.05,
    squashFactor: 0.02,
    landSquashDurationMs: 150,
    landScaleY: 0.6,
    landScaleX: 1.4,
    airTransformSmoothingMs: 100,
    landEaseMs: 100
  };

  function defaultSkills(): SkillsProfile {
    return {
      loadout: { movement: ['move','jump','dash'], utility: [], ultimate: [] },
      configs: {
        jump: { strength: embeddedDefaults.jumpStrength },
        dash: { speed: embeddedDefaults.dashSpeed, durationMs: embeddedDefaults.dashDurationMs, cooldownMs: 150 }
      }
    };
  }

  export class SettingsStore {
    private _current: SettingsShape;
    private _skills: SkillsProfile;

    constructor(initial?: Partial<SettingsShape>, skills?: Partial<SkillsProfile>){
      this._current = { ...embeddedDefaults, ...(initial ?? {}) };
      const baseSkills = defaultSkills();
      this._skills = {
        loadout: {
          movement: skills?.loadout?.movement ? skills.loadout.movement.slice() : baseSkills.loadout.movement.slice(),
          utility: skills?.loadout?.utility ? skills.loadout.utility.slice() : baseSkills.loadout.utility.slice(),
          ultimate: skills?.loadout?.ultimate ? skills.loadout.ultimate.slice() : baseSkills.loadout.ultimate.slice()
        },
        configs: { ...baseSkills.configs, ...(skills?.configs || {}) }
      };
    }

    get current(): SettingsShape { return this._current; }
    get skills(): SkillsProfile { return this._skills; }

    update(patch: Partial<SettingsShape>): void {
      this._current = { ...this._current, ...patch };
    }

    reset(): void {
      this._current = { ...embeddedDefaults };
      this._skills = defaultSkills();
    }

    toJSON(): any {
      return {
        game: { ...this._current },
        skills: {
          loadout: {
            movement: this._skills.loadout.movement.slice(),
            utility: this._skills.loadout.utility.slice(),
            ultimate: this._skills.loadout.ultimate.slice()
          },
          configs: { ...this._skills.configs }
        }
      };
    }
  }

  export const Settings = new SettingsStore();
}
