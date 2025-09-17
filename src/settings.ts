/// <reference path="./elements/types.ts" />
/// <reference path="./elements/deck-config.ts" />
namespace Jamble {
  export type Mode = 'idle' | 'pingpong';

  export interface SettingsShape {
    // Core physics/movement
    jumpStrength: number;
    gravityUp: number;
    gravityMid: number;
    gravityDown: number;
    playerSpeed: number;

    // Dash
    dashSpeed: number;
    dashDurationMs: number;

    // Flow + UI timings
    startFreezeTime: number;
    deathFreezeTime: number;
    showResetDelayMs: number;
    shuffleEnabled: boolean;
    shuffleLimit: number;

    // Geometry
    playerStartOffset: number;
    deathWiggleDistance: number;

    // Level generation (trees)
    treeEdgeMarginPct: number;
    treeMinGapPct: number;

    // Gameplay mode
    mode: Mode; // 'idle' waits at edges, 'pingpong' reverses immediately

    // Animation controls
    squashEnabled: boolean;
    stretchFactor: number; // scaleY = 1 + velocityUp * stretchFactor
    squashFactor: number;  // scaleX = 1 - velocityUp * squashFactor
    landSquashDurationMs: number;
    landScaleY: number; // landing squash vertical scale
    landScaleX: number; // landing squash horizontal scale

    // Timing (smoothing/ease) — physics remain authoritative
    airTransformSmoothingMs: number; // in-air transform transition smoothing
    landEaseMs: number;              // transition time when returning to normal after landing
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
    landEaseMs: 100,
  };

  export class SettingsStore {
    private _current: SettingsShape;
    private _loadedFrom: string | null = null;
    private _activeName: string | null = null;
    private _profileBaseline: SettingsShape | null = null;
    private _skills: SkillsProfile = { loadout: { movement: ['move','jump','dash'], utility: [], ultimate: [] }, configs: {} };
    private _skillsBaseline: SkillsProfile | null = null;
    private _elements: ElementsSettings = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
    private _elementsBaseline: ElementsSettings | null = null;

    constructor(initial?: Partial<SettingsShape>){
      this._current = { ...embeddedDefaults, ...(initial ?? {}) };
    }

    get elements(): ElementsSettings {
      return {
        deck: this._elements.deck.map(card => ({ ...card })),
        hand: this._elements.hand.map(slot => ({ ...slot }))
      };
    }

    get current(): SettingsShape { return this._current; }
    get source(): string | null { return this._loadedFrom; }
    get activeName(): string | null { return this._activeName; }
    get skills(): SkillsProfile { return this._skills; }

    update(patch: Partial<SettingsShape>): void {
      this._current = { ...this._current, ...patch };
    }

    reset(): void {
      this._current = { ...embeddedDefaults };
      this._skills = { loadout: { movement: ['move','jump','dash'], utility: [], ultimate: [] }, configs: {} };
      this._elements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
    }

    /** Marks the current settings as the active profile baseline, with an optional name label. */
    markBaseline(name: string | null): void {
      this._activeName = name;
      this._profileBaseline = { ...this._current };
      // deep copy skills baseline
      this._skillsBaseline = {
        loadout: {
          movement: [...(this._skills.loadout.movement || [])],
          utility: [...(this._skills.loadout.utility || [])],
          ultimate: [...(this._skills.loadout.ultimate || [])],
        },
        configs: JSON.parse(JSON.stringify(this._skills.configs || {}))
      };
      this._elementsBaseline = {
        deck: this._elements.deck.map(card => ({ ...card })),
        hand: this._elements.hand.map(slot => ({ ...slot }))
      };
    }

    /** Revert current settings to the active profile baseline, if any. */
    revertToProfile(): void {
      if (this._profileBaseline){ this._current = { ...this._profileBaseline }; }
      if (this._skillsBaseline){
        // deep copy back
        this._skills = {
          loadout: {
            movement: [...(this._skillsBaseline.loadout.movement || [])],
            utility: [...(this._skillsBaseline.loadout.utility || [])],
            ultimate: [...(this._skillsBaseline.loadout.ultimate || [])],
          },
          configs: JSON.parse(JSON.stringify(this._skillsBaseline.configs || {}))
        };
      }
      if (this._elementsBaseline){
        this._elements = {
          deck: this._elementsBaseline.deck.map(card => ({ ...card })),
          hand: this._elementsBaseline.hand.map(slot => ({ ...slot }))
        };
      }
    }

    async loadFrom(url: string): Promise<void> {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const skills = (data && data.skills) || null;
        this._current = { ...embeddedDefaults, ...(data && data.game ? data.game : data) };
        // Migrate or load skills section
        if (skills && skills.loadout && skills.configs){
          this._skills = { loadout: skills.loadout, configs: skills.configs };
        } else {
          // Derive minimal configs from legacy fields
          this._skills = { loadout: { movement: ['move','jump','dash'], utility: [], ultimate: [] }, configs: {
            jump: { strength: this._current.jumpStrength },
            dash: { speed: (this._current as any).dashSpeed ?? 280, durationMs: (this._current as any).dashDurationMs ?? 220, cooldownMs: 150 }
          }};
        }
        this._elements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
        this._loadedFrom = url;
        // Derive a simple active name from the URL path (filename)
        try {
          const u = new URL(url, (typeof location !== 'undefined' ? location.href : undefined));
          const parts = u.pathname.split('/');
          this._activeName = parts[parts.length - 1] || url;
        } catch(_e){ this._activeName = url; }
        this._profileBaseline = { ...this._current };
      } catch(_err){
        // Fallback silently to embedded
        this._current = { ...embeddedDefaults };
        this._loadedFrom = null;
        this._activeName = null;
        this._profileBaseline = { ...this._current };
        this._skills = { loadout: { movement: ['move','jump','dash'], utility: [], ultimate: [] }, configs: { jump: { strength: this._current.jumpStrength }, dash: { speed: 280, durationMs: 220, cooldownMs: 150 } } };
        this._elements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
      }
    }

    setElements(next: ElementsSettings): void {
        this._elements = Jamble.deriveElementsSettings(Jamble.CoreDeckConfig);
    }

    toJSON(): any {
      return {
        // keep legacy flat fields for now for compatibility
        ...this._current,
        // new structured sections
        game: { ...this._current },
        skills: { loadout: this._skills.loadout, configs: this._skills.configs },
        elements: {
          deck: this._elements.deck.map(card => ({ ...card })),
          hand: this._elements.hand.map(slot => ({ ...slot }))
        }
      };
    }
  }

  // Global settings singleton for convenience
  export const Settings = new SettingsStore();
}
