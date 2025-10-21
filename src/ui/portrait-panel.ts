namespace Jamble {
  /**
   * Portrait Panel - Player character display (formerly PlayerPortrait)  
   * Renders emoji character states in a bordered canvas
   */
  export class PortraitPanel {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private size: number;
    private currentExpression: NPCExpressionDescriptor | null = null;
    
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
    
    setExpression(expression: NPCExpressionDescriptor): void {
      this.currentExpression = expression;
    }
    

    showPainFeedback(): void {
      // Expression state is managed by the NPC; this is a hook for future sprite animation.
    }
    
    update(deltaTime: number): void {
      // Portrait doesn't need per-frame updates
      // Expression changes are pushed via setExpression()
    }
    
    render(): void {
      const size = this.canvas.width / (window.devicePixelRatio || 1);
      
      // Clear canvas with transparent background
      this.ctx.clearRect(0, 0, size, size);
      
      // Nothing to draw until an expression is provided
      if (!this.currentExpression) {
        return;
      }
      
      // TODO: Support sprite-based rendering when descriptors provide sprite definitions.
      const emoji = this.currentExpression.emoji;
      if (!emoji) {
        return;
      }
      
      // Draw emoji
      this.ctx.font = `${size * 0.6}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      this.ctx.fillText(emoji, size / 2, size / 2);
    }

    /**
     * Dim/undim panel for editor mode
     */
    setDimmed(dimmed: boolean): void {
      this.canvas.style.opacity = dimmed ? '0.5' : '1';
      this.canvas.style.pointerEvents = dimmed ? 'none' : 'auto';
    }
  }
}
