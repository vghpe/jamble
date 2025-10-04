/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Platform extends GameObject {
    constructor(id: string, x: number = 0, y: number = 0) {
      // Transform represents the base (bottom-center) position
      super(id, x, y);

      this.render = {
        type: 'canvas',
        visible: true,
        canvas: {
          color: '#9e9e9e',
          shape: 'rectangle',
          width: 20,
          height: 20
        },
        anchor: { x: 0.5, y: 1 }
      };

      // Solid collider, anchored at bottom-center
      this.collisionBox = {
        x: x - 10,
        y: y - 20,
        width: 20,
        height: 20,
        anchor: { x: 0.5, y: 1 },
        category: 'environment'
      };
    }

    update(deltaTime: number): void {
      // Static platform — nothing to update per frame.
    }
  }
}
