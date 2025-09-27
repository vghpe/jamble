namespace Jamble {
  /**
   * Logical transform data representing an element's position and dimensions
   * in world space, independent of DOM rendering.
   * 
   * This separates game logic from visual representation, enabling:
   * - Collision detection without DOM queries
   * - Configurable collision shapes
   * - Consistent coordinate system across all game objects
   * 
   * @example
   * const playerTransform: ElementTransform = {
   *   x: 250,     // Center X position in game world
   *   y: 0,       // Y position (0 = ground level)
   *   width: 20,  // Logical width in pixels
   *   height: 20  // Logical height in pixels
   * };
   */
  export interface ElementTransform {
    x: number;           // World position X (center-based for player, varies for elements)
    y: number;           // World position Y (0 = ground level, positive = up)
    width: number;       // Logical dimensions independent of CSS sizing
    height: number;      
  }

  /**
   * Configuration for collision shape relative to logical transform.
   * Allows collision box to be different size/position than visual element
   * for more forgiving or precise gameplay.
   * 
   * @example
   * // More forgiving tree collision (80% of visual size)
   * const treeCollision: CollisionConfig = {
   *   shape: 'rect',
   *   scaleX: 0.8,    // Collision width = transform.width * 0.8
   *   scaleY: 0.83,   // Collision height = transform.height * 0.83
   *   offsetX: 0,     // No horizontal offset
   *   offsetY: 0      // No vertical offset
   * };
   * 
   * // Precise circular collision for knobs
   * const knobCollision: CollisionConfig = {
   *   shape: 'circle',
   *   scaleX: 0.6,    // Radius = min(width,height) / 2 * 0.6
   *   scaleY: 0.6,    // (scaleY ignored for circles)
   *   offsetX: 0,
   *   offsetY: 0
   * };
   */
  export interface CollisionConfig {
    shape: 'rect' | 'circle';
    scaleX: number;      // Collision size vs logical size (0.8 = 80% of transform size)
    scaleY: number;      // For rectangles only (circles use scaleX for radius)
    offsetX: number;     // Collision offset from logical center (+ = right)
    offsetY: number;     // Collision offset from logical center (+ = down)
    radius?: number;     // For circles - overrides width/height calculation if specified
  }

  /**
   * Base interface for elements using transform-based positioning
   */
  export interface TransformElement {
    getTransform(): ElementTransform;
    getCollisionConfig(): CollisionConfig;
    syncVisualToTransform(): void;
  }

  /**
   * Base class providing common transform functionality to reduce code duplication.
   * All game objects can extend this instead of reimplementing the same methods.
   */
  export abstract class BaseTransformElement implements TransformElement {
    protected transform: ElementTransform;
    protected collisionConfig: CollisionConfig;

    constructor(transform: ElementTransform, collisionConfig: CollisionConfig) {
      this.transform = transform;
      this.collisionConfig = collisionConfig;
    }

    getTransform(): ElementTransform {
      return { ...this.transform };
    }

    getCollisionConfig(): CollisionConfig {
      return { ...this.collisionConfig };
    }

    syncVisualToTransform(): void {
      // Default implementation - can be overridden by subclasses
    }

    /**
     * Helper method for hybrid collision detection.
     * Gets position from DOM, size from transform data.
     */
    protected getHybridCollisionShape(element: HTMLElement, category?: string): CollisionShape | null {
      const rect = element.getBoundingClientRect();
      
      if (this.collisionConfig.shape === 'circle') {
        const centerX = rect.x + rect.width / 2 + this.collisionConfig.offsetX;
        const centerY = rect.y + rect.height / 2 + this.collisionConfig.offsetY;
        const baseRadius = Math.min(this.transform.width, this.transform.height) / 2;
        const radius = baseRadius * this.collisionConfig.scaleX;
        return CollisionManager.createCircleShape(centerX, centerY, radius, category as any);
      } else {
        const collisionWidth = this.transform.width * this.collisionConfig.scaleX;
        const collisionHeight = this.transform.height * this.collisionConfig.scaleY;
        const offsetX = (rect.width - collisionWidth) / 2 + this.collisionConfig.offsetX;
        const offsetY = (rect.height - collisionHeight) / 2 + this.collisionConfig.offsetY;
        
        const collisionBounds = new DOMRect(
          rect.x + offsetX,
          rect.y + offsetY,
          collisionWidth,
          collisionHeight
        );
        return CollisionManager.createRectShape(collisionBounds, category as any);
      }
    }
  }
}