namespace Jamble {
  export interface CollisionShape {
    type: 'rect' | 'circle';
    bounds: DOMRect;           // For rect: actual bounds. For circle: bounding box containing the circle
    radius?: number;           // For circles only
  }

  export class CollisionManager {
    /**
     * Check collision between two collision shapes
     */
    static checkCollision(a: CollisionShape, b: CollisionShape): boolean {
      if (a.type === 'rect' && b.type === 'rect') {
        return CollisionManager.rectRect(a.bounds, b.bounds);
      }
      if (a.type === 'circle' && b.type === 'circle') {
        return CollisionManager.circleCircle(a, b);
      }
      if (a.type === 'rect' && b.type === 'circle') {
        return CollisionManager.rectCircle(a.bounds, b);
      }
      if (a.type === 'circle' && b.type === 'rect') {
        return CollisionManager.rectCircle(b.bounds, a);
      }
      return false;
    }

    /**
     * Rectangle vs Rectangle collision (AABB)
     */
    private static rectRect(a: DOMRect, b: DOMRect): boolean {
      return a.left < b.right && a.right > b.left && 
             a.bottom > b.top && a.top < b.bottom;
    }

    /**
     * Circle vs Circle collision
     */
    private static circleCircle(a: CollisionShape, b: CollisionShape): boolean {
      if (!a.radius || !b.radius) return false;
      
      // Calculate center points from bounds
      const centerAx = a.bounds.x + a.bounds.width / 2;
      const centerAy = a.bounds.y + a.bounds.height / 2;
      const centerBx = b.bounds.x + b.bounds.width / 2;
      const centerBy = b.bounds.y + b.bounds.height / 2;
      
      const dx = centerAx - centerBx;
      const dy = centerAy - centerBy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance < (a.radius + b.radius);
    }

    /**
     * Rectangle vs Circle collision
     */
    private static rectCircle(rect: DOMRect, circle: CollisionShape): boolean {
      if (!circle.radius) return false;
      
      // Calculate circle center
      const circleCenterX = circle.bounds.x + circle.bounds.width / 2;
      const circleCenterY = circle.bounds.y + circle.bounds.height / 2;
      
      // Find closest point on rectangle to circle center
      const closestX = Math.max(rect.left, Math.min(circleCenterX, rect.right));
      const closestY = Math.max(rect.top, Math.min(circleCenterY, rect.bottom));
      
      // Calculate distance from circle center to closest point
      const dx = circleCenterX - closestX;
      const dy = circleCenterY - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance < circle.radius;
    }

    /**
     * Helper to create a rectangular collision shape
     */
    static createRectShape(bounds: DOMRect): CollisionShape {
      return {
        type: 'rect',
        bounds: bounds
      };
    }

    /**
     * Helper to create a circular collision shape
     */
    static createCircleShape(centerX: number, centerY: number, radius: number): CollisionShape {
      return {
        type: 'circle',
        bounds: new DOMRect(centerX - radius, centerY - radius, radius * 2, radius * 2),
        radius: radius
      };
    }
  }
}