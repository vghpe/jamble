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
    private isDisabled: boolean = false;

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
      // Don't allow usage if disabled or depleted
      if (this.isDisabled || this.usesRemaining <= 0) {
        return;
      }
      
      this.usesRemaining--;
      this.updateUsesDisplay();
      
      if (this.usesRemaining === 0) {
        this.button.classList.add('depleted');
      }
      
      // Emit heart use event for knob respawn
      window.dispatchEvent(new CustomEvent('jamble:heart-used'));
    }

    private updateUsesDisplay(): void {
      this.usesDisplay.textContent = `${this.usesRemaining}`;
    }

    /**
     * Enable the heart module (knob is retracted)
     */
    enable(): void {
      this.isDisabled = false;
      this.button.classList.remove('depleted');
      this.updateButtonState();
    }

    /**
     * Disable the heart module (knob is present)
     */
    disable(): void {
      this.isDisabled = true;
      this.button.classList.add('depleted');
    }

    /**
     * Update button visual state based on disabled/depleted status
     */
    private updateButtonState(): void {
      if (this.usesRemaining === 0) {
        this.button.classList.add('depleted');
      }
    }

    protected resetState(): void {
      this.usesRemaining = HeartModule.MAX_USES;
      this.updateUsesDisplay();
      this.isDisabled = false;
      this.button.classList.remove('depleted');
    }
  }
}
