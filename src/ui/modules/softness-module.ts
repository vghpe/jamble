/// <reference path="module-base.ts" />

namespace Jamble {
  /**
   * Softness Module - Horizontal slider controlling player roundness/squareness.
   * Range: 0 (square) to 1 (round)
   */
  export class SoftnessModule extends ControlModule {
    private static readonly DEFAULT_VALUE: number = 0.5;
    private value!: number;
    private slider!: HTMLInputElement;
    private label!: HTMLElement;
    private valueDisplay!: HTMLElement;

    constructor(config: ModuleConfig) {
      super(config);
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
      this.slider.value = String(this.value * 100);
      
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
      this.value = parseInt(this.slider.value) / 100;
      this.updateValueDisplay();
    }

    private updateValueDisplay(): void {
      this.valueDisplay.textContent = this.value.toFixed(2);
    }

    protected resetState(): void {
      this.value = SoftnessModule.DEFAULT_VALUE;
      this.slider.value = String(this.value * 100);
      this.updateValueDisplay();
    }

    /**
     * Get current softness value (0-1)
     */
    getValue(): number {
      return this.value;
    }
  }
}
