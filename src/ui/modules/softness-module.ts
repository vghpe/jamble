/// <reference path="module-base.ts" />

namespace Jamble {
  /**
   * Softness Module - Horizontal slider controlling player roundness/squareness.
   * Range: -1 (square) to +1 (circle), 0 is default
   */
  export class SoftnessModule extends ControlModule {
    private static readonly DEFAULT_VALUE: number = 0; // Center position = current player look
    private value!: number;
    private slider!: HTMLInputElement;
    private label!: HTMLElement;
    private valueDisplay!: HTMLElement;
    private player: Player | null = null;

    constructor(config: ModuleConfig) {
      super(config);
    }

    /**
     * Set the player reference so we can update it.
     */
    setPlayer(player: Player): void {
      this.player = player;
      // Set initial player value
      if (this.player) {
        this.player.setSoftness(this.value);
      }
    }

    protected createElement(): HTMLElement {
      // Initialize value before creating elements
      this.value = SoftnessModule.DEFAULT_VALUE;
      
      const element = this.createBaseElement();
      element.classList.add('module-slider');
      
      this.label = document.createElement('div');
      this.label.className = 'module-label';
      this.label.textContent = 'SOFT';
      
      this.slider = document.createElement('input');
      this.slider.type = 'range';
      this.slider.className = 'module-slider-input';
      this.slider.min = '0';
      this.slider.max = '100';
      // Map -1 to +1 range to 0-100 slider (0 = -1, 50 = 0, 100 = +1)
      this.slider.value = String((this.value + 1) * 50);
      
      this.valueDisplay = document.createElement('div');
      this.valueDisplay.className = 'module-value';
      this.updateValueDisplay();
      
      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'slider-container';
      sliderContainer.appendChild(this.slider);
      sliderContainer.appendChild(this.valueDisplay);
      
      element.appendChild(this.label);
      element.appendChild(sliderContainer);
      
      this.setupInteraction();
      
      return element;
    }

    private setupInteraction(): void {
      this.slider.addEventListener('input', () => this.handleInput());
    }

    private handleInput(): void {
      // Map slider 0-100 to value -1 to +1
      this.value = (parseInt(this.slider.value) / 50) - 1;
      this.updateValueDisplay();
      
      // Update player if connected
      if (this.player) {
        this.player.setSoftness(this.value);
      }
    }

    private updateValueDisplay(): void {
      this.valueDisplay.textContent = this.value.toFixed(2);
    }

    protected resetState(): void {
      this.value = SoftnessModule.DEFAULT_VALUE;
      this.slider.value = String((this.value + 1) * 50);
      this.updateValueDisplay();
      
      // Update player if connected
      if (this.player) {
        this.player.setSoftness(this.value);
      }
    }

    /**
     * Get current softness value (-1 to +1)
     */
    getValue(): number {
      return this.value;
    }
  }
}
