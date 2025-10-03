/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Tree extends GameObject {
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
        }
      };
      
      // Collision box positioned relative to the base origin
      this.collisionBox = {
        x: x - 4, // Center the 8px collision box on the 10px tree
        y: y - 25, // Position collision box from the base up 25px  
        width: 8,  // 8px collision width
        height: 25, // 25px collision height
        category: 'environment'
      };
    }

    private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
      // Draw brown trunk extending upward from base position
      ctx.fillStyle = '#8d6e63';
      this.drawRoundedRect(ctx, x, y - 30, 10, 30, 2);
      
      // Draw circular green foliage centered on trunk
      ctx.fillStyle = '#66bb6a';
      ctx.beginPath();
      ctx.arc(x + 5, y - 20, 10, 0, 2 * Math.PI);
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
      // But we still update collision box position relative to the base origin
      if (this.collisionBox) {
        // Collision box is centered on the base origin and extends upward
        this.collisionBox.x = this.transform.x + 1; // Center 8px collision box on 10px tree (offset by 1px)
        this.collisionBox.y = this.transform.y - 25; // Position collision box 25px above the base origin
      }
    }
  }
}