namespace Jamble {
  /**
   * Portrait Panel - Player character display (formerly PlayerPortrait)  
   * Renders emoji character states in a bordered canvas
   */
  export class PortraitPanel {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private size: number;
    private currentState: string = 'default';
    
    // Emoji states for different player conditions
    private emojis = {
      default: '😊',
      happy: '😄',
      surprised: '😮'
    };
    
    constructor(parent: HTMLElement, size: number) {
      this.size = size;
      this.canvas = document.createElement('canvas');
      this.canvas.width = size;
      this.canvas.height = size;
      this.canvas.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border: 1px solid #999;
        box-sizing: border-box;
      `;
      
      // Set up high DPI rendering
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = size * dpr;
      this.canvas.height = size * dpr;
      
      this.ctx = this.canvas.getContext('2d')!;
      this.ctx.scale(dpr, dpr);
      
      parent.appendChild(this.canvas);
    }
    
    setState(state: string): void {
      this.currentState = state;
    }
    
    update(deltaTime: number): void {
      // Portrait doesn't need per-frame updates
      // State changes are handled via setState()
    }
    
    render(): void {
      const size = this.canvas.width / (window.devicePixelRatio || 1);
      
      // Clear canvas with transparent background
      this.ctx.clearRect(0, 0, size, size);
      
      // Draw emoji
      const emoji = this.emojis[this.currentState as keyof typeof this.emojis] || this.emojis.default;
      this.ctx.font = `${size * 0.6}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      this.ctx.fillText(emoji, size / 2, size / 2);
    }
  }
}