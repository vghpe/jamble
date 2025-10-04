namespace Jamble {
  export interface Transform {
    x: number;
    y: number;
  }

  export interface AnimationState {
    scaleX: number;
    scaleY: number;
  }

  // Rendering anchor within the object's logical canvas
  // x: 0 left, 0.5 center, 1 right
  // y: 0 top, 0.5 center, 1 bottom
  export interface Anchor {
    x: number;
    y: number;
  }

  export interface CanvasRenderInfo {
    color: string;
    shape: 'rectangle' | 'circle' | 'custom';
    width?: number;
    height?: number;
    borderRadius?: number;
    customDraw?: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
  }

  export interface RenderInfo {
    type: 'canvas';
    visible: boolean;
    canvas: CanvasRenderInfo;
    animation?: AnimationState;
    anchor?: Anchor; // Where transform is anchored within canvas
  }

  export interface CollisionBox {
    x: number;
    y: number;
    width: number;
    height: number;
    category: 'player' | 'environment' | 'deadly' | 'neutral';
  }

  export abstract class GameObject {
    public id: string;
    public transform: Transform;
    public render: RenderInfo;
    public collisionBox?: CollisionBox;
    
    constructor(id: string, x: number = 0, y: number = 0) {
      this.id = id;
      this.transform = { x, y };
      this.render = { 
        type: 'canvas',
        visible: true,
        canvas: {
          color: '#ffffff',
          shape: 'rectangle',
          width: 20,
          height: 20
        },
        animation: { scaleX: 1, scaleY: 1 },
        anchor: { x: 0.5, y: 0.5 } // Default to center
      };
    }

    abstract update(deltaTime: number): void;
    
    getBounds() {
      // Use collision box for bounds if available, otherwise just the position
      if (this.collisionBox) {
        return {
          left: this.collisionBox.x,
          right: this.collisionBox.x + this.collisionBox.width,
          top: this.collisionBox.y,
          bottom: this.collisionBox.y + this.collisionBox.height
        };
      }
      
      // Fallback to just position (no size)
      return {
        left: this.transform.x,
        right: this.transform.x,
        top: this.transform.y,
        bottom: this.transform.y
      };
    }

    setPosition(x: number, y: number) {
      this.transform.x = x;
      this.transform.y = y;
    }
  }
}
