namespace Jamble {
  /**
   * Crescendo Panel - vertical progress bar showing crescendo level (0-1).
   * Simple display component - value is controlled externally by NPC system.
   */
  export class CrescendoPanel {
    private container: HTMLElement;
    private fillBar: HTMLElement;
    private currentValue: number = 0.1;  // Default to 0.1 so it's visible
    private width: number;
    private height: number;

    constructor(parent: HTMLElement, width: number, height: number) {
      this.width = width;
      this.height = height;

      // Create container - white background with border to match other panels
      this.container = document.createElement('div');
      this.container.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        background: #fff;
        border: 1px solid #999;
        border-right: none;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      `;

      // Create fill bar (grows from bottom to top) - reddish pink
      this.fillBar = document.createElement('div');
      this.fillBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: ${(this.currentValue * 100).toFixed(2)}%;
        background: linear-gradient(to top, 
          hsl(350, 80%, 50%) 0%,
          hsl(350, 80%, 60%) 50%,
          hsl(350, 80%, 70%) 100%
        );
        transition: height 0.1s ease-out;
      `;

      this.container.appendChild(this.fillBar);
      parent.appendChild(this.container);
    }

    /**
     * Set the current crescendo value (0-1 normalized)
     */
    setValue(value: number): void {
      this.currentValue = Math.max(0, Math.min(1, value));
      this.updateDisplay();
    }

    /**
     * Get the current crescendo value
     */
    getValue(): number {
      return this.currentValue;
    }

    /**
     * Update visual display
     */
    private updateDisplay(): void {
      // Always show at least 10% fill so the bar is visible
      const displayValue = Math.max(0.1, this.currentValue);
      const heightPercent = (displayValue * 100).toFixed(2);
      this.fillBar.style.height = `${heightPercent}%`;
      
      // Optional: Change color when threshold reached (at 100%) - brighter reddish pink
      if (this.currentValue >= 1.0) {
        this.fillBar.style.background = `linear-gradient(to top, 
          hsl(350, 90%, 55%) 0%,
          hsl(350, 90%, 65%) 50%,
          hsl(350, 90%, 75%) 100%
        )`;
      }
    }

    /**
     * Resize the bar
     */
    resize(width: number, height: number): void {
      this.width = width;
      this.height = height;
      this.container.style.width = `${width}px`;
      this.container.style.height = `${height}px`;
    }

    /**
     * Clean up
     */
    destroy(): void {
      if (this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }
    }
  }
}
