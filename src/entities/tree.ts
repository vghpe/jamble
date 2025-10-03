/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Tree extends GameObject {
    constructor(id: string, x: number = 0, y: number = 0) {
      super(id, x, y, 30, 40);
      
      // CSS shape instead of emoji
      this.render = {
        type: 'css-shape',
        visible: true,
        cssShape: {
          backgroundColor: '#388e3c',
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' // Tree-like shape
        },
        animation: {
          scaleX: 1,
          scaleY: 1
        }
      };
      
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