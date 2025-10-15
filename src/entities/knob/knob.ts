/// <reference path="../../core/game-object.ts" />
/// <reference path="../../systems/economy-manager.ts" />
/// <reference path="../../slots/slot-manager.ts" />
/// <reference path="../../npc/base-npc.ts" />
/// <reference path="knob-anim.ts" />

namespace Jamble {
  export enum KnobState {
    ACTIVE,      // Normal gameplay - can be hit
    RETRACTING,  // Playing retract animation
    RETRACTED,   // Hidden, no collision
    SPAWNING     // Playing spawn animation
  }

  export class Knob extends GameObject implements CurrencyCollectible {
    public currencyValue = 1; // Base value for collisions
    private readonly topHitValue: number = 5; // Currency for top collisions

    private economyManager: EconomyManager;
    private activeNPC: BaseNPC;
    private anim: KnobAnim;
    //  knob configuration 
    public config = {
      length: 10,           // Spring length in pixels
      segments: 6,          // Number of curve segments  
      omega: 18.0,          // Spring frequency
      zeta: 0.25,           // Damping coefficient
      maxAngleDeg: 85,      // Maximum deflection angle
      bowFactor: 0.35,      // Curve bow amount
      lineWidth: 12,        // Stroke width
      knobColor: '#ff968f', // Spring and knob color
      baseRadius: 3,        // Base circle radius
      showPoints: false,    // Debug: show control points
      visualOffsetY: 4      // Visual offset down in pixels
    };

    // Spring physics state (original archive physics)
    public theta: number = 0;           // Current angle
    public thetaDot: number = 0;        // Angular velocity  
    public thetaTarget: number = 0;     // Target angle
    
    // Cached calculations
    private basePos: { x: number; y: number } = { x: 0, y: 0 };
    private springPoints: { x: number; y: number }[] = [];
    
    // Hit tolerance and relocation system
    private hitTolerance: number = 3;           // Hits before relocation
    private currentHits: number = 0;            // Current hit count
    private state: KnobState = KnobState.ACTIVE; // Current state
    private respawnTimer: number = 0;           // 2-second delay timer
    private readonly respawnDelay: number = 2.0; // 2 seconds
    private slotManager: SlotManager;           // Reference to slot system
    private currentSlotId: string = '';         // Track which slot we occupy


    constructor(id: string, x: number = 0, y: number = 0, slotManager: SlotManager, slotId: string, activeNPC: BaseNPC) {
      // Anchor the knob at the given position (slot). We'll use
      // bottom-center as the anchor so the slot aligns with the base.
      super(id, x, y);
      
      this.economyManager = EconomyManager.getInstance();
      this.activeNPC = activeNPC;
      this.anim = new KnobAnim(this);
      this.slotManager = slotManager;
      this.currentSlotId = slotId;
      
      // Canvas rendering with custom knob drawing
      this.render = {
        type: 'canvas',
        visible: true,
        canvas: {
          color: '#ff6b35', // Knob color (not used directly due to custom draw)
          shape: 'custom',
          width: 80,  // Canvas area size (increased to accommodate full swing)
          height: 80,
          customDraw: this.drawKnob.bind(this)
        },
        anchor: { x: 0.5, y: 1 } // bottom-center anchor
      };
      
      // Collision box for knob interaction (circular area around the pivot)
      this.collisionBox = {
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        anchor: { x: 0.5, y: 0.5 },
        category: 'kinematic'
      };
    }

    update(deltaTime: number): void {
      // Handle respawn timer (old auto-respawn logic - will be replaced with manual respawn)
      if (this.state === KnobState.RETRACTED) {
        this.respawnTimer -= deltaTime;
        if (this.respawnTimer <= 0) {
          this.respawn();
        }
        return; // Skip physics while hidden
      }
      
      // Only update physics when active
      if (this.state === KnobState.ACTIVE) {
        // Delegate to animation/physics system
        this.anim.update(deltaTime);
        // Update geometry after all physics updates
        this.updateSpringPoints();
      }
    }

    // Angular spring handled by KnobAnim

    // Collider world position is derived on demand by systems that need it.

