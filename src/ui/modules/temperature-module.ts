/// <reference path="module-base.ts" />

namespace Jamble {
  /**
   * Temperature Module - Horizontal slider controlling player heat.
   * Range: -1 (blue/cold) to +1 (yellow/hot), 0 is neutral
   */
  export class TemperatureModule extends ControlModule {
    private static readonly DEFAULT_VALUE: number = 0; // Center position = neutral
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
        this.player.setTemperature(this.value);
      }
    }

    protected createElement(): HTMLElement {
      // Initialize value before creating elements
      this.value = TemperatureModule.DEFAULT_VALUE;
      
      const element = this.createBaseElement();
      element.classList.add('module-slider');
      
      this.label = document.createElement('div');
      this.label.className = 'module-label';
      this.label.textContent = 'TEMP';
      
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
        this.player.setTemperature(this.value);
      }
    }

    private updateValueDisplay(): void {
      this.valueDisplay.textContent = this.value.toFixed(2);
    }

    protected resetState(): void {
      this.value = TemperatureModule.DEFAULT_VALUE;
      this.slider.value = String((this.value + 1) * 50);
      this.updateValueDisplay();
      
      // Update player if connected
      if (this.player) {
        this.player.setTemperature(this.value);
      }
    }

    /**
     * Get current temperature value (-1 to +1)
     */
    getValue(): number {
      return this.value;
    }
  }
}
