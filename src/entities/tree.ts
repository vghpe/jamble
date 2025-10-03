/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Tree extends GameObject {
    constructor(id: string, x: number = 0, y: number = 0) {
      // Origin is at the base of the tree stem, so we need to adjust the GameObject position
      // The tree is 30px tall, so we position it 30px above the origin point
      super(id, x, y - 30, 10, 30); // Position the tree 30px above the origin
      
      // Create element with old tree styling
      this.render = {
        type: 'element',
        visible: true,
        element: this.createTreeElement()
      };
      
      // Collision box should also be positioned relative to the base origin
      this.collisionBox = {
        x: x - 4, // Center the 8px collision box on the 10px tree (x - width/2 + tree_width/2 = x - 4 + 5 = x + 1, but we want x - 4 for centering)
        y: y - 25, // Position collision box from the base up 25px  
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
      // But we still update collision box position relative to the base origin
      if (this.collisionBox) {
        // Collision box is centered on the base origin and extends upward
        this.collisionBox.x = this.transform.x + 1; // Center 8px collision box on 10px tree (offset by 1px)
        this.collisionBox.y = this.transform.y + 5; // Position collision 5px down from top of tree (30px - 25px = 5px)
      }
    }
  }
}