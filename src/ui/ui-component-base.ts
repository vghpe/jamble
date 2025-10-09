namespace Jamble {
  /**
   * Base class for UI components that need positioning relative to the game canvas.
   * Provides shared functionality for positioning, lifecycle management, and styling.
   */
  export abstract class UIComponent {
    protected container: HTMLElement;
    protected gameElement: HTMLElement;
    protected isVisible: boolean = false;
    
    constructor(gameElement: HTMLElement) {
      this.gameElement = gameElement;
      this.container = this.createContainer();
      this.setupInitialStyles();
      this.setupResizeListener();
    }
    
    /**
     * Create the main container element for this UI component.
     * Subclasses should implement this to create their specific container.
     */
    protected abstract createContainer(): HTMLElement;
    
    /**
     * Set up initial styles for the container.
     * Subclasses can override to add specific styling.
     */
    protected setupInitialStyles(): void {
      this.container.style.position = 'fixed';
      this.container.style.zIndex = '10';
    }
    
    /**
     * Reposition the UI component based on the game element's current position.
     * Uses the same logic as the shop UI for consistent positioning.
     */
    protected reposition(): void {
      if (!this.isVisible) return;
      
      const gameRect = this.gameElement.getBoundingClientRect();
      const position = this.calculatePosition(gameRect);
      
      this.container.style.left = `${position.left}px`;
      this.container.style.top = `${position.top}px`;
    }
    
    /**
     * Calculate the position for this component based on the game element's bounds.
     * Subclasses should implement this to define their specific positioning logic.
     */
    protected abstract calculatePosition(gameRect: DOMRect): { left: number; top: number };
    
    /**
     * Set up window resize listener to handle repositioning.
     */
    private setupResizeListener(): void {
      window.addEventListener('resize', () => {
        if (this.isVisible) {
          this.reposition();
        }
      });
    }
    
    /**
     * Show the UI component and position it correctly.
     */
    show(): void {
      if (!this.isVisible) {
        this.isVisible = true;
        this.container.style.display = 'block';
        document.body.appendChild(this.container);
        setTimeout(() => this.reposition(), 0); // Wait for DOM update
      }
    }
    
    /**
     * Hide the UI component.
     */
    hide(): void {
      if (this.isVisible) {
        this.isVisible = false;
        this.container.style.display = 'none';
        if (this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
      }
    }
    
    /**
     * Update the component (called from game loop).
     * Subclasses can override to add update logic.
     */
    update(deltaTime: number): void {
      if (this.isVisible) {
        this.reposition();
      }
    }
    
    /**
     * Render the component (called from game loop).
     * Subclasses should implement this for rendering logic.
     */
    abstract render(): void;
    
    /**
     * Clean up resources and event listeners.
     */
    destroy(): void {
      this.hide();
      // Subclasses should override to clean up specific resources
    }
    
    /**
     * Get the container element.
     */
    getContainer(): HTMLElement {
      return this.container;
    }
    
    /**
     * Check if the component is currently visible.
     */
    getIsVisible(): boolean {
      return this.isVisible;
    }
  }
}