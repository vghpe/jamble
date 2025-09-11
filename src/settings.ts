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
    playerStartOffset: 10,
    deathWiggleDistance: 1,
    treeEdgeMarginPct: 10,
    treeMinGapPct: 20,
    mode: 'idle',
    squashEnabled: true,
    stretchFactor: 0.05,
    squashFactor: 0.02,
    landSquashDurationMs: 150,
  };

  export class SettingsStore {
    private _current: SettingsShape;
    private _loadedFrom: string | null = null;

    constructor(initial?: Partial<SettingsShape>){
      this._current = { ...embeddedDefaults, ...(initial ?? {}) };
    }

    get current(): SettingsShape { return this._current; }
    get source(): string | null { return this._loadedFrom; }

    update(patch: Partial<SettingsShape>): void {
      this._current = { ...this._current, ...patch };
    }

    reset(): void { this._current = { ...embeddedDefaults }; }

    async loadFrom(url: string): Promise<void> {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        this._current = { ...embeddedDefaults, ...data };
        this._loadedFrom = url;
      } catch(_err){
        // Fallback silently to embedded
        this._current = { ...embeddedDefaults };
        this._loadedFrom = null;
      }
    }

    toJSON(): SettingsShape { return { ...this._current }; }
  }

  // Global settings singleton for convenience
  export const Settings = new SettingsStore();
}

