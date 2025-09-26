namespace Jamble {
  export type Mode = 'idle' | 'pingpong';

  export interface SettingsShape {
    gravityUp: number;
    gravityMid: number;
    gravityDown: number;
    playerSpeed: number;
    startFreezeTime: number;
    deathFreezeTime: number;
    showResetDelayMs: number;
    playerStartOffset: number;
    deathWiggleDistance: number;
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

  const embeddedDefaults: SettingsShape = {
    gravityUp: 0.32,
    gravityMid: 0.4,
    gravityDown: 0.65,
    playerSpeed: 130,
    startFreezeTime: 3000,
    deathFreezeTime: 500,
    showResetDelayMs: 150,
    playerStartOffset: 10,
    deathWiggleDistance: 1,
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

  export class SettingsStore {
    private _current: SettingsShape;

    constructor(initial?: Partial<SettingsShape>){
      this._current = { ...embeddedDefaults, ...(initial ?? {}) };
    }

    get current(): SettingsShape { return this._current; }

    update(patch: Partial<SettingsShape>): void {
      this._current = { ...this._current, ...patch };
    }

    reset(): void {
      this._current = { ...embeddedDefaults };
    }

    toJSON(): any {
      return {
        game: { ...this._current }
      };
    }
  }

  export const Settings = new SettingsStore();
}
