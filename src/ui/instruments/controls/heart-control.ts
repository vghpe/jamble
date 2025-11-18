/// <reference path="control-base.ts" />

namespace Jamble {
  /**
   * Heart Control - Button with limited uses.
   * Provides heart functionality with usage tracking.
   */
  export class HeartControl extends ControlBase {
    private static readonly MAX_USES: number = 3;
    private usesRemaining!: number;
    private button!: HTMLElement;
    private usesDisplay!: HTMLElement;
    private isDisabled: boolean = false;

    constructor(config: ControlConfig) {
      super(config);
    }

    protected initializeElement(): void {
      // Initialize uses before creating elements
      this.usesRemaining = HeartControl.MAX_USES;
      
      this.button = document.createElement('button');
      this.button.className = 'module-button';
      this.button.textContent = '❤️';
      
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
      this.usesRemaining = HeartControl.MAX_USES;
      this.updateUsesDisplay();
      this.isDisabled = false;
      this.button.classList.remove('depleted');
    }
  }
}
