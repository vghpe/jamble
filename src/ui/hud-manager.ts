/// <reference path="ui-component-base.ts" />
/// <reference path="portrait-panel.ts" />
/// <reference path="monitor/monitor-panel.ts" />
/// <reference path="crescendo-panel.ts" />
/// <reference path="control-panel.ts" />
/// <reference path="jump-instruction-panel.ts" />

namespace Jamble {
  /**
   * HUD (Heads Up Display) Manager for all UI components.
   * Manages the top overlay (portrait + activity monitor) and control panel.
   */
  export class HUDManager extends UIComponent {
    private hudOverlay!: HTMLElement;
    private portraitPanel!: PortraitPanel;
    private monitorPanel!: MonitorPanel;
    private crescendoPanel!: CrescendoPanel;
    private controlPanel!: ControlPanel;
    private jumpInstructionPanel!: JumpInstructionPanel;
    private panelWrapper!: HTMLElement;
    
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
      this.createPanelWrapper();
      this.createControlPanel();
      this.createJumpInstructionPanel();
      this.setupEditorModeListener();
      this.show(); // Show HUD immediately (control panel visibility controlled separately)
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
      // Calculate widths
      // Crescendo panel is 1/5 of portrait width (e.g., 16px if portrait is 80px)
      const crescendoPanelWidth = Math.floor(this.portraitSize / 5);
      // Portrait has 1px border on each side = 2px total
      const portraitTotalWidth = this.portraitSize + 2;
      // Portrait group = crescendo + portrait
      const portraitGroupWidth = portraitTotalWidth + crescendoPanelWidth;
      // Monitor takes remaining space
      const monitorWidth = this.gameWidth - portraitGroupWidth;
      
      // Create monitor panel
      this.monitorPanel = new MonitorPanel(this.container, monitorWidth, this.portraitSize);
      
      // Create wrapper for portrait group (crescendo + portrait)
      const portraitGroup = document.createElement('div');
      portraitGroup.className = 'portrait-group';
      portraitGroup.style.cssText = `
        width: ${portraitGroupWidth}px;
        height: ${this.portraitSize}px;
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: 0;
        flex-shrink: 0;
        pointer-events: none;
      `;
      this.container.appendChild(portraitGroup);
      
      // Create components in order within portrait group: crescendo panel, portrait
      this.crescendoPanel = new CrescendoPanel(portraitGroup, crescendoPanelWidth, this.portraitSize);
      this.portraitPanel = new PortraitPanel(portraitGroup, this.portraitSize);
    }

    private createPanelWrapper(): void {
      const root = this.gameElement.parentElement || this.gameElement;
      this.panelWrapper = document.createElement('div');
      this.panelWrapper.style.cssText = `
        position: relative;
        width: 100%;
        height: 144px;
        margin-top: 35px;
        padding: 0;
      `;
      root.appendChild(this.panelWrapper);
    }

    private createControlPanel(): void {
      this.controlPanel = new ControlPanel(this.panelWrapper);
    }

    private createJumpInstructionPanel(): void {
      this.jumpInstructionPanel = new JumpInstructionPanel(this.panelWrapper);
    }
    
    /**
     * Listen for editor mode changes and dim HUD panels accordingly
     */
    private setupEditorModeListener(): void {
      window.addEventListener('jamble:editor-mode-change', ((e: CustomEvent) => {
        const dimmed = e.detail.mode !== 'none';
        this.portraitPanel.setDimmed(dimmed);
        this.monitorPanel.setDimmed(dimmed);
        this.crescendoPanel.setDimmed(dimmed);
      }) as EventListener);
    }
    
    /**
     * Set scale for HUD panels to match canvas scaling
     * This ensures HUD panels scale proportionally with the game canvas
     */
    setScale(scale: number): void {
      // Apply scale to the HUD overlay (portrait, monitor, crescendo panels)
      this.container.style.transform = `scale(${scale})`;
      this.container.style.transformOrigin = 'top left';
      
      // Adjust container height to account for scaling
      // This prevents layout issues when scaled down
      const scaledHeight = this.portraitSize * scale;
      this.container.style.marginBottom = `${scaledHeight - this.portraitSize}px`;
    }
    
    /**
     * Update all UI components
     */
    update(deltaTime: number): void {
      super.update(deltaTime); // Handle positioning
      
      if (this.isVisible) {
        this.portraitPanel.update(deltaTime);
        this.monitorPanel.update(deltaTime);
        this.crescendoPanel.update(deltaTime);
      }
      
      // Control panel updates independently (has its own visibility logic)
      this.controlPanel.update(deltaTime);
    }
    
