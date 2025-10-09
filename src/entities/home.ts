/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Home extends GameObject {
    constructor(id: string, x: number = 0, y: number = 0) {
      // Transform represents the base (bottom-center) position
      super(id, x, y);

      this.render = {
        type: 'canvas',
        visible: true,
        canvas: {
          color: '#ffd54f', // Yellow color
          shape: 'rectangle',
          width: 60, // About 3 times the player width (20 * 3)
          height: 20 // Same height as the player
        },
        anchor: { x: 0.5, y: 1 } // Bottom center anchor
      };

      // Solid collider, anchored at bottom-center
      this.collisionBox = {
        x: 0,
        y: 0,
        width: 50,
        height: 20,
        anchor: { x: 0.5, y: 1 },
        category: 'environment'
      };
    }

    update(deltaTime: number): void {
      // Static home — nothing to update per frame.
    }
  }
}