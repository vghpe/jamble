/// <reference path="../../ui-element-base.ts" />
/// <reference path="../../../systems/editor-mode-manager.ts" />

namespace Jamble {
  /**
   * Crescendo Monitor - vertical progress bar showing crescendo level (0-1).
   * Simple display component - value is controlled externally by NPC system.
   * Features a pink heart emoji above the bar for UX clarity.
   */
  export class CrescendoMonitor extends UIElement implements IInstrumentComponent {
    private heartCanvas: HTMLCanvasElement;
    private heartCtx: CanvasRenderingContext2D;
    private fillCanvas: HTMLCanvasElement;
    private fillCtx: CanvasRenderingContext2D;
    private currentValue: number = 0.1;  // Default to 0.1 so it's visible
    private width: number;
    private height: number;
    
    // Animation state
    private pulsePhase: number = 0;
    private wavePhase: number = 0; // Horizontal scroll offset for wave
    
    // Wave animation parameters (exposed for debug tweaking)
    private waveSpeed: number = 15; // pixels per second horizontal scroll
    private waveFrequency: number = 0.9; // waves per panel width
    private waveAmplitude: number = 0.5; // pixels of vertical wave height

    constructor(parent: HTMLElement, width: number, height: number) {
      // Create container first
      const container = document.createElement('div');
      super(container);
      
      this.width = width;
      this.height = height;

      // Set container styles - white background with border to match other panels
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

      // Create fill canvas for animated wavy fill effect
      this.fillCanvas = document.createElement('canvas');
      this.fillCanvas.width = width;
      this.fillCanvas.height = height;
      this.fillCanvas.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: ${width}px;
        height: ${height}px;
        pointer-events: none;
      `;
      
      // Set up high DPI rendering for fill canvas
      const fillDpr = window.devicePixelRatio || 1;
      this.fillCanvas.width = width * fillDpr;
      this.fillCanvas.height = height * fillDpr;
      
      this.fillCtx = this.fillCanvas.getContext('2d')!;
      this.fillCtx.scale(fillDpr, fillDpr);

      this.container.appendChild(this.fillCanvas);
      this.container.appendChild(this.heartCanvas);
      parent.appendChild(this.container);
      
      // Listen for editor mode changes
      window.addEventListener('jamble:editor-mode-change', () => {
        this.updateDimming();
      });
    }
    
    /**
     * IInstrumentComponent: Get category
     */
    getCategory(): 'monitor' | 'control' {
      return 'monitor';
    }
    
    /**
     * IInstrumentComponent: Determine if should dim in editor mode
     * Monitors dim during any editor mode
     */
    shouldDimInEditorMode(editorMode: string, _activeControlId: string | null): boolean {
      return editorMode !== 'none';
    }
    
    /**
     * Update dimming based on current editor mode
     */
    private updateDimming(): void {
      const editorModeManager = EditorModeManager.getInstance();
      const mode = editorModeManager.getCurrentMode();
      const activeControl = editorModeManager.getActiveControlId();
      const shouldDim = this.shouldDimInEditorMode(mode, activeControl);
      this.setDimmed(shouldDim);
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
     */
    update(deltaTime: number): void {
      // Update wave horizontal scroll phase
      this.wavePhase += deltaTime * this.waveSpeed;
      
      // Wrap phase at one full wavelength to create seamless loop
      const wavelength = this.width / this.waveFrequency;
      if (this.wavePhase > wavelength) {
        this.wavePhase -= wavelength;
      }
    }

    /**
     * Render visual state (called per frame from HUDManager)
     * Follows portrait panel pattern - canvas-based rendering
     */
    render(): void {
      // Render heart emoji (disabled for now, keeping code)
      // const heartSize = this.heartCanvas.width / (window.devicePixelRatio || 1);
      // this.heartCtx.clearRect(0, 0, heartSize, heartSize);
      // this.heartCtx.font = `${heartSize * 0.8}px Arial`;
      // this.heartCtx.textAlign = 'center';
      // this.heartCtx.textBaseline = 'middle';
      // this.heartCtx.fillText('🩷', heartSize / 2, heartSize / 2);
      
      // Render fill bar with wavy top edge
      const fillWidth = this.fillCanvas.width / (window.devicePixelRatio || 1);
      const fillHeight = this.fillCanvas.height / (window.devicePixelRatio || 1);
      
      this.fillCtx.clearRect(0, 0, fillWidth, fillHeight);
      
      // Only render if there's something to show
      if (this.currentValue <= 0) return;
      
      // Calculate fill height (always show at least 10%)
      const displayValue = Math.max(0.1, this.currentValue);
      const targetHeight = fillHeight * displayValue;
      
      // Create gradient for fill
      const gradient = this.fillCtx.createLinearGradient(0, fillHeight, 0, fillHeight - targetHeight);
      
      // Brighter colors when at 100%
      if (this.currentValue >= 1.0) {
        gradient.addColorStop(0, 'hsl(350, 90%, 55%)');
        gradient.addColorStop(0.5, 'hsl(350, 90%, 65%)');
        gradient.addColorStop(1, 'hsl(350, 90%, 75%)');
      } else {
        gradient.addColorStop(0, 'hsl(350, 80%, 50%)');
        gradient.addColorStop(0.5, 'hsl(350, 80%, 60%)');
        gradient.addColorStop(1, 'hsl(350, 80%, 70%)');
      }
      
      // Draw fill with wavy top edge using clipping path
      this.fillCtx.save();
      this.fillCtx.beginPath();
      
      // Start from bottom left
      this.fillCtx.moveTo(0, fillHeight);
      
      // Left edge up to wave start
      this.fillCtx.lineTo(0, fillHeight - targetHeight + this.waveAmplitude);
      
      // Draw wavy top edge (horizontally scrolling sine wave)
      const wavePoints = Math.ceil(fillWidth) + 1;
      for (let x = 0; x <= wavePoints; x++) {
        const xPos = x;
        const phase = ((x + this.wavePhase) / fillWidth) * Math.PI * 2 * this.waveFrequency;
        const yOffset = Math.sin(phase) * this.waveAmplitude;
        const yPos = fillHeight - targetHeight + yOffset;
        this.fillCtx.lineTo(xPos, yPos);
      }
      
      // Right edge down to bottom
      this.fillCtx.lineTo(fillWidth, fillHeight);
      
      // Close path
      this.fillCtx.closePath();
      this.fillCtx.clip();
      
      // Fill with gradient
      this.fillCtx.fillStyle = gradient;
      this.fillCtx.fillRect(0, 0, fillWidth, fillHeight);
      
      this.fillCtx.restore();
    }

    /**
     * Update visual display (no longer needed for DOM, kept for API compatibility)
     */
    private updateDisplay(): void {
      // Display is now handled in render() method
      // This method kept for API compatibility
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
      
      // Recreate fill canvas with new size
      this.fillCanvas.width = width * dpr;
      this.fillCanvas.height = height * dpr;
      this.fillCanvas.style.width = `${width}px`;
      this.fillCanvas.style.height = `${height}px`;
      this.fillCtx.scale(dpr, dpr);
    }
    
    // Getters/setters for debug panel tweaking
    getWaveSpeed(): number { return this.waveSpeed; }
    setWaveSpeed(value: number): void { this.waveSpeed = value; }
    
    getWaveFrequency(): number { return this.waveFrequency; }
    setWaveFrequency(value: number): void { this.waveFrequency = value; }
    
    getWaveAmplitude(): number { return this.waveAmplitude; }
    setWaveAmplitude(value: number): void { this.waveAmplitude = value; }
  }
}