    /**
     * Render all UI components
     */
    render(): void {
      if (this.isVisible) {
        this.portraitPanel.render();
        this.monitorPanel.render();
        this.crescendoPanel.render();
      }
      
      // Control panel renders independently
      this.controlPanel.render();
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
    setPortraitExpression(expression: NPCExpressionDescriptor): void {
      this.portraitPanel.setExpression(expression);
    }
    
    /**
     * Set the NPC reference for portrait panel stats
     */
    setNPC(npc: BaseNPC): void {
      this.portraitPanel.setNPC(npc);
    }
    
    /**
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
     * Set sensation value (0-1) for the sensation panel from external source
     */
    setSensationValue(value: number): void {
      this.monitorPanel.setSensationValue(value);
    }

    /**
     * Get current sensation value
     */
    getSensationValue(): number {
      return this.monitorPanel.getSensationValue();
    }

    /**
     * Set crescendo value (0-1) from external source (e.g., NPC)
     */
    setCrescendoValue(value: number): void {
      this.crescendoPanel.setValue(value);
    }

    /**
     * Get current crescendo value
     */
    getCrescendoValue(): number {
      return this.crescendoPanel.getValue();
    }
    
    /**
     * Set the NPC reference for sensation debug visualization
     */
    setSensationNPC(npc: any): void {
      this.monitorPanel.setSensationNPC(npc);
    }

    /**
     * Enable/disable sensation debug mode (shows pain threshold line)
     */
    setSensationDebugMode(enabled: boolean): void {
      this.monitorPanel.setSensationDebugMode(enabled);
    }

    /**
     * Get sensation debug mode state
     */
    getSensationDebugMode(): boolean {
      return this.monitorPanel.getSensationDebugMode();
    }
    
    /**
     * Trigger portrait pain feedback
     * Placeholder for future pain animation system
     */
    showPortraitPain(): void {
      this.portraitPanel.showPainFeedback();
    }
    
    /**
     * Set state manager for control panel
     */
    setStateManager(stateManager: any): void {
      this.controlPanel.setStateManager(stateManager);
    }
    
    /**
     * Update control panel visibility based on game state
     */
    updateControlPanel(): void {
      this.controlPanel.updateVisibility();
    }
    
    /**
     * Get control panel for direct access if needed
     */
    getControlPanel(): ControlPanel {
      return this.controlPanel;
    }
    
    /**
     * Get jump instruction panel for direct access if needed
     */
    getJumpInstructionPanel(): JumpInstructionPanel {
      return this.jumpInstructionPanel;
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
     * Get debug section for registering with DebugSystem
     */
    getDebugSection(): Jamble.DebugSection {
      return {
        title: 'HUD Controls',
        controls: [
          {
            type: 'checkbox',
            label: 'Sensation Thresholds',
            getValue: () => this.getSensationDebugMode(),
            setValue: (value) => this.setSensationDebugMode(value)
          },
          {
            type: 'slider',
            label: 'Portrait Size',
            min: 40,
            max: 120,
            step: 1,
            getValue: () => this.portraitSize,
            setValue: (value) => this.setPortraitSize(value)
          },
          {
            type: 'slider',
            label: 'Sample Spacing',
            min: 1,
            max: 10,
            step: 1,
            getValue: () => this.monitorPanel.getSampleSpacing(),
            setValue: (value) => this.setActivitySampleSpacing(value)
          },
          {
            type: 'slider',
            label: 'Scroll Speed',
            min: 5,
            max: 200,
            step: 5,
            getValue: () => this.monitorPanel.getScrollSpeed(),
            setValue: (value) => this.setActivityScrollSpeed(value)
          },
          {
            type: 'slider',
            label: 'Wave Freq',
            min: 0.05,
            max: 5,
            step: 0.05,
            getValue: () => this.monitorPanel.getFrequency(),
            setValue: (value) => this.setActivityFrequency(value)
          },
          {
            type: 'slider',
            label: 'Wave Amp',
            min: 0.05,
            max: 0.45,
            step: 0.05,
            getValue: () => this.monitorPanel.getAmplitude(),
            setValue: (value) => this.setActivityAmplitude(value)
          },
          {
            type: 'slider',
            label: 'Smoothing',
            min: 0.1,
            max: 1.0,
            step: 0.05,
            getValue: () => this.monitorPanel.getSmoothing(),
            setValue: (value) => this.setActivitySmoothing(value)
          },
          {
            type: 'slider',
            label: 'Crescendo Speed',
            min: 0,
            max: 100,
            step: 5,
            getValue: () => this.crescendoPanel.getWaveSpeed(),
            setValue: (value) => this.crescendoPanel.setWaveSpeed(value)
          },
          {
            type: 'slider',
            label: 'Crescendo Freq',
            min: 0.1,
            max: 2.0,
            step: 0.1,
            getValue: () => this.crescendoPanel.getWaveFrequency(),
            setValue: (value) => this.crescendoPanel.setWaveFrequency(value)
          },
          {
            type: 'slider',
            label: 'Crescendo Amp',
            min: 0,
            max: 10,
            step: 0.5,
            getValue: () => this.crescendoPanel.getWaveAmplitude(),
            setValue: (value) => this.crescendoPanel.setWaveAmplitude(value)
          }
        ]
      };
    }
    
    /**
     * Clean up resources
     */
    destroy(): void {
      super.destroy();
      if (this.controlPanel) {
        this.controlPanel.destroy();
      }
      // Additional cleanup for HUD-specific resources if needed
    }
  }
}
