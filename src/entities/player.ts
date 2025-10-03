/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Player extends GameObject {
    public velocityX: number = 0;
    public velocityY: number = 0;
    public grounded: boolean = false;
    public moveSpeed: number = 200; // pixels per second
    public jumpHeight: number = 300; // pixels per second

    constructor(x: number = 0, y: number = 0) {
      super('player', x, y);
      
      // CSS shape instead of emoji
      this.render = {
        type: 'css-shape',
        visible: true,
        cssShape: {
          backgroundColor: '#4db6ac',
          borderRadius: '4px'
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

    private onLanding() {
      // Landing squash animation
      if (this.render.animation) {
        // Instant squash
        this.render.animation.scaleX = 1.4;
        this.render.animation.scaleY = 0.6;
        this.render.animation.transition = 'none';
        
        // Ease back to normal after brief delay
        setTimeout(() => {
          if (this.render.animation) {
            this.render.animation.scaleX = 1;
            this.render.animation.scaleY = 1;
            this.render.animation.transition = 'transform 150ms ease-out';
          }
        }, 50);
      }
    }
  }
}