/// <reference path="../core/game-object.ts" />

namespace Jamble {
  /**
   * High-performance canvas-based renderer for all game objects.
   * Handles crisp pixel-perfect rendering with proper DPI scaling.
   */
  export class CanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
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
      const ctx = this.canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2D canvas context');
      }
      ctx.imageSmoothingEnabled = false;
      return ctx;
    }

    private setupHighDPIRendering(gameElement: HTMLElement): void {
      // Wait for element to be rendered to get accurate dimensions
      setTimeout(() => {
        const rect = gameElement.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        
        // Set canvas resolution to match display pixels for crisp rendering
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        
        this.canvas.width = displayWidth * pixelRatio;
        this.canvas.height = displayHeight * pixelRatio;
        
        // Ensure CSS size matches visual size
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';
        
        // Calculate and apply scaling for logical game coordinates
        this.scaleX = (displayWidth * pixelRatio) / this.gameWidth;
        this.scaleY = (displayHeight * pixelRatio) / this.gameHeight;
        
        this.ctx.scale(this.scaleX, this.scaleY);
        this.ctx.imageSmoothingEnabled = false; // Reapply after scaling
      }, 0);
    }

    render(gameObjects: GameObject[]): void {
      // Clear canvas using logical game coordinates
      this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
      
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
      // Get pixel-perfect coordinates
      const x = Math.round(obj.transform.x);
      const y = Math.round(obj.transform.y);
      
      this.ctx.translate(x, y);
      
      // Apply scaling animation with center-bottom transform origin
      const animation = obj.render.animation;
      if (animation && (animation.scaleX !== 1 || animation.scaleY !== 1)) {
        const width = obj.render.canvas.width || 20;
        const height = obj.render.canvas.height || 20;
        
        // Transform origin: center-bottom (ground-based objects)
        this.ctx.translate(width / 2, height);
        this.ctx.scale(animation.scaleX, animation.scaleY);
        this.ctx.translate(-width / 2, -height);
      }
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