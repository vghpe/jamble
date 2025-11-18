/// <reference path="../ui-element-base.ts" />

namespace Jamble {
  /**
   * Tap Indicator - Shows a blue dotted circle around the player when they can be tapped
   */
  export class TapPrompt extends UIElement implements IUXPrompt {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameWidth: number;
    private gameHeight: number;
    private readonly overlayPadding: number = 40; // Match canvas-host padding-bottom
    private readonly circleRadius: number = 33; // 1.5x larger: 22 * 1.5 = 33 (66px diameter)
    private playerX: number = 0;
    private playerY: number = 0;
    private onTapCallback?: () => void;

    constructor(canvasHost: HTMLElement, gameWidth: number, gameHeight: number) {
      // Create container first
      const container = document.createElement('div');
      super(container);
      
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      
      // Create canvas overlay - extended to include padding area
      this.canvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = gameWidth * dpr;
      this.canvas.height = (gameHeight + this.overlayPadding) * dpr;
      
      // Calculate padding as percentage of game height for proper scaling
      const paddingPercent = (this.overlayPadding / gameHeight) * 100;
      
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: calc(100% + ${paddingPercent}%);
        pointer-events: auto;
        z-index: 5;
      `;
      
      const ctx = this.canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context for tap indicator');
      this.ctx = ctx;
      this.ctx.scale(dpr, dpr);
      
      this.container.appendChild(this.canvas);
      canvasHost.appendChild(this.container);
      
      // Setup pointerdown handler for instant response (no click delay)
      this.canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.handleClick(e);
      });
    }
    
    /**
     * IUXPrompt: Determine if should show in game state
     */
    shouldShowInState(gameState: string): boolean {
      // Tap prompt shows when player is idle/tappable
      return gameState === 'idle';
    }
    
    update(_deltaTime: number): void {
      // No per-frame updates needed beyond render
    }

    /**
     * Show the tap indicator at the player's position
     */
    showAt(playerX: number, playerY: number): void {
      this.isVisible = true;
      this.playerX = playerX;
      this.playerY = playerY;
      this.canvas.style.display = 'block';
      this.render();
    }

    /**
     * Hide the tap indicator
     */
    hide(): void {
      this.isVisible = false;
      this.canvas.style.display = 'none';
      this.clear();
    }

    /**
     * Update player position (call each frame while visible)
     */
    updatePosition(playerX: number, playerY: number): void {
      if (!this.isVisible) return;
      this.playerX = playerX;
      this.playerY = playerY;
    }

    /**
     * Set callback for when the indicator is tapped
     */
    setOnTap(callback: () => void): void {
      this.onTapCallback = callback;
    }

    /**
     * Render the blue dotted circle
     */
    render(): void {
      if (!this.isVisible) return;
      
      this.clear();
      
      // Draw blue dotted circle
      this.ctx.strokeStyle = '#2196f3'; // Material blue
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]); // Dotted pattern
      
      this.ctx.beginPath();
      this.ctx.arc(this.playerX, this.playerY, this.circleRadius, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Reset line dash
      this.ctx.setLineDash([]);
    }

    /**
     * Clear the canvas
     */
    private clear(): void {
      this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight + this.overlayPadding);
    }

    /**
     * Handle click/tap on the canvas
     */
    private handleClick(event: MouseEvent): void {
      if (!this.isVisible || !this.onTapCallback) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.gameWidth / rect.width;
      const scaleY = (this.gameHeight + this.overlayPadding) / rect.height;
      
      const clickX = (event.clientX - rect.left) * scaleX;
      const clickY = (event.clientY - rect.top) * scaleY;
      
      // Check if click is within the circle
      const dx = clickX - this.playerX;
      const dy = clickY - this.playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= this.circleRadius) {
        this.onTapCallback();
      }
    }
  }
}
