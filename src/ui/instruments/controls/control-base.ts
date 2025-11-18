/// <reference path="../../ui-element-base.ts" />
/// <reference path="../../../systems/editor-mode-manager.ts" />

namespace Jamble {
  export interface ControlConfig {
    id: string;
    gridSize: { width: number; height: number };
  }

  /**
   * Base class for all instrument controls.
   * Handles common functionality like reset events, DOM structure, and lifecycle.
   */
  export abstract class ControlBase extends UIElement implements IInstrumentComponent {
    protected config: ControlConfig;

    constructor(config: ControlConfig) {
      // Create element first
      const element = document.createElement('div');
      super(element);
      
      this.config = config;
      
      // Apply base styling
      this.container.className = 'control-module';
      this.container.dataset.moduleId = this.config.id;
      this.applyGridSizeClass(this.container);
      
      this.initializeElement();
      this.setupResetListener();
      this.setupEditorModeListener();
    }
    
    /**
     * Initialize the control element (called after container is set up)
     * Subclasses should implement their specific structure.
     * Should set up this.container with the control's DOM structure.
     */
    protected abstract initializeElement(): void;

    /**
     * Reset module to default state.
     * Subclasses should implement their specific reset logic.
     */
    protected abstract resetState(): void;
    
    /**
     * IInstrumentComponent: Get category
     */
    getCategory(): 'monitor' | 'control' {
      return 'control';
    }
    
    /**
     * IInstrumentComponent: Determine if should dim in editor mode
     * Controls dim unless they are the active control
     */
    shouldDimInEditorMode(editorMode: string, activeControlId: string | null): boolean {
      if (editorMode === 'none') {
        return false; // Not dimmed when no editor mode
      }
      // Dim unless this control is the active one
      return activeControlId !== this.config.id;
    }

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
     * Listen for editor mode changes to dim/disable inactive modules.
     */
    private setupEditorModeListener(): void {
      window.addEventListener('jamble:editor-mode-change', () => {
        this.updateDimming();
      });
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

    /**
     * Override in subclasses to stay active during specific editor modes.
     * @deprecated Use shouldDimInEditorMode instead
     * @param mode The current editor mode ('tree-placement', etc.)
     * @returns true if this module should stay active (not dimmed)
     */
    protected shouldStayActiveInEditorMode(mode: string): boolean {
      return false; // Default: dim during any editor mode
    }

    /**
     * Get the DOM element for mounting.
     */
    getElement(): HTMLElement {
      return this.container;
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
