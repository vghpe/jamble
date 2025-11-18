/// <reference path="../../ui-element-base.ts" />
/// <reference path="../../../systems/editor-mode-manager.ts" />

namespace Jamble {
  /**
   * Portrait Monitor - Player character display (formerly PlayerPortrait)  
   * Renders emoji character states in a bordered canvas
   */
  export class PortraitMonitor extends UIElement implements IInstrumentComponent {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private size: number;
    private currentExpression: NPCExpressionDescriptor | null = null;
    private npc: BaseNPC | null = null;
    
    constructor(parent: HTMLElement, size: number) {
      // Create canvas container first
      const container = document.createElement('div');
      super(container);
      
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
      
      parent.appendChild(this.container);
      this.container.appendChild(this.canvas);
      
      // Listen for editor mode changes
      window.addEventListener('jamble:editor-mode-change', () => {
        this.updateDimming();
      });
    }
    
    /**
     * IInstrumentComponent: Get category
     */
    getCategory(): 'monitor' | 'control' {
      return 'monitor';
    }
    
    /**
     * IInstrumentComponent: Determine if should dim in editor mode
     * Monitors dim during any editor mode
     */
    shouldDimInEditorMode(editorMode: string, _activeControlId: string | null): boolean {
      return editorMode !== 'none';
    }
    
    /**
     * Update dimming based on current editor mode
     */
    private updateDimming(): void {
      const editorModeManager = EditorModeManager.getInstance();
      const mode = editorModeManager.getCurrentMode();
      const activeControl = editorModeManager.getActiveControlId();
      const shouldDim = this.shouldDimInEditorMode(mode, activeControl);
      this.setDimmed(shouldDim);
    }
    
    setExpression(expression: NPCExpressionDescriptor): void {
      this.currentExpression = expression;
    }
    
    /**
     * Set the NPC reference for stats display
     */
    setNPC(npc: BaseNPC): void {
      this.npc = npc;
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
      
      // Draw NPC stats
      if (this.npc) {
        const fontSize = 8;
        const padding = 8;
        
        this.ctx.font = `${fontSize}px monospace`;
        this.ctx.fillStyle = '#666'; // Dark gray for readability
        this.ctx.textBaseline = 'top';
        
        // Client ID at top center
        const clientName = this.npc.getName();
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Client ID: ${clientName}`, size / 2, size - padding);
        

      }
    }
  }
}
