/// <reference path="../core/game-object.ts" />

namespace Jamble {
  /**
   * High-performance canvas-based renderer for all game objects.
   * Handles crisp pixel-perfect rendering with proper DPI scaling.
   */
  export class CanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private readonly backgroundColor: string = '#e8f5e9';
    private gameWidth: number;
    private gameHeight: number;
    private scaleX: number = 1;
    private scaleY: number = 1;

    constructor(gameElement: HTMLElement, gameWidth: number, gameHeight: number) {
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      
      this.canvas = document.createElement('canvas');
      this.ctx = this.setupContext();
      this.setupCanvas(gameElement);
      this.setupHighDPIRendering(gameElement);
    }

    private setupCanvas(gameElement: HTMLElement): void {
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        z-index: 1;
      `;
      gameElement.appendChild(this.canvas);
    }

    private setupContext(): CanvasRenderingContext2D {
      const ctx = this.canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        throw new Error('Could not get 2D canvas context');
      }
      ctx.imageSmoothingEnabled = false;
      return ctx;
    }

    private setupHighDPIRendering(_gameElement: HTMLElement): void {
      // Configure immediately using known logical game size; avoids a transient
      // first-frame stretch before layout settles.
      const pixelRatio = window.devicePixelRatio || 1;

      // Match backing store to device pixels while keeping logical coordinates
      // in game units (gameWidth × gameHeight).
      this.canvas.width = this.gameWidth * pixelRatio;
      this.canvas.height = this.gameHeight * pixelRatio;

      // Ensure CSS size matches logical game size
      this.canvas.style.width = this.gameWidth + 'px';
      this.canvas.style.height = this.gameHeight + 'px';

      // Apply DPR scaling so 1 logical unit = 1 CSS pixel
      this.scaleX = pixelRatio;
      this.scaleY = pixelRatio;
      this.ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
      this.ctx.imageSmoothingEnabled = false;
    }

    render(gameObjects: GameObject[]): void {
      // Paint opaque background using logical game coordinates
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
      
      // Render all visible game objects
      gameObjects.forEach(obj => {
        if (!obj.render.visible) return;
        
        this.ctx.save();
        this.applyTransform(obj);
        this.renderCanvasObject(obj);
        this.ctx.restore();
      });
    }

    private applyTransform(obj: GameObject): void {
      // Get pixel-perfect coordinates and anchor
      const x = Math.round(obj.transform.x);
      const y = Math.round(obj.transform.y);
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
