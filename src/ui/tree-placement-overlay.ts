/// <reference path="../slots/slot-manager.ts" />

namespace Jamble {
  /**
   * TreePlacementOverlay - Visual overlay showing available tree placement slots
   * Renders half-circles (top half only) at ground slot positions
   * Green for available slots, orange for occupied slots (trees can be removed)
   */
  export class TreePlacementOverlay {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private slotManager: SlotManager;
    private gameWidth: number;
    private gameHeight: number;
    private isVisible: boolean = false;
    
    // Visual constants
    private readonly circleRadius: number = 22; // 44px diameter touch target
    private readonly availableColor: string = '#4CAF50'; // Green
    private readonly occupiedColor: string = '#FF9800'; // Orange
    private readonly strokeColor: string = '#ff0000'; // Red - matches tree icon border
    private readonly strokeWidth: number = 3;
    
    // Slot state tracking
    private occupiedSlotIds: Set<string> = new Set();
    
    constructor(parent: HTMLElement, slotManager: SlotManager, gameWidth: number, gameHeight: number) {
      this.slotManager = slotManager;
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      
      // Create overlay canvas
      this.canvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = gameWidth * dpr;
      this.canvas.height = gameHeight * dpr;
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: auto;
        cursor: pointer;
        display: none;
        z-index: 5;
      `;
      
      this.ctx = this.canvas.getContext('2d')!;
      this.ctx.scale(dpr, dpr);
      parent.appendChild(this.canvas);
      
      // Set up click handling
      this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }
    
    /**
     * Show the overlay and render placement circles
     */
    show(): void {
      this.isVisible = true;
      this.canvas.style.display = 'block';
      this.render();
    }
    
    /**
     * Hide the overlay
     */
    hide(): void {
      this.isVisible = false;
      this.canvas.style.display = 'none';
    }
    
    /**
     * Mark a slot as occupied by a tree
     */
    setSlotOccupied(slotId: string, occupied: boolean): void {
      if (occupied) {
        this.occupiedSlotIds.add(slotId);
      } else {
        this.occupiedSlotIds.delete(slotId);
      }
      
      if (this.isVisible) {
        this.render();
      }
    }
    
    /**
     * Render half-circles at ground slot positions
     */
    private render(): void {
      this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
      
      const groundSlots = this.slotManager.getSlotsByType('ground');
      
      groundSlots.forEach(slot => {
        const isOccupiedByTree = this.occupiedSlotIds.has(slot.id);
        
        // Only show circles for available slots OR slots occupied by trees (which can be removed)
        if (!slot.occupied || isOccupiedByTree) {
          const color = isOccupiedByTree ? this.occupiedColor : this.availableColor;
          this.drawHalfCircle(slot.x, slot.y, color);
        }
      });
    }
    
    /**
     * Draw a half-circle (top half only) at the given position
     */
    private drawHalfCircle(x: number, y: number, color: string): void {
      this.ctx.save();
      
      // Draw filled half-circle (top half)
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.6;
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.circleRadius, Math.PI, 0, false); // Top half
      this.ctx.closePath();
      this.ctx.fill();
      
      // Draw stroke
      this.ctx.globalAlpha = 1.0;
      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeWidth;
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.circleRadius, Math.PI, 0, false);
      this.ctx.stroke();
      
      this.ctx.restore();
    }
    
    /**
     * Handle click events on the overlay
     */
    private handleClick(event: MouseEvent): void {
      const rect = this.canvas.getBoundingClientRect();
      // Click coordinates are in scaled CSS pixels
      const clickXScaled = event.clientX - rect.left;
      const clickYScaled = event.clientY - rect.top;
      
      // Convert to logical game coordinates (500×100 space)
      // rect.width is the actual displayed width (e.g., 393px on mobile)
      // this.gameWidth is the logical width (500px)
      const scaleX = this.gameWidth / rect.width;
      const scaleY = this.gameHeight / rect.height;
      const clickX = clickXScaled * scaleX;
      const clickY = clickYScaled * scaleY;
      
      const groundSlots = this.slotManager.getSlotsByType('ground');
      
      for (const slot of groundSlots) {
        const dx = clickX - slot.x;
        const dy = clickY - slot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.circleRadius) {
          const isOccupiedByTree = this.occupiedSlotIds.has(slot.id);
          
          // Ignore clicks on slots occupied by non-tree objects
          if (slot.occupied && !isOccupiedByTree) {
            return;
          }
          
          // Emit appropriate event
          const eventName = isOccupiedByTree ? 'jamble:tree-removed' : 'jamble:tree-placed';
          window.dispatchEvent(new CustomEvent(eventName, {
            detail: { slotId: slot.id, x: slot.x, y: slot.y }
          }));
          
          return;
        }
      }
    }
    
    /**
     * Clean up resources
     */
    destroy(): void {
      if (this.canvas.parentElement) {
        this.canvas.parentElement.removeChild(this.canvas);
      }
    }
  }
}
