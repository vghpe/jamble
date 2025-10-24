namespace Jamble {
  /**
   * Tap Indicator - Shows a blue dotted circle around the player when they can be tapped
   */
  export class TapIndicator {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameWidth: number;
    private gameHeight: number;
    private readonly circleRadius: number = 33; // 1.5x larger: 22 * 1.5 = 33 (66px diameter)
    private visible: boolean = false;
    private playerX: number = 0;
    private playerY: number = 0;
    private onTapCallback?: () => void;

    constructor(canvasHost: HTMLElement, gameWidth: number, gameHeight: number) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      
      // Create canvas overlay
      this.canvas = document.createElement('canvas');
      this.canvas.width = gameWidth;
      this.canvas.height = gameHeight;
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: auto;
        z-index: 5;
      `;
      
      const ctx = this.canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context for tap indicator');
      this.ctx = ctx;
      
      canvasHost.appendChild(this.canvas);
      
      // Setup click/tap handler
      this.canvas.addEventListener('click', this.handleClick.bind(this));
    }

    /**
     * Show the tap indicator at the player's position
     */
    show(playerX: number, playerY: number): void {
      this.visible = true;
      this.playerX = playerX;
      this.playerY = playerY;
      this.canvas.style.display = 'block';
      this.render();
    }

    /**
     * Hide the tap indicator
     */
    hide(): void {
      this.visible = false;
      this.canvas.style.display = 'none';
      this.clear();
    }

    /**
     * Update player position (call each frame while visible)
     */
    updatePosition(playerX: number, playerY: number): void {
      if (!this.visible) return;
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
      if (!this.visible) return;
      
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
      this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
    }

    /**
     * Handle click/tap on the canvas
     */
    private handleClick(event: MouseEvent): void {
      if (!this.visible || !this.onTapCallback) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.gameWidth / rect.width;
      const scaleY = this.gameHeight / rect.height;
      
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

    /**
     * Check if currently visible
     */
    isVisible(): boolean {
      return this.visible;
    }

    /**
     * Destroy and clean up
     */
    destroy(): void {
      this.canvas.removeEventListener('click', this.handleClick.bind(this));
      if (this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }
  }
}
