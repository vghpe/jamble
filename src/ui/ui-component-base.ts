namespace Jamble {
  /**
   * Base class for UI components.
   * Provides shared functionality for lifecycle management and basic styling.
   * Components use relative positioning and scale via parent transform.
   */
  interface UIComponentOptions {
    mountNode?: HTMLElement;
  }

  export abstract class UIComponent {
    protected container: HTMLElement;
    protected gameElement: HTMLElement;
    protected isVisible: boolean = false;
    protected mountNode: HTMLElement;
    
    constructor(gameElement: HTMLElement, options: UIComponentOptions = {}) {
      this.gameElement = gameElement;
      this.container = this.createContainer();
      this.mountNode = options.mountNode ?? document.body;
      this.setupInitialStyles();
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
      // Default styling - subclasses typically override position
      if (!this.container.style.position) {
        this.container.style.position = 'relative';
      }
      if (!this.container.style.zIndex) {
        this.container.style.zIndex = '10';
      }
    }
    
    /**
     * Show the UI component.
     */
    show(): void {
      if (!this.isVisible) {
        this.isVisible = true;
        this.container.style.display = 'block';
        this.mountNode.appendChild(this.container);
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
    update(_deltaTime: number): void {
      // Default UI components don't require per-frame work.
      // Subclasses can override when they need animation or polling.
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
