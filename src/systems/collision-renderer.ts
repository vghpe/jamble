/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class CollisionRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameElement: HTMLElement;

    private readonly CATEGORY_COLORS = {
      player: '#7F00FF',       // violet
      deadly: '#ef4444',       // red
      neutral: '#ffcc02',      // yellow
      environment: '#60a5fa'   // blue
    };

    constructor(gameElement: HTMLElement) {
      this.gameElement = gameElement;
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      `;
      
      const ctx = this.canvas.getContext('2d');
      if (!ctx) throw new Error('CollisionRenderer: 2D context unavailable');
      this.ctx = ctx;
      
      gameElement.appendChild(this.canvas);
      
      // Force initial resize after a short delay to ensure parent is sized
      setTimeout(() => this.resize(), 10);
      
      // Listen for resize events
      window.addEventListener('resize', () => this.resize());
    }

    private resize() {
      const rect = this.gameElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Ensure we have valid dimensions
      const width = Math.max(1, rect.width || this.gameElement.offsetWidth || 500);
      const height = Math.max(1, rect.height || this.gameElement.offsetHeight || 100);
      
      console.log(`Canvas resize: ${width}x${height} (DPR: ${dpr})`);
      
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      
      // Reset transform and apply DPR scaling
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
      
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
    }

    render(gameObjects: GameObject[], visible: boolean) {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (!visible) return;

      // Draw collision boxes
      gameObjects.forEach(obj => {
        if (obj.collisionBox && obj.render.visible) {
          this.drawCollisionBox(obj.collisionBox);
        }
      });
    }

    private drawCollisionBox(box: CollisionBox) {
      const color = this.CATEGORY_COLORS[box.category];
      
      // Keep it simple - just use the collision box coordinates directly
      // The collision boxes should already be in the same coordinate system as the canvas
      
      // Draw semi-transparent filled rectangle
      this.ctx.fillStyle = color + '30'; // Add transparency
      this.ctx.fillRect(box.x, box.y, box.width, box.height);
      
      // Draw colored border
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Draw category label
      this.ctx.fillStyle = color;
      this.ctx.font = '10px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(
        box.category.toUpperCase(),
        box.x + box.width / 2,
        box.y - 5
      );
    }

    setVisible(visible: boolean) {
      this.canvas.style.display = visible ? 'block' : 'none';
    }
  }
}