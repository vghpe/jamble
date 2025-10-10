/// <reference path="ui-component-base.ts" />
/// <reference path="portrait-panel.ts" />
/// <reference path="monitor/monitor-panel.ts" />
/// <reference path="shop-panel.ts" />

namespace Jamble {
  /**
   * HUD (Heads Up Display) Manager for all UI components.
   * Manages the top overlay (portrait + activity monitor) and shop panel.
   */
  export class HUDManager extends UIComponent {
    private hudOverlay!: HTMLElement;
    private portraitPanel!: PortraitPanel;
    private monitorPanel!: MonitorPanel;
    private shopPanel!: ShopPanel;
    
    private gameWidth: number;
    private gameHeight: number;
    private portraitSize: number = 80; // Configurable portrait size
    
    constructor(gameElement: HTMLElement, gameWidth: number, gameHeight: number) {
      const shell = gameElement.classList.contains('game-shell')
        ? gameElement
        : (gameElement.querySelector('.game-shell') as HTMLElement) || gameElement;
      super(shell, { mountNode: shell, autoReposition: false });
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      
      this.createHUDComponents();
      this.createShopPanel();
      this.show(); // Show HUD immediately (shop visibility controlled separately)
    }
    
    protected createContainer(): HTMLElement {
      const container = document.createElement('div');
      container.id = 'hud-overlay';
      container.style.cssText = `
        position: relative;
        width: 100%;
        height: ${this.portraitSize}px;
        display: flex;
        align-items: stretch;
        gap: 0;
        pointer-events: none;
      `;
      
      return container;
    }

    protected calculatePosition(_gameRect: DOMRect): { left: number; top: number } {
      return { left: 0, top: 0 };
    }

    show(): void {
      if (this.isVisible) return;
      this.isVisible = true;
      this.container.style.display = 'flex';
      const mount = this.mountNode;
      if (mount.firstChild) {
        mount.insertBefore(this.container, mount.firstChild);
      } else {
        mount.appendChild(this.container);
      }
    }
    
    private createHUDComponents(): void {
      // Account for portrait border (1px on each side = 2px total)
      const portraitTotalWidth = this.portraitSize + 2;
      
      this.monitorPanel = new MonitorPanel(this.container, this.gameWidth - portraitTotalWidth, this.portraitSize);
      this.portraitPanel = new PortraitPanel(this.container, this.portraitSize);
    }
    
    private createShopPanel(): void {
      const root = this.gameElement.parentElement || this.gameElement;
      this.shopPanel = new ShopPanel(root, this.gameElement);
    }
    
    /**
     * Update all UI components
     */
    update(deltaTime: number): void {
      super.update(deltaTime); // Handle positioning
      
      if (this.isVisible) {
        this.portraitPanel.update(deltaTime);
        this.monitorPanel.update(deltaTime);
      }
      
      // Shop panel updates independently (has its own visibility logic)
      this.shopPanel.update(deltaTime);
    }
    
    /**
     * Render all UI components
     */
    render(): void {
      if (this.isVisible) {
        this.portraitPanel.render();
        this.monitorPanel.render();
      }
      
      // Shop panel renders independently
      this.shopPanel.render();
    }
    
    /**
     * Push data to the monitor panel from game events
     */
    pushActivityData(value: number): void {
      this.monitorPanel.pushData(value);
    }

    /**
     * Update the portrait panel display (for future sprite animations)
     */
    setPortraitState(state: string): void {
      this.portraitPanel.setState(state);
    }    /**
     * Get portrait size for debugging
     */
    getPortraitSize(): number {
      return this.portraitSize;
    }
    
    /**
     * Set portrait size and recreate HUD components
     */
    setPortraitSize(size: number): void {
      if (size !== this.portraitSize) {
        this.portraitSize = Math.max(40, Math.min(120, size)); // Clamp between 40-120px
        this.recreateHUD();
      }
    }
    
    /**
     * Get monitor panel parameters for debugging
     */
    getActivityParameters(): any {
      return {
        sampleSpacing: this.monitorPanel.getSampleSpacing(),
        scrollSpeed: this.monitorPanel.getScrollSpeed(),
        frequency: this.monitorPanel.getFrequency(),
        amplitude: this.monitorPanel.getAmplitude(),
        smoothing: this.monitorPanel.getSmoothing()
      };
    }

    /**
     * Set monitor panel parameters for debugging
     */
    setActivitySampleSpacing(value: number): void {
      this.monitorPanel.setSampleSpacing(value);
    }

    setActivityScrollSpeed(value: number): void {
      this.monitorPanel.setScrollSpeed(value);
    }

    setActivityFrequency(value: number): void {
      this.monitorPanel.setFrequency(value);
    }

    setActivityAmplitude(value: number): void {
      this.monitorPanel.setAmplitude(value);
    }

    setActivitySmoothing(value: number): void {
      this.monitorPanel.setSmoothing(value);
    }
    
    /**
     * Set state manager for shop panel
     */
    setStateManager(stateManager: any): void {
      this.shopPanel.setStateManager(stateManager);
    }
    
    /**
     * Update shop visibility based on game state
     */
    updateShop(): void {
      this.shopPanel.updateShop();
    }
    
    /**
     * Get shop panel for direct access if needed
     */
    getShopPanel(): ShopPanel {
      return this.shopPanel;
    }
    
    private recreateHUD(): void {
      // Remove existing components
      if (this.container) {
        while (this.container.firstChild) {
          this.container.removeChild(this.container.firstChild);
        }
      }
      
      // Update container size
      this.container.style.height = `${this.portraitSize}px`;
      
      // Recreate components with new size
      this.createHUDComponents();
    }
    
    /**
     * Clean up resources
     */
    destroy(): void {
      super.destroy();
      if (this.shopPanel) {
        this.shopPanel.destroy();
      }
      // Additional cleanup for HUD-specific resources if needed
    }
  }
}
