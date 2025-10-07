/// <reference path="../core/game-object.ts" />
/// <reference path="../systems/economy-manager.ts" />

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
    
    // Squash animation state (separate physics system)
    private isSquashing: boolean = false;
    private squashStartTime: number = 0;
    private squashPhase: 'compress' | 'hold' | 'spring' = 'compress';
    private originalLength: number = 0;
    private squashVelocity: number = 0;
    private originalLineWidth: number = 0;
    private currentLineWidth: number = 0;

    constructor(id: string, x: number = 0, y: number = 0) {
      // Anchor the knob at the given position (slot). We'll use
      // bottom-center as the anchor so the slot aligns with the base.
      super(id, x, y);
      
      this.economyManager = EconomyManager.getInstance();
      
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
      this.updateSpringPhysics(deltaTime);
      this.updateSquashPhysics(deltaTime); // Separate physics system for top collisions
      this.updateSpringPoints();
    }

    private updateSpringPhysics(deltaTime: number): void {
      // Original archive spring physics: F = -k*x - c*v where k = omega^2, c = 2*zeta*omega
      const acceleration = 
        -2 * this.config.zeta * this.config.omega * this.thetaDot -
        this.config.omega * this.config.omega * (this.theta - this.thetaTarget);
      
      this.thetaDot += acceleration * deltaTime;
      this.theta += this.thetaDot * deltaTime;
      
      // Update spring points for rendering
      this.updateSpringPoints();
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
      this.deflectionDirection = direction;
      
      // Set target deflection angle (use original maxAngleDeg)
      const maxAngle = (this.config.maxAngleDeg * Math.PI) / 180;
      this.thetaTarget = direction * maxAngle;
      
      // Stop deflecting after animation completes
      setTimeout(() => {
        this.isDeflecting = false;
        this.thetaTarget = 0; // Return to center
      }, 200);
    }

    onCollected(player: Player): number {
      const collisionType = this.detectCollisionType(player);
      let currencyAmount = this.currencyValue; // Default side collision value (1)
      
      if (collisionType === 'top') {
        currencyAmount = 5; // Top collision gives 5 points
        this.squashAnimation();
      } else {
        this.deflectAnimation();
      }
      
      this.economyManager.addCurrency(currencyAmount);
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
      // Start physics-based squash animation
      this.isSquashing = true;
      this.squashStartTime = Date.now();
      this.squashPhase = 'compress';
      this.originalLength = this.config.length;
      this.originalLineWidth = this.config.lineWidth;
      this.squashVelocity = 0;
      
      // Tuned squash amount
      const squashPercent = 4;
      this.config.length = this.originalLength * (squashPercent / 100);
      
      // Make it wider when squashed - tuned value
      const widthMultiplier = 1.3;
      this.config.lineWidth = this.originalLineWidth * widthMultiplier;
      this.currentLineWidth = this.config.lineWidth;
    }
    
    private updateSquashPhysics(deltaTime: number): void {
      if (!this.isSquashing) return;
      
      const elapsed = Date.now() - this.squashStartTime;
      
      // Tuned hold time
      const holdTime = 150;
      
      if (this.squashPhase === 'compress') {
        // Hold compressed state for specified time
        if (elapsed >= holdTime) {
          this.squashPhase = 'hold';
          this.squashStartTime = Date.now(); // Reset timer for hold phase
        }
      } else if (this.squashPhase === 'hold') {
        // Hold compressed for specified time
        if (elapsed >= holdTime) {
          this.squashPhase = 'spring';
          this.squashStartTime = Date.now(); // Reset timer for spring phase
        }
      } else if (this.squashPhase === 'spring') {
        // Physics-based spring back over ~3 seconds
        const springElapsed = elapsed / 1000; // Convert to seconds
        const targetLength = this.originalLength;
        const currentLength = this.config.length;
        
        // Spring physics constants - tuned values
        const springConstant = 605.0;
        const damping = 7.5;
        
        // Calculate spring force for length
        const displacement = currentLength - targetLength;
        const springForce = -springConstant * displacement;
        const dampingForce = -damping * this.squashVelocity;
        const totalForce = springForce + dampingForce;
        
        // Update velocity and position (Euler integration)
        this.squashVelocity += totalForce * deltaTime;
        this.config.length += this.squashVelocity * deltaTime;
        
        // Animate line width back to original (proportional to length recovery)
        const lengthProgress = 1 - Math.abs(displacement) / Math.abs(this.originalLength * 0.9);
        const clampedProgress = Math.max(0, Math.min(1, lengthProgress));
        const widthMultiplier = 1.3;
        this.config.lineWidth = this.originalLineWidth * widthMultiplier - (this.originalLineWidth * (widthMultiplier - 1.0) * clampedProgress);
        
        // Stop animation when settled (close to target and low velocity) - ultra tight for fastest settling
        const isSettled = Math.abs(displacement) < 0.01 && Math.abs(this.squashVelocity) < 0.01;
        if (isSettled || springElapsed > 1.5) { // Max 1.5 seconds for even faster settling
          // Animation complete
          this.config.length = this.originalLength;
          this.config.lineWidth = this.originalLineWidth; // Reset width
          this.isSquashing = false;
          this.squashVelocity = 0;
        }
      }
    }

    private deflectAnimation(): void {
      // Original deflection animation for side collisions
      this.isDeflecting = true;
      
      // Set target deflection angle (use original maxAngleDeg)
      const maxAngle = (this.config.maxAngleDeg * Math.PI) / 180;
      this.thetaTarget = (Math.random() > 0.5 ? 1 : -1) * maxAngle;
      
      // Stop deflecting after animation completes
      setTimeout(() => {
        this.isDeflecting = false;
        this.thetaTarget = 0; // Return to center
      }, 200);
    }

    onTriggerEnter(other: GameObject): void {
      // Only react to player
      if (other instanceof Player) {
        // Collect currency when player touches knob (handles animation internally)
        this.onCollected(other as Player);
      }
    }
  }
}
