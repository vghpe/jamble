/// <reference path="../core/game-object.ts" />

namespace Jamble {
  export class Sensor extends GameObject {
    private target?: GameObject;  // Optional - null for static sensors
    private offsetX: number;
    private offsetY: number;
    
    constructor(id: string, target?: GameObject, offsetX: number = 0, offsetY: number = 0) {
      // Initial position - either from target or provided coordinates
      const initX = target ? target.transform.x + offsetX : offsetX;
      const initY = target ? target.transform.y + offsetY : offsetY;
      
      super(id, initX, initY);
      
      this.target = target;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      
      // No visual rendering - invisible sensor
      this.render.visible = false;
      
      // Default kinematic collider for triggers
      this.collisionBox = {
        x: 0,
        y: 0,
        width: 20,
        height: 5, // Thin horizontal sensor
        anchor: { x: 0.5, y: 1 }, // Bottom center
        category: 'kinematic'
      };
    }
    
    update(deltaTime: number): void {
      // Follow target if attached, otherwise stay static
      if (this.target) {
        this.transform.x = this.target.transform.x + this.offsetX;
        this.transform.y = this.target.transform.y + this.offsetY;
      }
    }
    
    // Helper to set trigger behavior
    setTriggerSize(width: number, height: number) {
      if (this.collisionBox) {
        this.collisionBox.width = width;
        this.collisionBox.height = height;
      }
    }
  }
}