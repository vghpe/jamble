/// <reference path="../core/game-object.ts" />
/// <reference path="../slots/slot-manager.ts" />

namespace Jamble {
  export class DebugRenderer {
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
      if (!ctx) throw new Error('DebugRenderer: 2D context unavailable');
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
      
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      
      // Reset transform and apply DPR scaling
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
      
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
    }

    render(gameObjects: GameObject[], showColliders: boolean, showOrigins: boolean = false, showSlots: boolean = false, slots?: Slot[]) {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (!showColliders && !showOrigins && !showSlots) return;

      // Draw collision boxes first (underneath)
      if (showColliders) {
        gameObjects.forEach(obj => {
          if (obj.collisionBox && obj.render.visible) {
            this.drawCollisionBox(obj.collisionBox);
          }
        });

        // Draw play area boundary on top of collision boxes
        this.drawPlayAreaBoundary();
      }

      // Draw origins on top of everything else
      if (showOrigins) {
        gameObjects.forEach(obj => {
          if (obj.render.visible) {
            this.drawOrigin(obj);
          }
        });
      }

      // Draw slots on top of origins
      if (showSlots && slots) {
        this.drawSlots(slots);
      }
    }

    private drawCollisionBox(box: CollisionBox) {
      const color = this.CATEGORY_COLORS[box.category];
      
      // Keep it simple - just use the collision box coordinates directly
      // The collision boxes should already be in the same coordinate system as the canvas
      
      // Draw semi-transparent filled rectangle
      this.ctx.fillStyle = color + '30'; // Add transparency
      this.ctx.fillRect(box.x, box.y, box.width, box.height);
      
      // Draw border
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(box.x, box.y, box.width, box.height);
    }

    private drawPlayAreaBoundary() {
      // Get canvas dimensions
      const rect = this.gameElement.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      
      // Draw red dashed border around play area
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(0, 0, width, height);
      this.ctx.setLineDash([]); // Reset to solid line
    }

    private drawOrigin(obj: GameObject) {
      const x = obj.transform.x;
      const y = obj.transform.y;
      const size = 8;

      // Draw orange crosshairs
      this.ctx.strokeStyle = '#ff6b35';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([]); // Solid line

      // Horizontal line
      this.ctx.beginPath();
      this.ctx.moveTo(x - size, y);
      this.ctx.lineTo(x + size, y);
      this.ctx.stroke();

      // Vertical line
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - size);
      this.ctx.lineTo(x, y + size);
      this.ctx.stroke();

      // Draw a small circle at the center
      this.ctx.fillStyle = '#ff6b35';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1, 0, 2 * Math.PI);
      this.ctx.fill();

      // Add object ID label
      this.ctx.fillStyle = '#ff6b35';
      this.ctx.font = '8px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(obj.id, x + 6, y - 6);
    }

    private drawSlots(slots: Slot[]) {
      const slotSize = 4; // Size of slot indicator (half the original size)
      const slotColors = {
        'ground': '#8b4513',    // brown
        'air_low': '#87ceeb',   // sky blue
        'air_mid': '#4682b4',   // steel blue
        'air_high': '#1e90ff',  // dodger blue
        'ceiling': '#696969'    // dim gray
      };

      slots.forEach(slot => {
        const color = slotColors[slot.type];
        const x = slot.x;
        const y = slot.y;

        // Draw slot circle
        this.ctx.fillStyle = slot.occupied ? color + '80' : color + '40'; // More opaque if occupied
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, slotSize, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw occupied indicator if needed
        if (slot.occupied) {
          this.ctx.fillStyle = '#ff0000';
          this.ctx.beginPath();
          this.ctx.arc(x, y, 1, 0, 2 * Math.PI); // Also made the red dot smaller
          this.ctx.fill();
        }
      });
    }

    setVisible(visible: boolean) {
      this.canvas.style.display = visible ? 'block' : 'none';
    }
  }
}