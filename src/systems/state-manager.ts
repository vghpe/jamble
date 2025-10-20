namespace Jamble {
  export type GameState = 'idle' | 'countdown' | 'run';
  export type EditorMode = 'none' | 'tree-placement';

  export class StateManager {
    private currentState: GameState = 'idle';
    private editorMode: EditorMode = 'none';
    private stateStartTime: number = 0;
    private countdownDuration: number = 3000; // 3 seconds

    constructor() {
      this.currentState = 'idle';
      this.stateStartTime = Date.now();
    }

    getCurrentState(): GameState {
      return this.currentState;
    }

    getStateTime(): number {
      return Date.now() - this.stateStartTime;
    }

    getCountdownTimeRemaining(): number {
      if (this.currentState !== 'countdown') return 0;
      return Math.max(0, this.countdownDuration - this.getStateTime());
    }

    getCountdownSeconds(): number {
      return Math.ceil(this.getCountdownTimeRemaining() / 1000);
    }

    // State check methods
    isIdle(): boolean {
      return this.currentState === 'idle';
    }

    isCountdown(): boolean {
      return this.currentState === 'countdown';
    }

    isRunning(): boolean {
      return this.currentState === 'run';
    }

    // State transition methods
    startCountdown(): boolean {
      if (this.currentState === 'idle') {
        this.setState('countdown');
        return true;
      }
      return false;
    }

    startRun(): boolean {
      if (this.currentState === 'countdown') {
        this.setState('run');
        return true;
      }
      return false;
    }

    returnToIdle(): void {
      this.setState('idle');
    }

    // Debug method to directly set run state
    forceRunState(): void {
      this.setState('run');
    }

    // Editor mode methods
    getEditorMode(): EditorMode {
      return this.editorMode;
    }

    isInEditorMode(): boolean {
      return this.editorMode !== 'none';
    }

    enterTreePlacementMode(): void {
      if (this.editorMode !== 'tree-placement') {
        this.editorMode = 'tree-placement';
        window.dispatchEvent(new CustomEvent('jamble:editor-mode-change', {
          detail: { mode: 'tree-placement' }
        }));
      }
    }

    exitEditorMode(): void {
      if (this.editorMode !== 'none') {
        this.editorMode = 'none';
        window.dispatchEvent(new CustomEvent('jamble:editor-mode-change', {
          detail: { mode: 'none' }
        }));
      }
    }

    private setState(newState: GameState): void {
      if (this.currentState === newState) return;

      const oldState = this.currentState;
      this.currentState = newState;
      this.stateStartTime = Date.now();
    }
  }
}