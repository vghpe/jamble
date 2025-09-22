/// <reference path="./types.ts" />
/// <reference path="../slots/slot-layout-manager.ts" />

namespace Jamble {
  export interface KnobConfig {
    length: number;          // Spring length in pixels
    segments: number;        // Number of curve segments  
    omega: number;           // Spring frequency
    zeta: number;            // Damping coefficient
    maxAngleDeg: number;     // Maximum deflection angle
    bowFactor: number;       // Curve bow amount
    lineWidth: number;       // Stroke width
    knobColor: string;       // Spring and knob color
    baseRadius: number;      // Base circle radius
    showPoints: boolean;     // Debug: show control points
    visualOffsetY: number;   // Visual Y offset in pixels (positive = down)
  }

  export class KnobElement implements PositionableLevelElement {
    readonly id: string;
    readonly type: LevelElementType = 'knob';
    readonly el: HTMLElement;
    readonly collidable: boolean = true; // Enable collision detection
    readonly deadly: boolean = false;    // Harmless - collision doesn't cause death
    
    private config: KnobConfig;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private initialized: boolean = false;
    private defaultDisplay: string = '';
    
    // Spring physics state
    private theta: number = 0;           // Current angle
    private thetaDot: number = 0;        // Angular velocity  
    private thetaTarget: number = 0;     // Target angle
    private lastTickTime: number = 0;
    
    // Player collision state
    private collisionState: 'none' | 'left' | 'right' = 'none';
    private lastPlayerCenter: number = 0; // Track player center for side detection
    
    // Cached calculations
    private basePos: { x: number; y: number } = { x: 0, y: 0 };
    private springPoints: { x: number; y: number }[] = [];

    constructor(id: string, el: HTMLElement, config?: Partial<KnobConfig>) {
      this.id = id;
      this.el = el;
      
      // Default configuration (scaled down from experiment)
      const defaults: KnobConfig = {
        length: 10,           // Match experiment default
        segments: 6,          // Same as experiment  
        omega: 18.0,          // Much higher frequency (was 6.0)
        zeta: 0.25,           // Much less damping (was 0.8)
        maxAngleDeg: 85,      // Much larger deflection (was 30)
        bowFactor: 0.35,      // More bow curve (was 0.2)
        lineWidth: 12,        // Thicker line width
        knobColor: '#ff968f', // Same spring color
        baseRadius: 3,        // Same base size
        showPoints: false,    // No debug points
        visualOffsetY: 4      // Visual offset down in pixels
      };
      
      this.config = { ...defaults, ...config };
      
      // Create canvas for rendering the spring
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'jamble-knob-canvas';
      this.canvas.style.cssText = `
        position: absolute;
        top: ${this.config.visualOffsetY}px;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      `;
      
      const ctx = this.canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context for knob canvas');
      this.ctx = ctx;
      
      this.el.appendChild(this.canvas);
      this.setupElementStyle();
      
      // Store reference for debug menu access
      (this.el as any).__knob_instance = this;
    }

    private setupElementStyle(): void {
      this.el.classList.add('jamble-knob');
      // Fixed size - don't tie to spring length to avoid positioning issues
      const elementSize = 60; // Fixed size regardless of spring physics length
      this.el.style.cssText = `
        position: absolute;
        width: ${elementSize}px;
        height: ${elementSize}px;
        pointer-events: none;
      `;
    }

    rect(): DOMRect { 
      return this.el.getBoundingClientRect(); 
    }

    setLeftPct(pct: number): void {
      const n = Math.max(0, Math.min(100, pct));
      this.el.style.left = n.toFixed(1) + '%';
    }

    init(): void {
      if (this.initialized) return;
      this.initialized = true;
      
      const current = this.el.style.display;
      this.defaultDisplay = current && current !== 'none' ? current : 'block';
      this.el.style.display = 'none';
      
      this.setupCanvas();
    }

