/// <reference path="../ui-element-base.ts" />
/// <reference path="../../systems/state-manager.ts" />
/// <reference path="../../systems/editor-mode-manager.ts" />
/// <reference path="../../entities/player/player.ts" />

namespace Jamble {
  /**
   * Tap Indicator - Shows a blue dotted circle around the player when they can be tapped
   * Self-manages positioning and visibility based on game state
   */
  export class TapPrompt extends UIElement implements IUXPrompt {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameWidth: number;
    private gameHeight: number;
    private readonly overlayPadding: number = 40; // Match canvas-host padding-bottom
    private readonly circleRadius: number = 33; // 1.5x larger: 22 * 1.5 = 33 (66px diameter)
    private onTapCallback?: () => void;
    
    // References for self-positioning
    private player: Player;
    private stateManager: StateManager;
    private editorModeManager: EditorModeManager;

    constructor(
      canvasHost: HTMLElement,
      gameWidth: number,
      gameHeight: number,
      player: Player,
      stateManager: StateManager,
      editorModeManager: EditorModeManager
    ) {
      // Create container first
      const container = document.createElement('div');
      super(container);
      
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.player = player;
      this.stateManager = stateManager;
      this.editorModeManager = editorModeManager;
      
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
    
    /**
     * Update visibility and position based on game state
     * Called every frame from game loop
     */
    update(_deltaTime: number): void {
      // Update visibility and position based on state
      // Hide if in editor mode or not idle
      const isEditorActive = this.editorModeManager.getCurrentMode() !== 'none';
      if (this.stateManager.isIdle() && !isEditorActive) {
        if (!this.isVisible) {
          this.show();
        }
        // Render will be called from render() method below
      } else {
        if (this.isVisible) {
          this.hide();
        }
      }
    }
    
    /**
     * Show the tap indicator
     */
    show(): void {
      this.isVisible = true;
      this.canvas.style.display = 'block';
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
     * Set callback for when the indicator is tapped
     */
    setOnTap(callback: () => void): void {
      this.onTapCallback = callback;
    }

    /**
     * Render the blue dotted circle at player position
     */
    render(): void {
      if (!this.isVisible) return;
      
      const playerX = this.player.transform.x;
      const playerY = this.player.transform.y - 10; // Center 10px above anchor
      
      this.clear();
      
      // Draw blue dotted circle
      this.ctx.strokeStyle = '#2196f3'; // Material blue
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]); // Dotted pattern
      
      this.ctx.beginPath();
      this.ctx.arc(playerX, playerY, this.circleRadius, 0, Math.PI * 2);
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
      
      // Get current player position
      const playerX = this.player.transform.x;
      const playerCenterY = this.player.transform.y - 10;
      
      // Check if click is within the circle
      const dx = clickX - playerX;
      const dy = clickY - playerCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= this.circleRadius) {
        this.onTapCallback();
      }
    }
  }
}
