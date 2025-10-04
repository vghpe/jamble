/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Tree extends GameObject {
    // Visual and collision offsets for fine-tuning positioning
    private readonly visualOffsetX: number = 0;
    private readonly visualOffsetY: number = -30; // Trunk extends up from base
    private readonly collisionOffsetX: number = 1; // Center 8px box on 10px trunk  
    private readonly collisionOffsetY: number = -25; // Collision box height from base
    
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
        // Preserve current visuals: transform is treated as top-left
        anchor: { x: 0, y: 0 }
      };
      
      // Collision box positioned using offsets
      this.collisionBox = {
        x: x + this.collisionOffsetX, 
        y: y + this.collisionOffsetY,  
        width: 8,
        height: 25,
        category: 'environment'
      };
    }

    private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
      // Apply visual offsets for precise positioning
      const drawX = x + this.visualOffsetX;
      const drawY = y + this.visualOffsetY;
      
      // Draw brown trunk (30px tall, positioned above base)
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
      // Trees are static - no update logic needed
      // Update collision box position using offsets
      if (this.collisionBox) {
        this.collisionBox.x = this.transform.x + this.collisionOffsetX;
        this.collisionBox.y = this.transform.y + this.collisionOffsetY;
      }
    }
  }
}
