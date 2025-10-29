namespace Jamble {
  /**
   * Crescendo Panel - vertical progress bar showing crescendo level (0-1).
   * Simple display component - value is controlled externally by NPC system.
   * Features a pink heart emoji above the bar for UX clarity.
   */
  export class CrescendoPanel {
    private container: HTMLElement;
    private heartCanvas: HTMLCanvasElement;
    private heartCtx: CanvasRenderingContext2D;
    private fillBar: HTMLElement;
    private currentValue: number = 0.1;  // Default to 0.1 so it's visible
    private width: number;
    private height: number;
    
    // Animation state (for future pulse animation)
    private pulsePhase: number = 0;

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
        overflow: visible;
      `;

      // Create canvas for heart emoji above the bar
      const heartSize = Math.round(width * 1.5);
      this.heartCanvas = document.createElement('canvas');
      this.heartCanvas.width = heartSize;
      this.heartCanvas.height = heartSize;
      this.heartCanvas.style.cssText = `
        position: absolute;
        top: -${heartSize * 1.1}px;
        left: 50%;
        transform: translateX(-50%);
        width: ${heartSize}px;
        height: ${heartSize}px;
        pointer-events: none;
      `;
      
      // Set up high DPI rendering for heart canvas
      const dpr = window.devicePixelRatio || 1;
      this.heartCanvas.width = heartSize * dpr;
      this.heartCanvas.height = heartSize * dpr;
      
      this.heartCtx = this.heartCanvas.getContext('2d')!;
      this.heartCtx.scale(dpr, dpr);

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
      this.container.appendChild(this.heartCanvas);
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
     * Update animation state (called per frame from HUDManager)
     * Similar to portrait panel pattern - currently no per-frame updates needed
     */
    update(deltaTime: number): void {
      // Future: Update pulse phase for animation
      // this.pulsePhase += deltaTime * 2; // 2 Hz pulse
    }

    /**
     * Render visual state (called per frame from HUDManager)
     * Follows portrait panel pattern - canvas-based rendering
     */
    render(): void {
      const size = this.heartCanvas.width / (window.devicePixelRatio || 1);
      
      // Clear canvas
      this.heartCtx.clearRect(0, 0, size, size);
      
      // Draw heart emoji
      this.heartCtx.font = `${size * 0.8}px Arial`;
      this.heartCtx.textAlign = 'center';
      this.heartCtx.textBaseline = 'middle';
      
      // Future: Apply pulse scale based on crescendo level
      // const scale = 1 + Math.sin(this.pulsePhase) * 0.1 * this.currentValue;
      // this.heartCtx.save();
      // this.heartCtx.translate(size / 2, size / 2);
      // this.heartCtx.scale(scale, scale);
      // this.heartCtx.fillText('🩷', 0, 0);
      // this.heartCtx.restore();
      
      this.heartCtx.fillText('🩷', size / 2, size / 2);
    }

    /**
     * Update visual display of the progress bar
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
      
      // Recreate heart canvas with new size
      const heartSize = Math.round(width * 1.0);
      const dpr = window.devicePixelRatio || 1;
      this.heartCanvas.width = heartSize * dpr;
      this.heartCanvas.height = heartSize * dpr;
      this.heartCanvas.style.width = `${heartSize}px`;
      this.heartCanvas.style.height = `${heartSize}px`;
      this.heartCanvas.style.top = `-${heartSize * 1.1}px`;
      this.heartCtx.scale(dpr, dpr);
    }

    /**
     * Clean up
     */
    destroy(): void {
      if (this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }
    }

    /**
     * Dim/undim panel for editor mode
     */
    setDimmed(dimmed: boolean): void {
      this.container.style.opacity = dimmed ? '0.5' : '1';
      this.container.style.pointerEvents = dimmed ? 'none' : 'auto';
    }
  }
}
