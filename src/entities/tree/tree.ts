/// <reference path="../../core/game-object.ts" />
/// <reference path="../../slots/slot-manager.ts" />
/// <reference path="../../core/sensor.ts" />
/// <reference path="tree-anim.ts" />

namespace Jamble {
  /**
   * Tree - Decorative entity with animated leafs
   * Features:
   * - 5 leaf circles in a hat-shaped arc pattern with size variation
   * - Each leaf pivots from its attachment point to the trunk
   * - Sensor collider triggers wiggle animation on player contact
   * - Wiggle animation also plays on placement
   * - Canvas rendering with custom drawing
   */
  export class Tree extends GameObject {
    private slotManager: SlotManager;
    private currentSlotId: string = '';
    private anim: TreeAnim;
    private debugPanel?: any;
    
    // Child sensor for leaf collision detection
    private leafSensor: Sensor;
    
    // Visual constants
    private readonly trunkWidth: number = 10;
    private readonly trunkHeight: number = 30;
    private readonly trunkColor: string = '#8d6e63'; // Brown
    private readonly trunkBorderRadius: number = 2;
    private readonly leafColor: string = '#66bb6a'; // Green
    
    // Leaf anchor positions - calculated once at construction
    private leafAnchors: Array<{ x: number; y: number; radius: number }> = [];
    
    // Base leaf configuration (before debug adjustments)
    private readonly baseLeafConfig = {
      positions: [
        { x: 0, y: -24 },      // Center top
        { x: -8, y: -22 },     // Left-center
        { x: 8, y: -22 },      // Right-center
        { x: -14, y: -19 },    // Far left
        { x: 14, y: -19 }      // Far right
      ],
      radii: [11, 10, 10, 9, 9] // Base radii for each leaf
    };
    
    // Sensor collider for leaf interaction
    private readonly sensorRadius: number = 15;
    private readonly sensorOffsetY: number = -5;
    
    constructor(id: string, x: number, y: number, slotManager: SlotManager, slotId: string, debugPanel?: any) {
      super(id, x, y);
      
      this.slotManager = slotManager;
      this.currentSlotId = slotId;
      this.debugPanel = debugPanel;
      
      // Initialize leaf anchors with default/debug values
      this.updateLeafAnchors();
      
      this.anim = new TreeAnim(this, debugPanel);
      
      // Canvas rendering with custom tree drawing
      this.render = {
        type: 'canvas',
        visible: true,
        canvas: {
          color: this.trunkColor,
          shape: 'custom',
          width: 50,
          height: 45,
          customDraw: this.drawTree.bind(this)
        },
        anchor: { x: 0.5, y: 1 }
      };
      
      // Main collision box for the trunk
      this.collisionBox = {
        x: 0,
        y: 0,
        width: 8,
        height: 25,
        anchor: { x: 0.5, y: 1 },
        category: 'environment',
        enabled: true
      };
      
      // Create child sensor for leaf collision detection
      this.leafSensor = new Sensor(
        `${id}-leaf-sensor`,
        this,
        0,
        this.sensorOffsetY,
        this.sensorRadius * 2,
        this.sensorRadius * 2
      );
      
      // Set up sensor callback to trigger wiggle animation
      this.leafSensor.onTriggerEnter = (other: GameObject) => {
        if (other.id.startsWith('player')) {
          this.anim.triggerWiggle();
        }
      };
      
      // Trigger placement animation
      this.anim.triggerWiggle();
    }
    
    update(deltaTime: number): void {
      this.anim.update(deltaTime);
    }
    
    /**
     * Calculate leaf anchor positions based on debug parameters
     * Called once during construction
     */
    private updateLeafAnchors(): void {
      const arcWidth = this.debugPanel?.arcWidth ?? 0.65;
      const sizeRandomness = this.debugPanel?.sizeRandomness ?? 0.3;
      
      this.leafAnchors = this.baseLeafConfig.positions.map((pos, i) => ({
        x: pos.x * arcWidth,
        y: pos.y,
        radius: Math.max(6, this.baseLeafConfig.radii[i] * (1.0 + (Math.random() * 2 - 1) * sizeRandomness))
      }));
    }
    
    /**
     * Custom drawing function for tree with animated leafs
     */
    private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
      const canvasHeight = this.render.canvas.height || 45;
      const canvasWidth = this.render.canvas.width || 50;
      const baseX = canvasWidth * 0.5;
      const baseY = canvasHeight;
      
      // Draw trunk
      ctx.fillStyle = this.trunkColor;
      this.drawRoundedRect(
        ctx,
        baseX - this.trunkWidth * 0.5,
        baseY - this.trunkHeight,
        this.trunkWidth,
        this.trunkHeight,
        this.trunkBorderRadius
      );
      
      // Draw leafs with animation offsets
      ctx.fillStyle = this.leafColor;
      for (let i = 0; i < this.leafAnchors.length; i++) {
        const anchor = this.leafAnchors[i];
        const offset = this.anim.getLeafOffset(i);
        ctx.beginPath();
        ctx.arc(baseX + anchor.x + offset.x, baseY + anchor.y + offset.y, anchor.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    /**
     * Draw rounded rectangle helper
     */
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
    
    /**
     * Get current slot ID
     */
    getSlotId(): string {
      return this.currentSlotId;
    }
    
    /**
     * Get the leaf sensor (for adding to gameObjects array)
     */
    getSensor(): Sensor {
      return this.leafSensor;
    }
    
    /**
     * Despawn tree (remove from game)
     */
    despawn(): void {
      this.render.visible = false;
      if (this.collisionBox) {
        this.collisionBox.enabled = false;
      }
      this.leafSensor.setEnabled(false);
    }
    
    /**
     * Clean up when tree is removed
     */
    destroy(): void {
      // Free up the slot
      if (this.currentSlotId) {
        this.slotManager.freeSlot(this.currentSlotId);
      }
    }
  }
}
