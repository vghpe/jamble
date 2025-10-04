/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Player extends GameObject {
    public velocityX: number = 0;
    public velocityY: number = 0;
    public grounded: boolean = false;
    public moveSpeed: number = 200; // pixels per second
    public jumpHeight: number = 300; // pixels per second
    
    // Visual positioning offsets for fine-tuning
    private readonly visualOffsetX: number = 0;
    private readonly visualOffsetY: number = 0;
    
    // Animation system
    private targetScaleX: number = 1;
    private targetScaleY: number = 1;
    private readonly animationSpeed: number = 8;

    // Air stretch/squash and landing tuning (inspired by archive CSS)
    private readonly airStretchFactor: number = 0.05; // scales with upward velocity units
    private readonly airSquashFactor: number = 0.02;
    private readonly airVelocityUnit: number = 40; // px/s mapped to ~1 velocity unit
    private readonly landScaleX: number = 1.4;
    private readonly landScaleY: number = 0.6;
    private readonly landSquashDurationMs: number = 150;
    private landingActive: boolean = false;
    private landingTimeoutId: number | null = null;

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
        x: x - 10,
        y: y - 20,
        width: 20,
        height: 20,
        anchor: { x: 0.5, y: 1 },
        category: 'player'
      };
    }

    update(deltaTime: number) {
      // If we left the ground while a landing hold is active, cancel it immediately
      if (!this.grounded && this.landingActive) {
        this.cancelLandingHold();
      }
      // Apply gravity
      if (!this.grounded) {
        this.velocityY += 800 * deltaTime; // gravity
      }

      // Update position based on velocity
      this.transform.x += this.velocityX * deltaTime;
      this.transform.y += this.velocityY * deltaTime;

      // Update animation tweening (targetScaleX/Y controls easing back to 1)
      this.updateAnimationTweening(deltaTime);

      // In-air stretch based on upward speed (negative velocityY means going up)
      if (!this.grounded && !this.landingActive) {
        const vUnits = Math.max(0, -this.velocityY / this.airVelocityUnit); // >= 0 when moving up
        const stretchY = 1 + vUnits * this.airStretchFactor;
        const squashX = 1 - vUnits * this.airSquashFactor;
        const anim = this.render.animation!;
        anim.scaleX = squashX;
        anim.scaleY = stretchY;
        // Keep targets in sync to avoid the tweener fighting the in-air pose
        this.targetScaleX = squashX;
        this.targetScaleY = stretchY;
      }

      // Collider world position is derived on demand by systems that need it.
    }

    moveLeft() {
      this.velocityX = -this.moveSpeed;
    }

    moveRight() {
      this.velocityX = this.moveSpeed;
    }

    stopMoving() {
      this.velocityX = 0;
    }

    jump() {
      if (this.grounded) {
        this.velocityY = -this.jumpHeight;
        this.grounded = false;
      }
    }

    private updateAnimationTweening(deltaTime: number): void {
      const animation = this.render.animation;
      if (!animation) return;
      
      // Exponential smoothing for natural animation curves
      const lerpFactor = 1 - Math.pow(0.001, deltaTime * this.animationSpeed);
      
      animation.scaleX += (this.targetScaleX - animation.scaleX) * lerpFactor;
      animation.scaleY += (this.targetScaleY - animation.scaleY) * lerpFactor;
    }

    // Called by CollisionManager when we transition from air to grounded
    public onLanded(velocityYAtImpact: number = 0): void {
      // Trigger squash-and-stretch landing animation (archive-inspired)
      // Trigger squash-and-stretch landing animation
      const animation = this.render.animation;
      if (!animation) return;
      
      // Scale squash amount with impact speed (linear up to full at ~500 px/s)
      const fullSpeed = 500; // px/s → reach configured squash at ~this speed
      const ratio = Math.max(0, Math.min(1, Math.abs(velocityYAtImpact) / fullSpeed));
      const sx = 1 + (this.landScaleX - 1) * ratio;
      const sy = 1 - (1 - this.landScaleY) * ratio;

      // Immediate squash effect at computed intensity
      animation.scaleX = sx;
      animation.scaleY = sy;
      this.targetScaleX = sx;
      this.targetScaleY = sy;
      this.landingActive = true;
      // Ensure any previous landing timer is cleared
      if (this.landingTimeoutId !== null) {
        clearTimeout(this.landingTimeoutId);
        this.landingTimeoutId = null;
      }

      // Hold the squash briefly, then ease back toward 1 using the tweener
      this.landingTimeoutId = setTimeout(() => {
        this.targetScaleX = 1;
        this.targetScaleY = 1;
        this.landingActive = false;
        this.landingTimeoutId = null;
      }, this.landSquashDurationMs) as unknown as number;
    }

    private cancelLandingHold(): void {
      this.landingActive = false;
      if (this.landingTimeoutId !== null) {
        clearTimeout(this.landingTimeoutId);
        this.landingTimeoutId = null;
      }
      // Keep current animation values; in-air update will override this frame
      const anim = this.render.animation!;
      this.targetScaleX = anim.scaleX;
      this.targetScaleY = anim.scaleY;
    }

    private drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
      // Apply visual offsets for precise positioning
      const drawX = x + this.visualOffsetX;
      const drawY = y + this.visualOffsetY;
      
      // Draw rounded rectangle player
      ctx.fillStyle = '#4db6ac';
      this.drawRoundedRect(ctx, drawX, drawY, 20, 20, 4);
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
