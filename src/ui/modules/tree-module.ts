/// <reference path="module-base.ts" />

namespace Jamble {
  /**
   * Tree Module - Button for placing trees with limited uses.
   */
  export class TreeModule extends ControlModule {
    private static readonly MAX_USES: number = 5;
    private usesRemaining!: number;
    private button!: HTMLElement;
    private usesDisplay!: HTMLElement;
    private isPressed: boolean = false;

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
        this.isPressed = true;
        this.button.classList.add('pressed');
      }
    }

    private handleRelease(): void {
      this.isPressed = false;
      this.button.classList.remove('pressed');
    }

    private handleClick(): void {
      if (this.usesRemaining > 0) {
        this.usesRemaining--;
        this.updateUsesDisplay();
        console.log(`Tree placed! Remaining: ${this.usesRemaining}`);
        
        if (this.usesRemaining === 0) {
          this.button.classList.add('depleted');
        }
      } else {
        console.log('Tree depleted - no uses remaining');
      }
    }

    private updateUsesDisplay(): void {
      this.usesDisplay.textContent = `${this.usesRemaining}`;
    }

    protected resetState(): void {
      this.usesRemaining = TreeModule.MAX_USES;
      this.updateUsesDisplay();
      this.button.classList.remove('depleted');
      console.log('Tree module reset');
    }
  }
}
