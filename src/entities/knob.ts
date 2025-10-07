/// <reference path="../core/game-object.ts" />
/// <reference path="../systems/economy-manager.ts" />
/// <reference path="../slots/slot-manager.ts" />

namespace Jamble {
  export class Knob extends GameObject implements CurrencyCollectible {
    public currencyValue = 1; // Base value for collisions
    private economyManager: EconomyManager;
    // Original knob configuration (from archive)
    private config = {
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
    private theta: number = 0;           // Current angle
    private thetaDot: number = 0;        // Angular velocity  
    private thetaTarget: number = 0;     // Target angle
    
    // Cached calculations
    private basePos: { x: number; y: number } = { x: 0, y: 0 };
    private springPoints: { x: number; y: number }[] = [];
    
    // Animation state
    private isDeflecting: boolean = false;
    private deflectionDirection: number = 1; // 1 for right, -1 for left
    private deflectTimer: number = 0;    // seconds remaining for deflection hold
    private readonly deflectDuration: number = 0.2; // seconds (was 200ms timeout)
    
        // Squash animation state (separate physics system)
    private isSquashing: boolean = false;
    private squashStartTime: number = 0;
    private squashPhase: 'compress' | 'hold' | 'spring' = 'compress';
    private originalLength: number = 0;
    private squashVelocity: number = 0;
    private originalLineWidth: number = 0;
    private currentLineWidth: number = 0;
    
    // Hit tolerance and relocation system
    private hitTolerance: number = 3;           // Hits before relocation
    private currentHits: number = 0;            // Current hit count
    private knobState: 'active' | 'hidden' = 'active'; // Simple state
    private respawnTimer: number = 0;           // 2-second delay timer
    private readonly respawnDelay: number = 2.0; // 2 seconds
    private slotManager: SlotManager;           // Reference to slot system
    private currentSlotId: string = '';         // Track which slot we occupy
    private squashPhaseTimer: number = 0; // seconds for compress/hold phases
    private squashSpringElapsed: number = 0; // seconds elapsed in spring phase
    // Use ω/ζ form for squash spring to match side spring formulation.
    // Values chosen to preserve prior K=605, D=7.5 behavior: ω≈sqrt(605)≈24.6, ζ≈D/(2ω)≈0.15
    private readonly squashOmega: number = 24.6;
    private readonly squashZeta: number = 0.15;
    private readonly squashHoldTimeS: number = 0.15; // seconds (was 150ms)

    constructor(id: string, x: number = 0, y: number = 0, slotManager: SlotManager, slotId: string) {
      // Anchor the knob at the given position (slot). We'll use
      // bottom-center as the anchor so the slot aligns with the base.
      super(id, x, y);
      
      this.economyManager = EconomyManager.getInstance();
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
      // Handle respawn timer
      if (this.knobState === 'hidden') {
        this.respawnTimer -= deltaTime;
        if (this.respawnTimer <= 0) {
          this.respawn();
        }
        return; // Skip physics while hidden
      }
      
      // Only update physics when active
      if (this.knobState === 'active') {
        // Update deflection target deterministically using timers
        if (this.isDeflecting) {
          this.deflectTimer -= deltaTime;
          if (this.deflectTimer <= 0) {
            this.isDeflecting = false;
            this.thetaTarget = 0; // Return to center
          } else {
            const maxAngle = (this.config.maxAngleDeg * Math.PI) / 180;
            this.thetaTarget = this.deflectionDirection * maxAngle;
          }
        }

        this.updateSpringPhysics(deltaTime);
        this.updateSquashPhysics(deltaTime); // Separate physics system for top collisions
        // Update geometry after all physics updates
        this.updateSpringPoints();
      }
    }

    private updateSpringPhysics(deltaTime: number): void {
      // Original archive spring physics: F = -k*x - c*v where k = omega^2, c = 2*zeta*omega
      const acceleration = 
        -2 * this.config.zeta * this.config.omega * this.thetaDot -
        this.config.omega * this.config.omega * (this.theta - this.thetaTarget);
      
      this.thetaDot += acceleration * deltaTime;
      this.theta += this.thetaDot * deltaTime;
    }

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
      this.isDeflecting = true;
      this.deflectionDirection = direction >= 0 ? 1 : -1;
      // Set target deflection angle (use original maxAngleDeg)
      const maxAngle = (this.config.maxAngleDeg * Math.PI) / 180;
      this.thetaTarget = this.deflectionDirection * maxAngle;
      this.deflectTimer = this.deflectDuration;
    }

