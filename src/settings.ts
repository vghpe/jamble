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
    landScaleY: number; // landing squash vertical scale
    landScaleX: number; // landing squash horizontal scale

    // Timing (smoothing/ease) — physics remain authoritative
    airTransformSmoothingMs: number; // in-air transform transition smoothing
    landEaseMs: number;              // transition time when returning to normal after landing
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

    constructor(initial?: Partial<SettingsShape>){
      this._current = { ...embeddedDefaults, ...(initial ?? {}) };
    }

    get current(): SettingsShape { return this._current; }
    get source(): string | null { return this._loadedFrom; }
    get activeName(): string | null { return this._activeName; }

    update(patch: Partial<SettingsShape>): void {
      this._current = { ...this._current, ...patch };
    }

    reset(): void { this._current = { ...embeddedDefaults }; }

    /** Marks the current settings as the active profile baseline, with an optional name label. */
    markBaseline(name: string | null): void {
      this._activeName = name;
      this._profileBaseline = { ...this._current };
    }

    /** Revert current settings to the active profile baseline, if any. */
    revertToProfile(): void {
      if (this._profileBaseline){
        this._current = { ...this._profileBaseline };
      }
    }

    async loadFrom(url: string): Promise<void> {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        this._current = { ...embeddedDefaults, ...data };
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
      }
    }

    toJSON(): SettingsShape { return { ...this._current }; }
  }

  // Global settings singleton for convenience
  export const Settings = new SettingsStore();
}
