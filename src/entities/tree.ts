/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Tree extends GameObject {
    constructor(id: string, x: number = 0, y: number = 0) {
      // Keep the GameObject transform at the base position (origin point)
      super(id, x, y, 10, 30); 
      
      // Create element with old tree styling
      this.render = {
        type: 'element',
        visible: true,
        element: this.createTreeElement()
      };
      
      // Collision box positioned relative to the base origin
      this.collisionBox = {
        x: x - 4, // Center the 8px collision box on the 10px tree
        y: y - 25, // Position collision box from the base up 25px  
        width: 8,  // 8px collision width
        height: 25, // 25px collision height
        category: 'environment'
      };
    }

    private createTreeElement(): HTMLElement {
      const treeEl = document.createElement('div');
      treeEl.style.cssText = `
        position: absolute;
        top: -30px;
        left: 0;
        width: 10px;
        height: 30px;
        background: #8d6e63;
        border-radius: 2px;
      `;
      
      // Add foliage with ::after equivalent
      const foliage = document.createElement('div');
      foliage.style.cssText = `
        position: absolute;
        top: 0;
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
        this.collisionBox.y = this.transform.y - 25; // Position collision box 25px above the base origin
      }
    }
  }
}