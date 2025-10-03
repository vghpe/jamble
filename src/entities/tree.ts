/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Tree extends GameObject {
    constructor(id: string, x: number = 0, y: number = 0) {
      super(id, x, y, 30, 40);
      this.render.emoji = '🌳';
      
      // Add collision box
      this.collisionBox = {
        x: x,
        y: y,
        width: 30,
        height: 40,
        category: 'environment'
      };
    }

    update(deltaTime: number) {
      // Trees are static - no update logic needed
      // But we still update collision box in case the tree moves
      if (this.collisionBox) {
        this.collisionBox.x = this.transform.x;
        this.collisionBox.y = this.transform.y;
      }
    }
  }
}