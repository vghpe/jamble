/// <reference path="ui-element-base.ts" />
/// <reference path="instruments/monitors/portrait-monitor.ts" />
/// <reference path="instruments/monitors/heart-rate-monitor.ts" />
/// <reference path="instruments/monitors/sensation-monitor.ts" />
/// <reference path="instruments/monitors/crescendo-monitor.ts" />
/// <reference path="control-panel.ts" />
/// <reference path="prompts/jump-prompt.ts" />

namespace Jamble {
  /**
   * HUD (Heads Up Display) Manager for all UI components.
   * Manages the top overlay (portrait + activity monitor) and control panel.
   */
  export class HUDManager extends UIElement {
    private hudOverlay!: HTMLElement;
    private portraitPanel!: PortraitMonitor;
    private heartRatePanel!: HeartRateMonitor;
    private sensationPanel!: SensationMonitor;
    private monitorContainer!: HTMLElement;
    private crescendoPanel!: CrescendoMonitor;
    private controlPanel!: ControlPanel;
    private jumpInstructionPanel!: JumpPrompt;
    private panelWrapper!: HTMLElement;
    
    private gameWidth: number;
    private gameHeight: number;
    private portraitSize: number = 80; // Configurable portrait size
    
    constructor(gameElement: HTMLElement, gameWidth: number, gameHeight: number) {
      const shell = gameElement.classList.contains('game-shell')
        ? gameElement
        : (gameElement.querySelector('.game-shell') as HTMLElement) || gameElement;
      
      const portraitSize = 80; // Configurable portrait size
      
      // Create container first
      const container = document.createElement('div');
      container.id = 'hud-overlay';
      container.style.cssText = `
        position: relative;
        width: 100%;
        height: ${portraitSize}px;
        display: flex;
        align-items: stretch;
        gap: 0;
        pointer-events: none;
      `;
      
      super(container, shell, shell);
      this.gameWidth = gameWidth;
      this.gameHeight = gameHeight;
      this.portraitSize = portraitSize;
      
      this.createHUDComponents();
      this.createPanelWrapper();
      this.createControlPanel();
      this.createJumpInstructionPanel();
      this.show(); // Show HUD immediately (control panel visibility controlled separately)
    }
    
    show(): void {
      if (this.isVisible) return;
      this.isVisible = true;
      this.container.style.display = 'flex';
      const mount = this.mountNode!;
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
      // Monitor panels take remaining space
      const monitorWidth = this.gameWidth - portraitGroupWidth;
      
      // Create monitor panels container
      const monitorContainer = document.createElement('div');
      monitorContainer.style.cssText = `
        width: ${monitorWidth}px;
        height: ${this.portraitSize}px;
        flex: 1;
        display: flex;
        flex-direction: row;
        justify-content: stretch;
        align-items: stretch;
        gap: 2px;
        pointer-events: none;
      `;
      this.container.appendChild(monitorContainer);
      this.monitorContainer = monitorContainer;
      
      // Create heart rate and sensation panels
      const halfWidth = Math.floor(monitorWidth / 2);
      const secondWidth = monitorWidth - halfWidth;
      
      this.heartRatePanel = new HeartRateMonitor(monitorContainer, halfWidth, this.portraitSize, {
        strokeStyle: '#757575'
      });
      
      this.sensationPanel = new SensationMonitor(monitorContainer, secondWidth, this.portraitSize, {
        strokeStyle: '#59a869',
        initialValue: 0.2
      });
      
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
      this.crescendoPanel = new CrescendoMonitor(portraitGroup, crescendoPanelWidth, this.portraitSize);
      this.portraitPanel = new PortraitMonitor(portraitGroup, this.portraitSize);
    }

    private createPanelWrapper(): void {
      const root = this.gameElement!.parentElement || this.gameElement!;
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
      this.jumpInstructionPanel = new JumpPrompt(this.panelWrapper);
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
      
      // Apply scale to panel wrapper (control panel and jump instruction)
      this.panelWrapper.style.transform = `scale(${scale})`;
      this.panelWrapper.style.transformOrigin = 'top center';
    }
    
    /**
     * Update all UI components
     */
    update(deltaTime: number): void {
      // No base positioning logic needed anymore
      
      if (this.isVisible) {
        this.portraitPanel.update(deltaTime);
        this.heartRatePanel.update(deltaTime);
        this.sensationPanel.update(deltaTime);
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
        this.heartRatePanel.render();
        this.sensationPanel.render();
        this.crescendoPanel.render();
      }
      
      // Control panel renders independently
      this.controlPanel.render();
    }
    
