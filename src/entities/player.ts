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
      // Apply gravity
      if (!this.grounded) {
        this.velocityY += 800 * deltaTime; // gravity
      }

      // Update position based on velocity
      this.transform.x += this.velocityX * deltaTime;
      this.transform.y += this.velocityY * deltaTime;

      // Update animation tweening
      this.updateAnimationTweening(deltaTime);

      // Update collision box position from anchor
      if (this.collisionBox) {
        const cb = this.collisionBox;
        const ax = cb.anchor?.x ?? 0;
        const ay = cb.anchor?.y ?? 0;
        cb.x = this.transform.x - ax * cb.width;
        cb.y = this.transform.y - ay * cb.height;
      }

      // Simple ground collision (at bottom of game area) using collision box
      if (this.collisionBox) {
        const bottomOfPlayer = this.collisionBox.y + this.collisionBox.height;
        if (bottomOfPlayer >= 100) {
          const wasInAir = !this.grounded;
          // Adjust transform so anchor (bottom-center) sits on ground
          this.transform.y = 100 - this.collisionBox.height - (this.collisionBox.y - this.transform.y);
          this.velocityY = 0;
          this.grounded = true;
          
          // Trigger landing animation if we just landed
          if (wasInAir) {
            this.onLanding();
          }
        } else {
          this.grounded = false;
        }
      }

      // Horizontal boundaries are handled centrally in Game using the collider
      // (no transform-based clamping here)
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

    private onLanding(): void {
      // Trigger squash-and-stretch landing animation
      const animation = this.render.animation;
      if (!animation) return;
      
      // Immediate squash effect
      animation.scaleX = 1.4;
      animation.scaleY = 0.6;
      this.targetScaleX = 1.4;
      this.targetScaleY = 0.6;
      
      // Recover to normal scale after brief squash
      setTimeout(() => {
        this.targetScaleX = 1;
        this.targetScaleY = 1;
      }, 50);
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
