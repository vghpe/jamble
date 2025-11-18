/// <reference path="core/game-object.ts" />

namespace Jamble {
  /**
   * GameCanvasRenderer - High-performance canvas-based renderer for game objects.
   * Handles crisp pixel-perfect rendering of all in-game entities.
   * 
   * Scope: Only renders game objects within the main game canvas.
   * Does NOT handle UI panels, HUD elements, or overlays outside the game canvas.
   * 
   * Note: Canvas creation and high-DPI setup is now handled by GameContainer.
   * GameCanvasRenderer receives a pre-configured context and focuses on rendering logic.
   */
  export class GameCanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private readonly backgroundColor: string = '#e8f5e9';
    private backgroundAlpha: number = 1.0; // For background transparency
    private gameWidth: number;
    private gameHeight: number;

    constructor(ctx: CanvasRenderingContext2D, gameWidth: number, gameHeight: number) {
      this.ctx = ctx;
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
    }

    /**
     * Set the alpha transparency of the background
     * @param alpha - 0 (fully transparent) to 1 (fully opaque)
     */
    setBackgroundAlpha(alpha: number): void {
      this.backgroundAlpha = Math.max(0, Math.min(1, alpha));
    }

    render(gameObjects: GameObject[]): void {
      // Clear canvas completely (including alpha channel)
      this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
      
      // Paint background with current transparency
      this.ctx.save();
      this.ctx.globalAlpha = this.backgroundAlpha;
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
      this.ctx.restore();
      
      // Render all visible game objects
      gameObjects.forEach(obj => {
        if (!obj.render.visible) return;
        
        this.ctx.save();
        
        // Apply opacity if specified (for player transparency)
        if (obj.render.opacity !== undefined) {
          this.ctx.globalAlpha = obj.render.opacity;
        }
        
        this.applyTransform(obj);
        this.renderCanvasObject(obj);
        this.ctx.restore();
      });
    }

    private applyTransform(obj: GameObject): void {
      // Use sub-pixel rendering for smooth movement
      const x = obj.transform.x;
      const y = obj.transform.y;
      const width = obj.render.canvas.width || 20;
      const height = obj.render.canvas.height || 20;
      const anchorX = (obj.render.anchor?.x ?? 0.5) * width;
      const anchorY = (obj.render.anchor?.y ?? 0.5) * height;

      // First, move to the object's anchor position
      this.ctx.translate(x, y);

      // Apply scaling animation around the anchor pivot
      const animation = obj.render.animation;
      if (animation && (animation.scaleX !== 1 || animation.scaleY !== 1)) {
        this.ctx.translate(0, 0); // origin is already at anchor
        this.ctx.scale(animation.scaleX, animation.scaleY);
      }

      // Shift so that (0,0) in the object's local space is its top-left
      this.ctx.translate(-anchorX, -anchorY);
    }

    private renderCanvasObject(obj: GameObject): void {
      const canvas = obj.render.canvas;
      const width = canvas.width || 20;
      const height = canvas.height || 20;
      
      if (canvas.shape === 'custom' && canvas.customDraw) {
        canvas.customDraw(this.ctx, 0, 0);
      } else {
        this.ctx.fillStyle = canvas.color;
        
        if (canvas.shape === 'rectangle') {
          if (canvas.borderRadius && canvas.borderRadius > 0) {
            this.drawRoundedRect(0, 0, width, height, canvas.borderRadius);
          } else {
            this.ctx.fillRect(0, 0, width, height);
          }
        } else if (canvas.shape === 'circle') {
          this.ctx.beginPath();
          this.ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI);
          this.ctx.fill();
        }
      }
    }

    private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + width - radius, y);
      this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.ctx.lineTo(x + width, y + height - radius);
      this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      this.ctx.lineTo(x + radius, y + height);
      this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.closePath();
      this.ctx.fill();
    }

    clear(): void {
      this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
    }
  }
}
