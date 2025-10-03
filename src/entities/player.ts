/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Player extends GameObject {
    public velocityX: number = 0;
    public velocityY: number = 0;
    public grounded: boolean = false;
    public moveSpeed: number = 200; // pixels per second
    public jumpHeight: number = 300; // pixels per second

    constructor(x: number = 0, y: number = 0) {
      super('player', x, y, 20, 20);
      this.render.emoji = '🟦'; // Blue square for player
      
      // Add collision box
      this.collisionBox = {
        x: 0,
        y: 0,
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

      // Simple ground collision (at bottom of game area)
      if (this.transform.y + this.transform.height >= 100) {
        this.transform.y = 100 - this.transform.height;
        this.velocityY = 0;
        this.grounded = true;
      } else {
        this.grounded = false;
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
  }
}