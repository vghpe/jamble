/// <reference path="control-base.ts" />

namespace Jamble {
  /**
   * Tree Module - Button for placing trees with limited uses.
   */
  export class TreePlacementControl extends InstrumentControl {
    private static readonly MAX_USES: number = 2;
    private usesRemaining!: number;
    private button!: HTMLElement;
    private usesDisplay!: HTMLElement;

    constructor(config: ControlConfig) {
      super(config);
    }

    protected initializeElement(): void {
      // Initialize uses before creating elements
      this.usesRemaining = TreePlacementControl.MAX_USES;
      
      this.button = document.createElement('button');
      this.button.className = 'module-button';
      this.button.textContent = '🌲';
      
      this.usesDisplay = document.createElement('div');
      this.usesDisplay.className = 'module-uses';
      this.updateUsesDisplay();
      
      this.button.appendChild(this.usesDisplay);
      this.container.appendChild(this.button);
      
      this.setupInteraction();
    }

    private setupInteraction(): void {
      this.button.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.handlePress();
        this.handleClick();
      });
      this.button.addEventListener('pointerup', () => this.handleRelease());
      this.button.addEventListener('pointerleave', () => this.handleRelease());
    }

    private handlePress(): void {
      if (this.usesRemaining > 0) {
        this.button.classList.add('pressed');
      }
    }

    private handleRelease(): void {
      this.button.classList.remove('pressed');
    }

    private handleClick(): void {
      // Toggle tree placement edit mode
      window.dispatchEvent(new CustomEvent('jamble:tree-module-clicked'));
    }

    /**
     * Use a tree (decrement count)
     */
    public useTree(): boolean {
      if (this.usesRemaining > 0) {
        this.usesRemaining--;
        this.updateUsesDisplay();
        return true;
      }
      return false;
    }

    /**
     * Return a tree (increment count)
     */
    public returnTree(): void {
      if (this.usesRemaining < TreePlacementControl.MAX_USES) {
        this.usesRemaining++;
        this.updateUsesDisplay();
      }
    }

    /**
     * Get remaining tree count
     */
    public getUsesRemaining(): number {
      return this.usesRemaining;
    }

    private updateUsesDisplay(): void {
      this.usesDisplay.textContent = `${this.usesRemaining}`;
    }

    protected resetState(): void {
      this.usesRemaining = TreePlacementControl.MAX_USES;
      this.updateUsesDisplay();
    }

    /**
     * Stay active during tree placement mode
     */
    protected shouldStayActiveInEditorMode(mode: string): boolean {
      return mode === 'tree-placement';
    }

    /**
     * Update visual state when entering/exiting edit mode
     */
    public setEditMode(active: boolean): void {
      // No additional styling needed - the module already has blue dotted border
      // Just keep the module visually consistent
    }
  }
}
