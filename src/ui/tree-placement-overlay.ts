/// <reference path="../slots/slot-manager.ts" />

namespace Jamble {
  /**
   * TreePlacementOverlay - Visual overlay showing available tree placement slots
   * Renders full circles at ground slot positions (extended canvas allows bottom half to show)
   * Blue for available slots, orange for occupied slots (trees can be removed)
   */
  export class TreePlacementOverlay {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private slotManager: SlotManager;
    private gameWidth: number;
    private gameHeight: number;
    private readonly overlayPadding: number = 40; // Match canvas-host padding-bottom
    private isVisible: boolean = false;
    
    // Visual constants
    private readonly circleRadius: number = 33; // 1.5x larger: 22 * 1.5 = 33 (66px diameter)
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
      
      // Create overlay canvas - extended to include padding area
      this.canvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = gameWidth * dpr;
      this.canvas.height = (gameHeight + this.overlayPadding) * dpr;
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: calc(100% + ${this.overlayPadding}px);
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
     * Render full circles at ground slot positions
     */
    private render(): void {
      this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight + this.overlayPadding);
      
      const groundSlots = this.slotManager.getSlotsByType('ground');
      
      groundSlots.forEach(slot => {
        const isOccupiedByTree = this.occupiedSlotIds.has(slot.id);
        
        // Only show circles for available slots OR slots occupied by trees (which can be removed)
        if (!slot.occupied || isOccupiedByTree) {
          const color = isOccupiedByTree ? this.occupiedColor : this.availableColor;
          // Offset circle up by X pixels for better visual alignment with trees
          const offsetY = slot.y - 0; // Adjust this value (try 8-15)
          this.drawFullCircle(slot.x, offsetY, color);
        }
      });
    }
    
    /**
     * Draw a full circle at the given position
     */
    private drawFullCircle(x: number, y: number, color: string): void {
      this.ctx.save();
      
      // Draw blue dotted outline only (no fill)
      // Use the color parameter to distinguish available vs occupied
      const strokeColor = color === this.occupiedColor ? '#FF9800' : '#2196f3'; // Orange for occupied, blue for available
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]); // Dotted pattern
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.circleRadius, 0, Math.PI * 2, false); // Full circle
      this.ctx.stroke();
      
      // Reset line dash
      this.ctx.setLineDash([]);
      
      this.ctx.restore();
    }
    
    /**
     * Handle click events on the overlay
     */
    private handleClick(event: MouseEvent): void {
      const rect = this.canvas.getBoundingClientRect();
      const clickXScaled = event.clientX - rect.left;
      const clickYScaled = event.clientY - rect.top;
      
      // Convert to logical game coordinates
      const scaleX = this.gameWidth / rect.width;
      const scaleY = (this.gameHeight + this.overlayPadding) / rect.height;
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
