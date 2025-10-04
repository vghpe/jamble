/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Tree extends GameObject {
    // Visual offset to center 10px trunk inside a 20px canvas
    private readonly visualOffsetX: number = 5;
    private readonly visualOffsetY: number = 0;
    
    constructor(id: string, x: number = 0, y: number = 0) {
      // Keep the GameObject transform at the base position (origin point)
      super(id, x, y); 
      
      // Canvas rendering with custom tree drawing
      this.render = {
        type: 'canvas',
        visible: true,
        canvas: {
          color: '#8d6e63', // Trunk color (not used directly due to custom draw)
          shape: 'custom',
          width: 20,
          height: 30,
          customDraw: this.drawTree.bind(this)
        },
        // Base/pivot at the bottom center so slots align with the base
        anchor: { x: 0.5, y: 1 }
      };
      
      // Collision box centered on trunk, anchored at base
      this.collisionBox = {
        x: 0,
        y: 0,
        width: 8,
        height: 25,
        anchor: { x: 0.5, y: 1 },
        category: 'environment'
      };
    }

    private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
      // Apply visual offsets for precise positioning
      const drawX = x + this.visualOffsetX;
      const drawY = y + this.visualOffsetY;
      
      // Draw brown trunk (30px tall), positioned above base
      ctx.fillStyle = '#8d6e63';
      this.drawRoundedRect(ctx, drawX, drawY, 10, 30, 2);
      
      // Draw circular green foliage centered at the top of trunk
      ctx.fillStyle = '#66bb6a';
      ctx.beginPath();
      ctx.arc(drawX + 5, drawY, 10, 0, 2 * Math.PI);
      ctx.fill();
    }

    private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }

    update(deltaTime: number): void {
      // Static tree — nothing to update per frame.
    }
  }
}
