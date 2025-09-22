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
  }

  export class KnobElement implements PositionableLevelElement {
    readonly id: string;
    readonly type: LevelElementType = 'knob';
    readonly el: HTMLElement;
    readonly collidable: boolean = false; // Non-collidable as requested
    
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
    
    // Cached calculations
    private basePos: { x: number; y: number } = { x: 0, y: 0 };
    private springPoints: { x: number; y: number }[] = [];

    constructor(id: string, el: HTMLElement, config?: Partial<KnobConfig>) {
      this.id = id;
      this.el = el;
      
      // Default configuration (scaled down from experiment)
      const defaults: KnobConfig = {
        length: 30,           // Much smaller than experiment's 300
        segments: 8,          // Fewer segments for performance
        omega: 8.0,           // Spring frequency
        zeta: 0.7,            // Damping (slightly overdamped)
        maxAngleDeg: 45,      // Maximum deflection
        bowFactor: 0.3,       // Moderate curve bow
        lineWidth: 2,         // Thin line for small size
        knobColor: '#ff968f', // Matching experiment color
        baseRadius: 2,        // Small base
        showPoints: false     // No debug points by default
      };
      
      this.config = { ...defaults, ...config };
      
      // Create canvas for rendering the spring
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'jamble-knob-canvas';
      this.canvas.style.cssText = `
        position: absolute;
        top: 0;
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
    }

    private setupElementStyle(): void {
      this.el.classList.add('jamble-knob');
      this.el.style.cssText = `
        position: absolute;
        width: ${this.config.length * 1.5}px;
        height: ${this.config.length * 1.5}px;
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
      const size = this.config.length * 1.5;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      
      this.canvas.width = size * ratio;
      this.canvas.height = size * ratio;
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      
      // Center the base position
      this.basePos.x = size * 0.5;
      this.basePos.y = size * 0.8; // Slightly towards bottom
    }

    activate(): void {
      this.el.style.display = this.defaultDisplay;
      this.lastTickTime = performance.now();
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
      
      this.updatePhysics(dt);
      this.updateSpringPoints();
      this.render();
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
      const size = this.config.length * 1.5;
      this.ctx.clearRect(0, 0, size, size);
      
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

    public updateConfig(newConfig: Partial<KnobConfig>): void {
      this.config = { ...this.config, ...newConfig };
      this.setupElementStyle();
      this.setupCanvas();
    }

    public getCurrentAngleDeg(): number {
      return (this.theta * 180) / Math.PI;
    }

    dispose(): void {
      if (this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
    }
  }
}