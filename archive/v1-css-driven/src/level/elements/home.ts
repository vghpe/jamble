/// <reference path="./types.ts" />
/// <reference path="../../game/collision-manager.ts" />

namespace Jamble {
  export class HomeElement implements PositionableLevelElement, TransformLevelElement {
    readonly id: string;
    readonly type: LevelElementType = 'home';
    readonly el: HTMLElement;
    readonly collidable: boolean = true;
    readonly deadly: boolean = false;     // Home is safe - not deadly
    
    // Transform-based properties
    private transform: ElementTransform;
    private collisionConfig: CollisionConfig;

    constructor(id: string, el: HTMLElement){
      this.id = id;
      this.el = el;
      this.el.classList.add('jamble-home');
      this.el.setAttribute('aria-hidden', 'true');
      
      // Home dimensions: height of player (20px) and width of 2x player (40px)
      // Position at bottom left
      this.transform = {
        x: 20, // Left side with some padding
        y: 0,  // At bottom (ground level)
        width: 40,  // 2x player width
        height: 20  // Player height
      };
      
      // Collision config for the platform
      this.collisionConfig = {
        shape: 'rect',
        scaleX: 1,
        scaleY: 1,
        offsetX: 0,
        offsetY: 0
      };

      // Set initial visual position
      this.syncVisualToTransform();
    }

    rect(): DOMRect {
      return this.el.getBoundingClientRect();
    }

    // TransformElement interface implementation
    getTransform(): ElementTransform {
      return { ...this.transform };
    }

    getCollisionConfig(): CollisionConfig {
      return { ...this.collisionConfig };
    }

    syncVisualToTransform(): void {
      // Position the home element at bottom left
      this.el.style.position = 'absolute';
      this.el.style.left = `${this.transform.x}px`;
      this.el.style.bottom = '0px'; // At ground level
      this.el.style.width = `${this.transform.width}px`;
      this.el.style.height = `${this.transform.height}px`;
      this.el.style.backgroundColor = '#8B4513'; // Brown color for platform
      this.el.style.border = '1px solid #654321';
      this.el.style.display = 'block';
    }

    // Collision detection - similar to tree element
    getCollisionShape(): CollisionShape {
      // Get current visual position from DOM (reliable)
      const visualRect = this.el.getBoundingClientRect();
      
      // Calculate collision size from transform + config (configurable)
      const collisionWidth = this.transform.width * this.collisionConfig.scaleX;
      const collisionHeight = this.transform.height * this.collisionConfig.scaleY;
      
      // Center the collision box within the visual bounds
      const offsetX = (visualRect.width - collisionWidth) / 2 + this.collisionConfig.offsetX;
      const offsetY = (visualRect.height - collisionHeight) / 2 + this.collisionConfig.offsetY;
      
      const collisionBounds = new DOMRect(
        visualRect.x + offsetX,
        visualRect.y + offsetY,
        collisionWidth,
        collisionHeight
      );
      
      return CollisionManager.createRectShape(collisionBounds, 'environment');
    }

    setLeftPct(pct: number): void {
      // Home platform stays at fixed position (bottom left), ignore percentage positioning
      // This method exists for PositionableLevelElement interface compliance
    }

    /**
     * Simple collision detection for rectangle vs rectangle
     * @param playerRect Player's bounding rectangle from getBoundingClientRect()
     * @param playerVelocity Player's current velocity (positive = moving right, negative = moving left)
     * @returns 'top' if landing on platform, 'side' if hitting side, null if no collision
     */
    getCollisionType(playerRect: DOMRect, playerVelocity: number): 'top' | 'side' | null {
      const homeRect = this.el.getBoundingClientRect();
      
      const playerBottom = playerRect.bottom;
      const playerCenterX = playerRect.x + playerRect.width / 2;
      
      const homeLeft = homeRect.x;
      const homeRight = homeRect.right;
      const homeTop = homeRect.y;
      const homeBottom = homeRect.bottom;
      
      // Simple top collision: player bottom near home top, within horizontal bounds
      if (playerBottom >= homeTop - 8 && playerBottom <= homeTop + 8 &&
          playerCenterX >= homeLeft && playerCenterX <= homeRight) {
        return 'top';
      }
      
      // Simple side collision: player hitting left or right edges
      const playerRight = playerRect.right;
      const playerLeft = playerRect.x;
      
      // Left side collision
      if (playerRight >= homeLeft && playerRight <= homeLeft + 5 &&
          playerRect.y <= homeBottom && playerBottom >= homeTop) {
        return 'side';
      }
      
      // Right side collision  
      if (playerLeft <= homeRight && playerLeft >= homeRight - 5 &&
          playerRect.y <= homeBottom && playerBottom >= homeTop) {
        return 'side';
      }
      
      return null;
    }

    /**
     * Get the spawn position for the player (on top of the home platform)
     */
    getPlayerSpawnPosition(): { x: number, y: number } {
      // Use hardcoded safe position - center of platform horizontally, well above it vertically
      return {
        x: 40, // Center of 40px wide platform at x=20
        y: 30  // Well above the 20px high platform
      };
    }
  }
}