    private updateSpringPoints(): void {
      // Base position: use the render anchor within the knob's canvas
      const width = this.render.canvas.width || 80;
      const height = this.render.canvas.height || 80;
      const anchorX = (this.render.anchor?.x ?? 0.5) * width;
      const anchorY = (this.render.anchor?.y ?? 1.0) * height;
      this.basePos.x = anchorX;
      this.basePos.y = anchorY;
      
      const tipX = this.basePos.x + this.config.length * Math.sin(this.theta);
      const tipY = this.basePos.y - this.config.length * Math.cos(this.theta);
      
      // Create curved spring using quadratic bezier (from original)
      const normal = { x: Math.cos(this.theta), y: Math.sin(this.theta) };
      const midX = (this.basePos.x + tipX) / 2;
      const midY = (this.basePos.y + tipY) / 2;
      const bowOffset = -this.config.bowFactor * this.config.length * this.theta;
      const controlX = midX + normal.x * bowOffset;
      const controlY = midY + normal.y * bowOffset;
      
      // Generate curve points
      const segments = Math.max(2, Math.round(this.config.segments));
      this.springPoints = [];
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const omt = 1 - t;
        const x = omt * omt * this.basePos.x + 2 * omt * t * controlX + t * t * tipX;
        const y = omt * omt * this.basePos.y + 2 * omt * t * controlY + t * t * tipY;
        this.springPoints.push({ x, y });
      }
    }

