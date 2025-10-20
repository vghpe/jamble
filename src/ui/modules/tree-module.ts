/// <reference path="module-base.ts" />

namespace Jamble {
  /**
   * Tree Module - Button for placing trees with limited uses.
   */
  export class TreeModule extends ControlModule {
    private static readonly MAX_USES: number = 2;
    private usesRemaining!: number;
    private button!: HTMLElement;
    private usesDisplay!: HTMLElement;

    constructor(config: ModuleConfig) {
      super(config);
    }

    protected createElement(): HTMLElement {
      // Initialize uses before creating elements
      this.usesRemaining = TreeModule.MAX_USES;
      
      const element = this.createBaseElement();
      
      this.button = document.createElement('button');
      this.button.className = 'module-button';
      this.button.textContent = '🌲';
      
      this.usesDisplay = document.createElement('div');
      this.usesDisplay.className = 'module-uses';
      this.updateUsesDisplay();
      
      this.button.appendChild(this.usesDisplay);
      element.appendChild(this.button);
      
      this.setupInteraction();
      
      return element;
    }

    private setupInteraction(): void {
      this.button.addEventListener('mousedown', () => this.handlePress());
      this.button.addEventListener('mouseup', () => this.handleRelease());
      this.button.addEventListener('mouseleave', () => this.handleRelease());
      this.button.addEventListener('click', () => this.handleClick());
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
      if (this.usesRemaining < TreeModule.MAX_USES) {
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
      this.usesRemaining = TreeModule.MAX_USES;
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
      this.button.style.borderColor = active ? '#ff0000' : '';
      this.button.style.borderWidth = active ? '2px' : '';
      this.button.style.borderStyle = active ? 'solid' : '';
    }
  }
}
