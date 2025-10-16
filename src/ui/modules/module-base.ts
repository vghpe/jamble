namespace Jamble {
  export interface ModuleConfig {
    id: string;
    gridSize: { width: number; height: number };
    label?: string;
  }

  /**
   * Base class for all control panel modules.
   * Handles common functionality like reset events, DOM structure, and lifecycle.
   */
  export abstract class ControlModule {
    protected element: HTMLElement;
    protected config: ModuleConfig;
    protected enabled: boolean = true;

    constructor(config: ModuleConfig) {
      this.config = config;
      this.element = this.createElement();
      this.setupResetListener();
    }

    /**
     * Create the DOM element for this module.
     * Subclasses should implement their specific structure.
     */
    protected abstract createElement(): HTMLElement;

    /**
     * Reset module to default state.
     * Subclasses should implement their specific reset logic.
     */
    protected abstract resetState(): void;

    /**
     * Update module (called from game loop).
     * Subclasses can override for animation or dynamic updates.
     */
    update(_deltaTime: number): void {
      // Override in subclasses if needed
    }

    /**
     * Render module visual state.
     * Subclasses can override for dynamic rendering.
     */
    render(): void {
      // Override in subclasses if needed
    }

    /**
     * Listen for reset events dispatched from the game.
     */
    private setupResetListener(): void {
      window.addEventListener('jamble:reset', () => {
        this.resetState();
      });
    }

    /**
     * Get the DOM element for mounting.
     */
    getElement(): HTMLElement {
      return this.element;
    }

    /**
     * Get grid size for layout calculations.
     */
    getGridSize(): { width: number; height: number } {
      return this.config.gridSize;
    }

    /**
     * Get module ID.
     */
    getId(): string {
      return this.config.id;
    }

    /**
     * Apply grid size class to element.
     */
    protected applyGridSizeClass(element: HTMLElement): void {
      const { width, height } = this.config.gridSize;
      element.classList.add(`module-${width}x${height}`);
    }

    /**
     * Create base module container with common styles.
     */
    protected createBaseElement(): HTMLElement {
      const element = document.createElement('div');
      element.className = 'control-module';
      element.dataset.moduleId = this.config.id;
      this.applyGridSizeClass(element);
      return element;
    }
  }
}
