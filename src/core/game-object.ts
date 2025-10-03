namespace Jamble {
  export interface Transform {
    x: number;
    y: number;
    width: number;
    height: number;
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
    
    constructor(id: string, x: number = 0, y: number = 0, width: number = 20, height: number = 20) {
      this.id = id;
      this.transform = { x, y, width, height };
      this.render = { 
        type: 'css-shape', 
        visible: true,
        animation: { scaleX: 1, scaleY: 1 }
      };
    }

    abstract update(deltaTime: number): void;
    
    getBounds() {
      return {
        left: this.transform.x,
        right: this.transform.x + this.transform.width,
        top: this.transform.y,
        bottom: this.transform.y + this.transform.height
      };
    }

    setPosition(x: number, y: number) {
      this.transform.x = x;
      this.transform.y = y;
    }
  }
}