    /**
     * Push data to the heart rate monitor panel from game events
     */
    pushActivityData(value: number): void {
      this.heartRatePanel.pushData(value);
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
        sampleSpacing: this.heartRatePanel.getSampleSpacing(),
        scrollSpeed: this.heartRatePanel.getScrollSpeed(),
        frequency: this.heartRatePanel.getFrequency(),
        amplitude: this.heartRatePanel.getAmplitude(),
        smoothing: this.heartRatePanel.getSmoothing()
      };
    }

    /**
     * Set monitor panel parameters for debugging
     */
    setActivitySampleSpacing(value: number): void {
      this.heartRatePanel.setSampleSpacing(value);
      this.sensationPanel.setSampleSpacing(value);
    }

    setActivityScrollSpeed(value: number): void {
      this.heartRatePanel.setScrollSpeed(value);
      this.sensationPanel.setScrollSpeed(value);
    }

    setActivityFrequency(value: number): void {
      this.heartRatePanel.setFrequency(value);
    }

    setActivityAmplitude(value: number): void {
      this.heartRatePanel.setAmplitude(value);
    }

    setActivitySmoothing(value: number): void {
      this.heartRatePanel.setSmoothing(value);
      this.sensationPanel.setSmoothing(value);
    }

    /**
     * Set sensation value (0-1) for the sensation panel from external source
     */
    setSensationValue(value: number): void {
      this.sensationPanel.setValue(value);
    }

    /**
     * Get current sensation value
     */
    getSensationValue(): number {
      return this.sensationPanel.getValue();
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
      this.sensationPanel.setNPC(npc);
    }

    /**
     * Enable/disable sensation debug mode (shows pain threshold line)
     */
    setSensationDebugMode(enabled: boolean): void {
      this.sensationPanel.setDebugMode(enabled);
    }

    /**
     * Get sensation debug mode state
     */
    getSensationDebugMode(): boolean {
      return this.sensationPanel.getDebugMode();
    }

    /**
     * Enable/disable sweet spot visualization
     */
    setShowSweetSpot(enabled: boolean): void {
      this.sensationPanel.setShowSweetSpot(enabled);
    }

    /**
     * Get sweet spot visualization state
     */
    getShowSweetSpot(): boolean {
      return this.sensationPanel.getShowSweetSpot();
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
    getJumpInstructionPanel(): JumpPrompt {
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
            label: 'Pain Threshold Line',
            getValue: () => this.getSensationDebugMode(),
            setValue: (value) => this.setSensationDebugMode(value)
          },
          {
            type: 'checkbox',
            label: 'Sweet Spot Zone',
            getValue: () => this.getShowSweetSpot(),
            setValue: (value) => this.setShowSweetSpot(value)
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
            getValue: () => this.heartRatePanel.getSampleSpacing(),
            setValue: (value) => this.setActivitySampleSpacing(value)
          },
          {
            type: 'slider',
            label: 'Scroll Speed',
            min: 5,
            max: 200,
            step: 5,
            getValue: () => this.heartRatePanel.getScrollSpeed(),
            setValue: (value) => this.setActivityScrollSpeed(value)
          },
          {
            type: 'slider',
            label: 'Wave Freq',
            min: 0.05,
            max: 5,
            step: 0.05,
            getValue: () => this.heartRatePanel.getFrequency(),
            setValue: (value) => this.setActivityFrequency(value)
          },
          {
            type: 'slider',
            label: 'Wave Amp',
            min: 0.05,
            max: 0.45,
            step: 0.05,
            getValue: () => this.heartRatePanel.getAmplitude(),
            setValue: (value) => this.setActivityAmplitude(value)
          },
          {
            type: 'slider',
            label: 'Smoothing',
            min: 0.1,
            max: 1.0,
            step: 0.05,
            getValue: () => this.heartRatePanel.getSmoothing(),
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
      if (this.portraitPanel) {
        this.portraitPanel.destroy();
      }
      if (this.heartRatePanel) {
        this.heartRatePanel.destroy();
      }
      if (this.sensationPanel) {
        this.sensationPanel.destroy();
      }
      if (this.crescendoPanel) {
        this.crescendoPanel.destroy();
      }
      if (this.jumpInstructionPanel) {
        this.jumpInstructionPanel.destroy();
      }
    }
  }
}
