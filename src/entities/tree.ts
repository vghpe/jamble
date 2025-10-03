/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Tree extends GameObject {
    constructor(id: string, x: number = 0, y: number = 0) {
      super(id, x, y, 10, 30); // Back to original 10px wide × 30px tall
      
      // Create element with old tree styling
      this.render = {
        type: 'element',
        visible: true,
        element: this.createTreeElement()
      };
      
      // Use original collision dimensions with 0.8 scale (8px wide × 25px tall)
      this.collisionBox = {
        x: x,
        y: y,
        width: 8,  // 10 * 0.8 = 8px collision width
        height: 25, // 30 * 0.83 ≈ 25px collision height
        category: 'environment'
      };
    }

    private createTreeElement(): HTMLElement {
      const treeEl = document.createElement('div');
      treeEl.style.cssText = `
        position: absolute;
        bottom: 0;
        width: 10px;
        height: 30px;
        background: #8d6e63;
        border-radius: 2px;
      `;
      
      // Add foliage with ::after equivalent
      const foliage = document.createElement('div');
      foliage.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: -5px;
        width: 20px;
        height: 20px;
        background: #66bb6a;
        border-radius: 50%;
      `;
      
      treeEl.appendChild(foliage);
      return treeEl;
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