namespace Jamble {
  export type GameState = 'transition' | 'idle' | 'run';
  export type EditorMode = 'none' | 'tree-placement';

  export class StateManager {
    private currentState: GameState = 'transition';
    private editorMode: EditorMode = 'none';
    private stateStartTime: number = 0;

    constructor() {
      this.currentState = 'transition';
      this.stateStartTime = Date.now();
    }

    getCurrentState(): GameState {
      return this.currentState;
    }

    getStateTime(): number {
      return Date.now() - this.stateStartTime;
    }

    // State check methods
    isTransition(): boolean {
      return this.currentState === 'transition';
    }

    isIdle(): boolean {
      return this.currentState === 'idle';
    }

    isRunning(): boolean {
      return this.currentState === 'run';
    }

    // State transition methods
    enterTransition(): void {
      this.setState('transition');
    }

    enterIdle(): void {
      this.setState('idle');
    }

    startRun(): boolean {
      if (this.currentState === 'idle') {
        this.setState('run');
        return true;
      }
      return false;
    }

    returnToIdle(): void {
      this.enterTransition();
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