    private setupCanvas(): void {
      const elementSize = 60; // Fixed size to match setupElementStyle
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      
      this.canvas.width = elementSize * ratio;
      this.canvas.height = elementSize * ratio;
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      
      // Position base at bottom center
      this.basePos.x = elementSize * 0.5;
      this.basePos.y = elementSize * 0.9; // Near bottom
    }

    activate(): void {
      this.el.style.display = this.defaultDisplay;
      this.lastTickTime = performance.now();
      
      // Give it a small impulse to start moving
      this.applyImpulse(1);
      
      // Force an immediate render
      this.updateSpringPoints();
      this.render();
    }

    deactivate(): void {
      this.el.style.display = 'none';
    }

    tick(ctx: LevelElementTickContext): void {
      const now = performance.now();
      if (this.lastTickTime === 0) this.lastTickTime = now;
      
      let dt = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;
      
      // Clamp delta time to prevent instability
      dt = Math.max(0.001, Math.min(dt, 1/30));
      
      // Check for collision exit
      this.checkCollisionExit();
      
      this.updatePhysics(dt);
      this.updateSpringPoints();
      this.render();
    }

    private checkCollisionExit(): void {
      // Only check if we're currently in a collision state
      if (this.collisionState === 'none') return;
      
      // Get player and knob positions
      const playerEl = document.querySelector('.jamble-player') as HTMLElement;
      if (!playerEl) {
        // Player not found, end collision
        this.endCollision();
        return;
      }

      const playerRect = playerEl.getBoundingClientRect();
      const knobRect = this.el.getBoundingClientRect();
      
      // Check if player is still colliding with knob
      const stillColliding = 
        playerRect.left < knobRect.right && 
        playerRect.right > knobRect.left && 
        playerRect.bottom > knobRect.top && 
        playerRect.top < knobRect.bottom;
      
      if (!stillColliding) {
        // Collision ended
        this.handleCollisionExit();
      }
    }

    private handleCollisionExit(): void {
      if (this.collisionState === 'none') return;
      
      // Reset collision state
      this.collisionState = 'none';
      
      // Trigger collision end behavior (same as button release)
      this.endCollision();
    }

    private updatePhysics(dt: number): void {
      // Spring physics from experiment
      // F = -k*x - c*v where k = omega^2, c = 2*zeta*omega
      const acceleration = 
        -2 * this.config.zeta * this.config.omega * this.thetaDot -
        this.config.omega * this.config.omega * (this.theta - this.thetaTarget);
      
      this.thetaDot += acceleration * dt;
      this.theta += this.thetaDot * dt;
    }

