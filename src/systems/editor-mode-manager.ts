namespace Jamble {
  /**
   * EditorModeManager - Centralized state management for editor modes
   * Dispatches events when modes change so UI components can react
   */
  export class EditorModeManager {
    private static instance: EditorModeManager;
    
    private currentMode: 'none' | 'entity-placement' = 'none';
    private activeControlId: string | null = null;
    
    private constructor() {}
    
    /**
     * Get the singleton instance
     */
    static getInstance(): EditorModeManager {
      if (!EditorModeManager.instance) {
        EditorModeManager.instance = new EditorModeManager();
      }
      return EditorModeManager.instance;
    }
    
    /**
     * Enter an editor mode
     * @param mode - The editor mode to enter
     * @param activeControlId - The ID of the control that activated this mode
     */
    enterEditorMode(mode: 'entity-placement', activeControlId: string): void {
      this.currentMode = mode;
      this.activeControlId = activeControlId;
      this.notifyModeChange();
    }
    
    /**
     * Exit the current editor mode
     */
    exitEditorMode(): void {
      this.currentMode = 'none';
      this.activeControlId = null;
      this.notifyModeChange();
    }
    
    /**
     * Get the current editor mode
     */
    getCurrentMode(): 'none' | 'entity-placement' {
      return this.currentMode;
    }
    
    /**
     * Get the ID of the control that activated the current mode
     */
    getActiveControlId(): string | null {
      return this.activeControlId;
    }
    
    /**
     * Check if any editor mode is active
     */
    isEditorModeActive(): boolean {
      return this.currentMode !== 'none';
    }
    
    /**
     * Dispatch a custom event to notify listeners of mode changes
     */
    private notifyModeChange(): void {
      window.dispatchEvent(new CustomEvent('jamble:editor-mode-change', {
        detail: {
          mode: this.currentMode,
          activeControlId: this.activeControlId
        }
      }));
    }
  }
}
