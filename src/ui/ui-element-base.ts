namespace Jamble {
  /**
   * UIElement - Unified base class for all UI components
   * Provides consistent lifecycle, visibility management, and dimming interface
   * Supports both leaf components and containers
   */
  export abstract class UIElement {
    protected container: HTMLElement;
    protected isVisible: boolean = false;
    protected isDimmed: boolean = false;
    protected gameElement?: HTMLElement;  // Optional - used by container components
    protected mountNode?: HTMLElement;    // Optional - used by container components
    
    constructor(container: HTMLElement, gameElement?: HTMLElement, mountNode?: HTMLElement) {
      this.container = container;
      this.gameElement = gameElement;
      this.mountNode = mountNode;
    }
    
    /**
     * Render the component's visual representation
     * Called on initialization and when content needs updating
     */
    abstract render(): void;
    
    /**
     * Update component state (called each frame)
     * @param deltaTime - Time elapsed since last update in seconds
     */
    abstract update(deltaTime: number): void;
    
    /**
     * Show the component
     * If mountNode is provided (container components), will append to it
     */
    show(): void {
      if (this.isVisible) return;
      this.isVisible = true;
      this.container.style.display = 'block';
      
      // Container components may need to mount themselves
      if (this.mountNode && !this.container.parentNode) {
        this.mountNode.appendChild(this.container);
      }
    }
    
    /**
     * Hide the component
     * If mountNode is provided (container components), will remove from DOM
     */
    hide(): void {
      if (!this.isVisible) return;
      this.isVisible = false;
      this.container.style.display = 'none';
      
      // Container components may need to unmount themselves
      if (this.mountNode && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }
    
    /**
     * Set dimmed state (used during editor modes)
     * Components that don't support dimming can override with empty implementation
     */
    setDimmed(dimmed: boolean): void {
      this.isDimmed = dimmed;
      this.container.style.opacity = dimmed ? '0.5' : '1';
      this.container.style.pointerEvents = dimmed ? 'none' : 'auto';
    }
    
    /**
     * Check if component is currently visible
     */
    isShown(): boolean {
      return this.isVisible;
    }
    
    /**
     * Get the container element (useful for container components)
     */
    getContainer(): HTMLElement {
      return this.container;
    }
    
    /**
     * Clean up resources and remove from DOM
     */
    destroy(): void {
      this.hide();
      // Subclasses should override to clean up specific resources
    }
  }
  
  /**
   * Interface for instrument components (monitors and controls)
   * These are in-fiction player equipment that can be dimmed during editor modes
   */
  export interface IInstrumentComponent {
    /**
     * Get the category of this instrument
     */
    getCategory(): 'monitor' | 'control';
    
    /**
     * Determine if this component should be dimmed in the given editor mode
     * @param editorMode - Current editor mode ('none', 'entity-placement', etc.)
     * @param activeControlId - ID of the control that activated editor mode (if any)
     */
    shouldDimInEditorMode(editorMode: string, activeControlId: string | null): boolean;
  }
  
  /**
   * Interface for UX prompt components
   * These are out-of-fiction UI helpers for player guidance
   */
  export interface IUXPrompt {
    /**
     * Determine if this prompt should be shown in the given game state
     * @param gameState - Current game state
     */
    shouldShowInState(gameState: string): boolean;
  }
}