    private updateSpringPoints(): void {
      const tipX = this.basePos.x + this.config.length * Math.sin(this.theta);
      const tipY = this.basePos.y - this.config.length * Math.cos(this.theta);
      
      // Create curved spring using quadratic bezier (from experiment)
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

    private render(): void {
      const elementSize = 60; // Fixed size to match canvas size
      this.ctx.clearRect(0, 0, elementSize, elementSize);
      
      // Draw spring curve
      this.ctx.save();
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = this.config.knobColor;
      this.ctx.lineWidth = this.config.lineWidth;
      
      this.ctx.beginPath();
      if (this.springPoints.length > 0) {
        this.ctx.moveTo(this.springPoints[0].x, this.springPoints[0].y);
        
        // Smooth curve through points
        for (let i = 1; i < this.springPoints.length - 1; i++) {
          const midX = 0.5 * (this.springPoints[i].x + this.springPoints[i + 1].x);
          const midY = 0.5 * (this.springPoints[i].y + this.springPoints[i + 1].y);
          this.ctx.quadraticCurveTo(this.springPoints[i].x, this.springPoints[i].y, midX, midY);
        }
        
        if (this.springPoints.length > 1) {
          const last = this.springPoints[this.springPoints.length - 1];
          this.ctx.lineTo(last.x, last.y);
        }
      }
      this.ctx.stroke();
      
      // Draw base knob
      this.ctx.fillStyle = this.config.knobColor;
      this.ctx.beginPath();
      this.ctx.arc(this.basePos.x, this.basePos.y, this.config.baseRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Debug: show control points
      if (this.config.showPoints) {
        this.ctx.fillStyle = '#e7e7ea';
        for (const point of this.springPoints) {
          this.ctx.beginPath();
          this.ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      
      this.ctx.restore();
    }

    // Public API for external interaction (future use)
    public applyImpulse(force: number): void {
      this.thetaDot += force;
    }

    public setTarget(angleDeg: number): void {
      const maxAngle = (this.config.maxAngleDeg * Math.PI) / 180;
      this.thetaTarget = Math.max(-maxAngle, Math.min(maxAngle, (angleDeg * Math.PI) / 180));
    }

    public beginCollision(direction: number): void {
      // direction: 1 for left collision (push right), -1 for right collision (push left)  
      const maxAngle = (this.config.maxAngleDeg * Math.PI) / 180;
      this.thetaTarget = direction * maxAngle;
      
      // Trigger emoji reaction
      this.triggerEmojiReaction('colliding');
    }

    public endCollision(): void {
      // Return to center when collision ends
      this.thetaTarget = 0;
      
      // Trigger emoji reaction
      this.triggerEmojiReaction('post');
    }

    private triggerEmojiReaction(state: 'colliding' | 'post'): void {
      // Access the game instance through the global reference
      const gameInstance = (window as any).__game;
      if (gameInstance && typeof gameInstance.triggerEmojiReaction === 'function') {
        gameInstance.triggerEmojiReaction(state);
      }
    }

    public updateConfig(newConfig: Partial<KnobConfig>): void {
      this.config = { ...this.config, ...newConfig };
      
      // Update canvas position if visualOffsetY changed
      if ('visualOffsetY' in newConfig) {
        this.canvas.style.top = `${this.config.visualOffsetY}px`;
      }
      
      // Only call setupCanvas, not setupElementStyle to avoid repositioning
      this.setupCanvas();
      
      // Force immediate re-render with new config
      this.updateSpringPoints();
      this.render();
    }

    public getCurrentAngleDeg(): number {
      return (this.theta * 180) / Math.PI;
    }

    getOrigin(): ElementOrigin {
      // Anchor the knob at its base position (where the spring attaches)
      // This matches where the spring base is drawn (center-x, 90% down)
      return { x: 0.5, y: 0.9, xUnit: 'fraction', yUnit: 'fraction' };
    }

    onCollision(ctx: LevelElementCollisionContext): void {
      // Get player position to determine collision side
      const playerEl = document.querySelector('.jamble-player') as HTMLElement;
      if (!playerEl) return;

      const playerRect = playerEl.getBoundingClientRect();
      const knobRect = this.el.getBoundingClientRect();
      
      // Calculate player center and knob center
      const playerCenter = playerRect.left + playerRect.width / 2;
      const knobCenter = knobRect.left + knobRect.width / 2;
      
      // Determine collision side based on player center relative to knob center
      const side: 'left' | 'right' = playerCenter < knobCenter ? 'left' : 'right';
      
      // Handle collision state changes
      if (this.collisionState === 'none') {
        // Collision enter
        this.collisionState = side;
        this.lastPlayerCenter = playerCenter;
        
        // Trigger collision behavior (same as button press)
        const direction = side === 'left' ? 1 : -1; // left collision pushes right (+1), right collision pushes left (-1)
        this.beginCollision(direction);
        
      } else if (this.collisionState !== side) {
        // Side changed during collision - unusual but handle gracefully
        this.collisionState = side;
        const direction = side === 'left' ? 1 : -1;
        this.beginCollision(direction);
      }
      
      // Update player center tracking
      this.lastPlayerCenter = playerCenter;
    }

    dispose(): void {
      // Clean up reference
      delete (this.el as any).__knob_instance;
      
      if (this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }
  }
}