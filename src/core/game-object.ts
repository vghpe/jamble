namespace Jamble {
  export interface Transform {
    x: number;
    y: number;
  }

  export interface CssShape {
    backgroundColor: string;
    borderRadius?: string;
    border?: string;
    boxShadow?: string;
  }

  export interface AnimationState {
    scaleX: number;
    scaleY: number;
    transition?: string;
  }

  export interface RenderInfo {
    type: 'css-shape' | 'emoji' | 'element';
    visible: boolean;
    cssShape?: CssShape;
    emoji?: string;
    element?: HTMLElement;
    animation?: AnimationState;
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
        type: 'css-shape', 
        visible: true,
        animation: { scaleX: 1, scaleY: 1 }
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