    private drawKnob(ctx: CanvasRenderingContext2D, x: number, y: number): void {
      // Don't render when retracted
      if (this.state === KnobState.RETRACTED) {
        console.log(`${this.id} drawKnob() called but state is RETRACTED, skipping render`);
        return;
      }
      
      // Draw spring curve (original archive style)
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = this.config.knobColor;
      ctx.lineWidth = this.config.lineWidth;
      
      ctx.beginPath();
      if (this.springPoints.length > 0) {
        // Adjust points to canvas position
        const adjustedPoints = this.springPoints.map(p => ({
          x: x + p.x,
          y: y + p.y
        }));
        
        ctx.moveTo(adjustedPoints[0].x, adjustedPoints[0].y);
        
        // Smooth curve through points (original method)
        for (let i = 1; i < adjustedPoints.length - 1; i++) {
          const midX = 0.5 * (adjustedPoints[i].x + adjustedPoints[i + 1].x);
          const midY = 0.5 * (adjustedPoints[i].y + adjustedPoints[i + 1].y);
          ctx.quadraticCurveTo(adjustedPoints[i].x, adjustedPoints[i].y, midX, midY);
        }
        
        if (adjustedPoints.length > 1) {
          const last = adjustedPoints[adjustedPoints.length - 1];
          ctx.lineTo(last.x, last.y);
        }
      }
      ctx.stroke();
      
      // Draw base knob (original style)
      ctx.fillStyle = this.config.knobColor;
      ctx.beginPath();
      ctx.arc(x + this.basePos.x, y + this.basePos.y, this.config.baseRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }

    deflect(direction: number): void {
      this.anim.triggerDeflect(direction);
    }

    onCollected(player: Player): number {
      // Only process if active
      if (this.state !== KnobState.ACTIVE) {
        console.log(`${this.id} onCollected() called but state is ${KnobState[this.state]}, returning 0`);
        return 0;
      }
      
      const collisionType = this.detectCollisionType(player);
      let currencyAmount = this.currencyValue; // Default side collision value (1)
      let arousalImpact: number;
      
      if (collisionType === 'top') {
        currencyAmount = this.topHitValue; // Top collision gives more points
        arousalImpact = 0.5; // Strong pulse (top hits)
        this.anim.triggerSquash();
      } else {
        arousalImpact = 0.3; // Mid pulse (side hits)  
        this.anim.triggerDeflect(Math.random() > 0.5 ? 1 : -1);
      }
      
      this.economyManager.addCurrency(currencyAmount);
      
      // Add arousal impact to active NPC only - HUD will listen to NPC changes
      this.activeNPC.applyArousalImpulse(arousalImpact);
      
      // Increment hit counter and check tolerance
      this.currentHits++;
      // TODO: Disabled relocation - knob will now hide/pop based on other conditions
      // if (this.currentHits >= this.hitTolerance) {
      //   this.startRelocation();
      // }
      
      return currencyAmount;
    }

    private detectCollisionType(player: Player): 'top' | 'side' {
      // Get player's center and knob's center for better comparison
      const playerY = player.transform.y;
      const knobY = this.transform.y;
      
      // Check if player is coming from above (positive Y velocity = downward in this coordinate system)
      const isMovingDown = player.velocityY > 0;
      // Player is above if their Y position is less than knob's Y position (higher on screen)
      const isAboveKnob = playerY < knobY - 10; // 10px tolerance
      

      
      if (isMovingDown && isAboveKnob) {
        return 'top';
      }
      return 'side';
    }

    // Animation handled by KnobAnim

    onTriggerEnter(other: GameObject): void {
      if (this.state !== KnobState.ACTIVE) return; // Ignore while not active
      // Only react to player
      if (other instanceof Player) {
        // Collect currency when player touches knob (handles animation internally)
        this.onCollected(other as Player);
      }
    }

    private startRelocation(): void {
      this.state = KnobState.RETRACTED;
      this.respawnTimer = this.respawnDelay;
      
      // Hide knob
      this.render.visible = false;
      if (this.collisionBox) {
        this.collisionBox.category = 'deadly'; // Use existing category to disable normal collision
      }
      
      // Find new slot
      this.relocateToNewSlot();
    }

    private relocateToNewSlot(): void {
      // Get available ground slots (excluding current)
      const availableSlots = this.slotManager.getAvailableSlots('ground')
        .filter(slot => slot.id !== this.currentSlotId);
      
      if (availableSlots.length > 0) {
        // Pick random available slot
        const newSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        
        // Update position and slot tracking
        this.transform.x = newSlot.x;
        this.transform.y = newSlot.y;
        
        // Update slot occupancy
        this.slotManager.freeSlot(this.currentSlotId);
        this.slotManager.occupySlot(newSlot.id, this.id);
        this.currentSlotId = newSlot.id;
      }
    }

    private respawn(): void {
      this.state = KnobState.ACTIVE;
      this.currentHits = 0;
      
      // Re-enable knob
      this.render.visible = true;
      
      // Restore collision box
      this.collisionBox = {
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        anchor: { x: 0.5, y: 0.5 },
        category: 'kinematic'
      };
    }
    
    /**
     * Retract knob due to pain threshold
     */
    retract(): void {
      if (this.state !== KnobState.ACTIVE) {
        console.log(`${this.id} retract() called but state is ${KnobState[this.state]}, skipping`);
        return;
      }
      
      console.log(`${this.id} retracting due to pain threshold`);
      console.log(`  Before: state=${KnobState[this.state]}, visible=${this.render.visible}, collisionBox=${!!this.collisionBox}`);
      
      this.state = KnobState.RETRACTING;
      
      // TODO: Play retract animation here
      // For now, immediately go to retracted state
      this.state = KnobState.RETRACTED;
      
      // IMPORTANT: Set respawn timer to infinity to prevent auto-respawn
      // Manual respawn only (via control station/hearts)
      this.respawnTimer = Infinity;
      
      // Hide knob and disable collision
      this.render.visible = false;
      this.collisionBox = undefined;
      
      console.log(`  After: state=${KnobState[this.state]}, visible=${this.render.visible}, collisionBox=${!!this.collisionBox}`);
    }
    
    /**
     * Manually trigger respawn (called from control station/heart use)
     */
    manualRespawn(): void {
      if (this.state !== KnobState.RETRACTED) return;
      
      console.log(`${this.id} respawning manually`);
      this.state = KnobState.SPAWNING;
      
      // TODO: Play spawn animation here
      // For now, immediately go to active state
      this.respawn();
    }
    
    /**
     * Get current knob state
     */
    getState(): KnobState {
      return this.state;
    }
    
    /**
     * Check if knob is currently active (can be hit)
     */
    isActive(): boolean {
      return this.state === KnobState.ACTIVE;
    }
  }
}
