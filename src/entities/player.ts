/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Player extends GameObject {
    public velocityX: number = 0;
    public velocityY: number = 0;
    public grounded: boolean = false;
    public moveSpeed: number = 200; // pixels per second
    public jumpHeight: number = 300; // pixels per second
    
    // Animation system
    private targetScaleX: number = 1;
    private targetScaleY: number = 1;
    private readonly animationSpeed: number = 8;

    constructor(x: number = 0, y: number = 0) {
      super('player', x, y);
      
      // Canvas rendering with rounded rectangle
      this.render = {
        type: 'canvas',
        visible: true,
        canvas: {
          color: '#4db6ac',
          shape: 'rectangle',
          width: 20,
          height: 20,
          borderRadius: 4
        },
        animation: {
          scaleX: 1,
          scaleY: 1
        }
      };
      
      // Add collision box - position it at the same location as the transform
      this.collisionBox = {
        x: x,
        y: y,
        width: 20,
        height: 20,
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

      // Update collision box position
      if (this.collisionBox) {
        this.collisionBox.x = this.transform.x;
        this.collisionBox.y = this.transform.y;
      }

      // Simple ground collision (at bottom of game area) using collision box
      if (this.collisionBox) {
        const bottomOfPlayer = this.collisionBox.y + this.collisionBox.height;
        if (bottomOfPlayer >= 100) {
          const wasInAir = !this.grounded;
          // Adjust transform position to keep collision box at ground level
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

      // Keep player in bounds horizontally
      if (this.transform.x < 0) {
        this.transform.x = 0;
        this.velocityX = 0;
      }
      // Note: Right boundary will be handled by game bounds
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
  }
}