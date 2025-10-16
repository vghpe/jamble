/// <reference path="../../core/game-object.ts" />
/// <reference path="../../core/utils/color-utils.ts" />
/// <reference path="player-anim.ts" />

namespace Jamble {
  export class Player extends GameObject {
    public velocityX: number = 0;
    public velocityY: number = 0;
    public grounded: boolean = false;
    public moveSpeed: number = 200; // pixels per second
    public jumpHeight: number = 300; // pixels per second
    
    // Autorunner state
    private lastDirection: 'left' | 'right' = 'right'; // Default to right
    private autoRunDirection: 'left' | 'right' = 'right';
    private isAutoRunning: boolean = false;
    
    // Visual positioning offsets for fine-tuning
    private readonly visualOffsetX: number = 0;
    private readonly visualOffsetY: number = 0;
    
    // Player attributes (controlled by control panel)
    private softness: number = 0; // -1 (square) to +1 (circle), 0 is current default (radius 8)
    private temperature: number = 0; // -1 (blue) to +1 (yellow), affects LAB B channel
    
    // LAB color constants
    private readonly baseLightness: number = 72;
    private readonly baseA: number = 60;
    
    // Animation driver
    private anim: PlayerAnim;

    constructor(x: number = 0, y: number = 0) {
      super('player', x, y);
      
      // Canvas rendering with custom drawing for offset control
      this.render = {
        type: 'canvas',
        visible: true,
        canvas: {
          color: '#4db6ac',
          shape: 'custom',
          width: 20,
          height: 20,
          customDraw: this.drawPlayer.bind(this)
        },
        // Anchor at bottom-center so scaling/pivot feels grounded
        anchor: { x: 0.5, y: 1 },
        animation: {
          scaleX: 1,
          scaleY: 1
        }
      };
      
      // Add collision box - center on the anchor (bottom-center)
      this.collisionBox = {
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        anchor: { x: 0.5, y: 1 },
        category: 'player'
      };

      // Create animation helper
      this.anim = new PlayerAnim(this);
    }

    update(deltaTime: number) {
      // Apply gravity
      if (!this.grounded) {
        this.velocityY += 800 * deltaTime; // gravity
      }

      // Update position based on velocity
      this.transform.x += this.velocityX * deltaTime;
      this.transform.y += this.velocityY * deltaTime;

      // Animation system (tweening, in-air stretch, landing squash)
      this.anim.update(deltaTime);

      // Collider world position is derived on demand by systems that need it.
    }

    moveLeft() {
      this.velocityX = -this.moveSpeed;
      this.lastDirection = 'left';
    }

    moveRight() {
      this.velocityX = this.moveSpeed;
      this.lastDirection = 'right';
    }

    stopMoving() {
      this.velocityX = 0;
    }

    // Autorunner methods
    startAutoRun() {
      if (!this.isAutoRunning) {
        this.isAutoRunning = true;
        this.autoRunDirection = this.lastDirection;
      }
      this.velocityX = this.autoRunDirection === 'left' ? -this.moveSpeed : this.moveSpeed;
    }

    stopAutoRun() {
      this.isAutoRunning = false;
      this.velocityX = 0;
    }

    // Collision callback for horizontal collisions
    onHorizontalCollision(side: 'left' | 'right', collider: any) {
      if (this.isAutoRunning) {
        // Reverse direction on side collisions
        this.autoRunDirection = this.autoRunDirection === 'left' ? 'right' : 'left';
        this.velocityX = this.autoRunDirection === 'left' ? -this.moveSpeed : this.moveSpeed;
      }
    }

    jump() {
      if (this.grounded) {
        this.velocityY = -this.jumpHeight;
        this.grounded = false;
      }
    }

    // Animation tweening is handled by PlayerAnim

    // Called by CollisionManager when we transition from air to grounded
    public onLanded(velocityYAtImpact: number = 0): void {
      this.anim.onLanded(velocityYAtImpact);
    }

    // Landing cancellation handled by PlayerAnim

    /**
     * Set player softness (-1 to +1).
     * -1 = square (radius 0), 0 = default (radius 8), +1 = circle (radius 16)
     */
    setSoftness(value: number): void {
      this.softness = Math.max(-1, Math.min(1, value));
    }

    getSoftness(): number {
      return this.softness;
    }

    /**
     * Set player temperature (-1 to +1).
     * -1 = blue, 0 = neutral pink, +1 = yellow (affects LAB B channel)
     */
    setTemperature(value: number): void {
      this.temperature = Math.max(-1, Math.min(1, value));
    }

    getTemperature(): number {
      return this.temperature;
    }

    /**
     * Calculate corner radius based on softness.
     * Maps softness (-1 to +1) to radius (0 to 16).
     */
    private getCornerRadius(): number {
      // softness: -1 → 0, 0 → 8, 1 → 16
      return 8 + (this.softness * 8);
    }

    /**
     * Get player color based on temperature using LAB color space.
     */
    private getPlayerColor(): string {
      // Map temperature (-1 to +1) to LAB B channel (-128 to +128)
      const b = this.temperature * 128;
      return ColorUtils.labToRgb(this.baseLightness, this.baseA, b);
    }

    /**
     * Get border color (20 points darker in lightness).
     */
    private getBorderColor(): string {
      const b = this.temperature * 128;
      return ColorUtils.getBorderColor(this.baseLightness, this.baseA, b, 20);
    }

    private drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
      // Apply visual offsets for precise positioning
      const drawX = x + this.visualOffsetX;
      const drawY = y + this.visualOffsetY;
      
      // Get dynamic color and radius based on attributes
      const radius = this.getCornerRadius();
      const fillColor = this.getPlayerColor();
      const borderColor = this.getBorderColor();
      
      // Draw border (slightly larger rounded rectangle)
      ctx.fillStyle = borderColor;
      this.drawRoundedRect(ctx, drawX - 1, drawY - 1, 22, 22, radius);
      
      // Draw main player body
      ctx.fillStyle = fillColor;
      this.drawRoundedRect(ctx, drawX, drawY, 20, 20, radius);
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
  }
}
