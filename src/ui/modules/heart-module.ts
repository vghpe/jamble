/// <reference path="module-base.ts" />

namespace Jamble {
  /**
   * Heart Module - Button with limited uses.
   * Provides heart functionality with usage tracking.
   */
  export class HeartModule extends ControlModule {
    private static readonly MAX_USES: number = 3;
    private usesRemaining!: number;
    private button!: HTMLElement;
    private usesDisplay!: HTMLElement;

    constructor(config: ModuleConfig) {
      super(config);
    }

    protected createElement(): HTMLElement {
      // Initialize uses before creating elements
      this.usesRemaining = HeartModule.MAX_USES;
      
      const element = this.createBaseElement();
      
      this.button = document.createElement('button');
      this.button.className = 'module-button';
      this.button.textContent = '❤️';
      
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
      if (this.usesRemaining > 0) {
        this.usesRemaining--;
        this.updateUsesDisplay();
        
        if (this.usesRemaining === 0) {
          this.button.classList.add('depleted');
        }
      }
    }

    private updateUsesDisplay(): void {
      this.usesDisplay.textContent = `${this.usesRemaining}`;
    }

    protected resetState(): void {
      this.usesRemaining = HeartModule.MAX_USES;
      this.updateUsesDisplay();
      this.button.classList.remove('depleted');
    }
  }
}