    onCollected(player: Player): number {
      // Only process if active
      if (this.knobState !== 'active') return 0;
      
      const collisionType = this.detectCollisionType(player);
      let currencyAmount = this.currencyValue; // Default side collision value (1)
      
      if (collisionType === 'top') {
        currencyAmount = 5; // Top collision gives 5 points
        this.squashAnimation();
      } else {
        this.deflectAnimation();
      }
      
      this.economyManager.addCurrency(currencyAmount);
      
      // Increment hit counter and check tolerance
      this.currentHits++;
      if (this.currentHits >= this.hitTolerance) {
        this.startRelocation();
      }
      
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

    private squashAnimation(): void {
      // Start physics-based squash animation (deterministic timers)
      this.isSquashing = true;
      this.squashPhase = 'compress';
      this.originalLength = this.config.length;
      this.originalLineWidth = this.config.lineWidth;
      this.squashVelocity = 0;
      this.squashSpringElapsed = 0;
      
      // Tuned squash amount (preserve current look)
      const squashPercent = 4;
      this.config.length = this.originalLength * (squashPercent / 100);
      
      // Make it wider when squashed - tuned value
      const widthMultiplier = 1.3;
      this.config.lineWidth = this.originalLineWidth * widthMultiplier;
      this.currentLineWidth = this.config.lineWidth;
      
      // Hold the compressed state briefly, then proceed to 'hold' and 'spring'
      this.squashPhaseTimer = this.squashHoldTimeS;
    }
    
    private updateSquashPhysics(deltaTime: number): void {
      if (!this.isSquashing) return;

      if (this.squashPhase === 'compress') {
        this.squashPhaseTimer -= deltaTime;
        if (this.squashPhaseTimer <= 0) {
          this.squashPhase = 'hold';
          this.squashPhaseTimer = this.squashHoldTimeS;
        }
        return;
      }

      if (this.squashPhase === 'hold') {
        this.squashPhaseTimer -= deltaTime;
        if (this.squashPhaseTimer <= 0) {
          this.squashPhase = 'spring';
          this.squashSpringElapsed = 0;
        }
        return;
      }

      if (this.squashPhase === 'spring') {
        // ω/ζ spring back to original length
        const targetLength = this.originalLength;
        const displacement = this.config.length - targetLength;
        const omega = this.squashOmega;
        const zeta = this.squashZeta;
        const acceleration = -2 * zeta * omega * this.squashVelocity - (omega * omega) * displacement;

        // Integrate
        this.squashVelocity += acceleration * deltaTime;
        this.config.length += this.squashVelocity * deltaTime;
        this.squashSpringElapsed += deltaTime;

        // Animate line width back proportionally to recovery
        const lengthProgress = 1 - Math.abs(displacement) / Math.abs(this.originalLength * 0.9);
        const clampedProgress = Math.max(0, Math.min(1, lengthProgress));
        const widthMultiplier = 1.3;
        this.config.lineWidth = this.originalLineWidth * widthMultiplier - (this.originalLineWidth * (widthMultiplier - 1.0) * clampedProgress);

        // Stop when settled or after safety timeout
        const isSettled = Math.abs(displacement) < 0.01 && Math.abs(this.squashVelocity) < 0.01;
        if (isSettled || this.squashSpringElapsed > 1.5) {
          this.config.length = this.originalLength;
          this.config.lineWidth = this.originalLineWidth;
          this.isSquashing = false;
          this.squashVelocity = 0;
        }
      }
    }

    private deflectAnimation(): void {
      // Original deflection animation for side collisions (deterministic timer)
      this.isDeflecting = true;
      this.deflectionDirection = Math.random() > 0.5 ? 1 : -1;
      const maxAngle = (this.config.maxAngleDeg * Math.PI) / 180;
      this.thetaTarget = this.deflectionDirection * maxAngle;
      this.deflectTimer = this.deflectDuration;
    }

    onTriggerEnter(other: GameObject): void {
      // Only react to player
      if (other instanceof Player) {
        // Collect currency when player touches knob (handles animation internally)
        this.onCollected(other as Player);
      }
    }

    private startRelocation(): void {
      this.knobState = 'hidden';
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
      this.knobState = 'active';
      this.currentHits = 0;
      
      // Re-enable knob
      this.render.visible = true;
      if (this.collisionBox) {
        this.collisionBox.category = 'kinematic';
      }
    }
  }
}
