/// <reference path="../entities/player/player.ts" />
/// <reference path="../systems/state-manager.ts" />
/// <reference path="../systems/economy-manager.ts" />
/// <reference path="../ui/hud-manager.ts" />
/// <reference path="../game.ts" />

namespace Jamble {
  /**
   * Debug control types supported by the registry system
   */
  export type DebugControlType = 'display' | 'slider' | 'button' | 'checkbox';
  
  /**
   * Base interface for all debug controls
   */
  export interface DebugControl {
    type: DebugControlType;
    label: string;
  }
  
  /**
   * Display-only value (no interaction)
   */
  export interface DebugDisplay extends DebugControl {
    type: 'display';
    getValue: () => string | number;
  }
  
  /**
   * Slider control with min/max/step
   */
  export interface DebugSlider extends DebugControl {
    type: 'slider';
    min: number;
    max: number;
    step?: number;
    getValue: () => number;
    setValue: (value: number) => void;
  }
  
  /**
   * Button control
   */
  export interface DebugButton extends DebugControl {
    type: 'button';
    onClick: () => void;
  }
  
  /**
   * Checkbox control
   */
  export interface DebugCheckbox extends DebugControl {
    type: 'checkbox';
    getValue: () => boolean;
    setValue: (value: boolean) => void;
  }
  
  /**
   * A section in the debug panel with multiple controls
   */
  export interface DebugSection {
    title: string;
    controls: (DebugDisplay | DebugSlider | DebugButton | DebugCheckbox)[];
  }
  
  export class DebugSystem {
    private static readonly BUILD_VERSION = "BUILD_VERSION_PLACEHOLDER";
    private debugContainer: HTMLElement | null = null;
    private showColliders: boolean = false;
    private showOrigins: boolean = false;
    private showSlots: boolean = false;
    private player: Player | null = null;
    private stateManager: StateManager | null = null;
    private economyManager: EconomyManager;
    private hudManager: HUDManager | null = null;
    private game: Game | null = null;
    
    // Registry system
    private sections: Map<string, DebugSection> = new Map();

    constructor(container?: HTMLElement) {
      this.economyManager = EconomyManager.getInstance();
      
      if (container) {
        this.debugContainer = container;
        this.setupSidePanelDebug();
      } else {
        this.setupOverlayDebug();
      }
    }

    private setupSidePanelDebug() {
      if (!this.debugContainer) {
        console.error('Debug container not found');
        return;
      }

      try {
        this.debugContainer.innerHTML = `
          <div class="debug-container">
            <div class="debug-header">
              <h2>Debug Panel</h2>
              <p class="debug-info">Registry-Based Architecture</p>
              <p class="build-info">Build: ${DebugSystem.BUILD_VERSION}</p>
            </div>
            
            <!-- All sections are now registered dynamically -->
            <div id="registered-sections"></div>
          </div>
        `;
      } catch (error) {
        console.error('Error setting up debug panel HTML:', error);
        return;
      }

      try {
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
          .debug-container {
            padding: 16px;
            font-family: system-ui, sans-serif;
            font-size: 14px;
            background-color: #f8f9fa;
            height: 100%;
            overflow-y: auto;
          }
          
          .debug-header {
            background: #fff;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #dee2e6;
            margin-bottom: 12px;
          }
          
    
          .debug-header h2 {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            color: #212529;
          }
          
          .debug-info {
            margin: 0;
            font-size: 12px;
            color: #6c757d;
          }
          
          .build-info {
            margin: 4px 0 0 0;
            font-size: 10px;
            font-family: monospace;
            color: #28a745;
          }
          
          .debug-section {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 12px;
          }
          
          .section-header {
            background: #f8f9fa;
            padding: 12px 16px;
            font-weight: 600;
            border-bottom: 1px solid #dee2e6;
            color: #212529;
            cursor: pointer;
            user-select: none;
            position: relative;
            transition: background 0.2s;
          }
          
          .section-header:hover {
            background: #e9ecef;
          }
          
          .section-header::before {
            content: '▼';
            display: inline-block;
            margin-right: 8px;
            transition: transform 0.2s;
            font-size: 10px;
          }
          
          .section-header.collapsed::before {
            transform: rotate(-90deg);
          }
          
          .section-content {
            padding: 16px;
            transition: max-height 0.3s ease-out, padding 0.3s ease-out;
            max-height: 1000px;
            overflow: hidden;
          }
          
          .section-content.collapsed {
            max-height: 0;
            padding: 0 16px;
          }
          }
          
          .form-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .control-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 16px;
            align-items: center;
          }
          
          .stat-label {
            color: #495057;
            font-weight: 500;
          }
          
          .stat-value {
            font-family: monospace;
            color: #212529;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid #dee2e6;
          }
          
          .debug-checkbox-label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 14px;
            color: #212529;
          }
          
          .debug-checkbox {
            margin-right: 8px;
            cursor: pointer;
          }
          
          .debug-checkbox:checked + .checkmark {
            color: #007bff;
          }
          
          .debug-slider {
            width: 120px;
            margin-right: 8px;
          }

          .debug-button-row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .debug-button {
            padding: 6px 10px;
            border: 1px solid #ced4da;
            background: #e9ecef;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s ease;
          }

          .debug-button:hover {
            background: #dde2e6;
          }
        `;
        document.head.appendChild(style);

        // All event listeners are now handled by the registry system
      } catch (error) {
        console.error('Error setting up debug panel styles:', error);
      }
    }

    private setupOverlayDebug() {
      const debugElement = document.createElement('div');
      debugElement.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        border-radius: 4px;
        z-index: 1000;
      `;
      debugElement.innerHTML = `
        <div id="overlay-info"></div>
        <button id="overlay-toggle" style="margin-top: 5px; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; border-radius: 2px; cursor: pointer;">
          Toggle Colliders
        </button>
      `;
      document.body.appendChild(debugElement);

      const toggleButton = debugElement.querySelector('#overlay-toggle') as HTMLButtonElement;
      if (toggleButton) {
        toggleButton.onclick = () => {
          this.showColliders = !this.showColliders;
        };
      }
    }
    
    /**
     * Get Economy debug section
     */
    private getEconomySection(): DebugSection {
      return {
        title: 'Economy',
        controls: [
          {
            type: 'display',
            label: 'Currency',
            getValue: () => `$${this.economyManager.getCurrency()}`
          }
        ]
      };
    }
    
    /**
     * Get Player Stats debug section
     */
    private getPlayerStatsSection(): DebugSection {
      if (!this.player) {
        return { title: 'Player Stats', controls: [] };
      }
      
      return {
        title: 'Player Stats',
        controls: [
          {
            type: 'display',
            label: 'Move Speed',
            getValue: () => this.player!.moveSpeed
          },
          {
            type: 'display',
            label: 'Jump Height',
            getValue: () => this.player!.jumpHeight
          },
          {
            type: 'display',
            label: 'Position X',
            getValue: () => this.player!.transform.x.toFixed(1)
          },
          {
            type: 'display',
            label: 'Position Y',
            getValue: () => this.player!.transform.y.toFixed(1)
          },
          {
            type: 'display',
            label: 'Velocity X',
            getValue: () => this.player!.velocityX.toFixed(1)
          },
          {
            type: 'display',
            label: 'Velocity Y',
            getValue: () => this.player!.velocityY.toFixed(1)
          },
          {
            type: 'display',
            label: 'Grounded',
            getValue: () => this.player!.grounded ? 'YES' : 'NO'
          }
        ]
      };
    }
    
    /**
     * Get Debug Controls section (checkboxes for visual debugging)
     */
    private getDebugControlsSection(): DebugSection {
      return {
        title: 'Debug Controls',
        controls: [
          {
            type: 'checkbox',
            label: 'Show Colliders',
            getValue: () => this.showColliders,
            setValue: (value) => { this.showColliders = value; }
          },
          {
            type: 'checkbox',
            label: 'Show Origins',
            getValue: () => this.showOrigins,
            setValue: (value) => { this.showOrigins = value; }
          },
          {
            type: 'checkbox',
            label: 'Show Slots',
            getValue: () => this.showSlots,
            setValue: (value) => { this.showSlots = value; }
          }
        ]
      };
    }

    setPlayer(player: Player) {
      this.player = player;
      // Register built-in sections
      this.registerSection('economy', this.getEconomySection());
      this.registerSection('player-stats', this.getPlayerStatsSection());
      this.registerSection('debug-controls', this.getDebugControlsSection());
    }

    setStateManager(stateManager: StateManager) {
      this.stateManager = stateManager;
    }

    setHUDManager(hudManager: HUDManager) {
      this.hudManager = hudManager;
    }

    setGame(game: Game) {
      this.game = game;
    }
    
    /**
     * Register a debug section from any system
     * @param id Unique identifier for this section
     * @param section The section configuration with controls
     */
    registerSection(id: string, section: DebugSection) {
      this.sections.set(id, section);
      // Rebuild panel if it exists
      if (this.debugContainer) {
        this.rebuildRegisteredSections();
      }
    }
    
    /**
     * Unregister a debug section
     */
    unregisterSection(id: string) {
      this.sections.delete(id);
    }
    
    /**
     * Build HTML for all registered sections
     */
    private buildRegisteredSectionsHTML(): string {
      let html = '';
      
      this.sections.forEach((section, id) => {
        html += `
          <div class="debug-section" id="section-${id}">
            <div class="section-header">${section.title}</div>
            <div class="section-content">
              <div class="form-grid" id="content-${id}">
                ${section.controls.map(control => 
                  this.renderControl(control, `content-${id}`)
                ).join('')}
              </div>
            </div>
          </div>
        `;
      });
      
      return html;
    }
    
    /**
     * Attach listeners to all registered sections
     */
    private attachRegisteredSectionListeners() {
      this.sections.forEach((section, id) => {
        // Attach control listeners
        section.controls.forEach(control => {
          this.attachControlListeners(control, `content-${id}`);
        });
        
        // Attach section header collapse/expand listener
        const sectionElement = this.debugContainer?.querySelector(`#section-${id}`);
        const headerElement = sectionElement?.querySelector('.section-header');
        const contentElement = sectionElement?.querySelector('.section-content');
        
        if (headerElement && contentElement) {
          headerElement.addEventListener('click', () => {
            const isCollapsed = contentElement.classList.contains('collapsed');
            contentElement.classList.toggle('collapsed');
            headerElement.classList.toggle('collapsed');
          });
        }
      });
    }
    
    /**
     * Rebuild the registered sections container
     */
    private rebuildRegisteredSections() {
      if (!this.debugContainer) return;
      
      const container = this.debugContainer.querySelector('#registered-sections');
      if (container) {
        container.innerHTML = this.buildRegisteredSectionsHTML();
        this.attachRegisteredSectionListeners();
      }
    }

    update() {
      if (!this.player) return;

      if (this.debugContainer) {
        this.updateSidePanelDebug();
        // Update display values in registered sections
        this.updateRegisteredDisplays();
      } else {
        this.updateOverlayDebug();
      }
    }

    private updateSidePanelDebug() {
      // All updates now handled by updateRegisteredDisplays()
      // This method kept for potential future non-registry updates
    }

    private updateOverlayDebug() {
      if (!this.player) return;

      const infoElement = document.querySelector('#overlay-info');
      if (infoElement) {
        const info = [
          `Move Speed: ${this.player.moveSpeed}`,
          `Jump Height: ${this.player.jumpHeight}`,
          `Position: ${this.player.transform.x.toFixed(1)}, ${this.player.transform.y.toFixed(1)}`,
          `Velocity: ${this.player.velocityX.toFixed(1)}, ${this.player.velocityY.toFixed(1)}`,
          `Grounded: ${this.player.grounded}`,
          `Colliders: ${this.showColliders ? 'ON' : 'OFF'}`
        ];

        if (this.stateManager) {
          info.push(`State: ${this.stateManager.getCurrentState().toUpperCase()}`);
        }

        infoElement.innerHTML = info.join('<br>');
      }
    }
    
    /**
     * Render a single control based on its type
     */
    private renderControl(control: DebugDisplay | DebugSlider | DebugButton | DebugCheckbox, containerId: string): string {
      const controlId = `${containerId}-${control.label.replace(/\s+/g, '-').toLowerCase()}`;
      
      switch (control.type) {
        case 'display':
          return `
            <div class="control-row">
              <span class="stat-label">${control.label}:</span>
              <span class="stat-value" id="${controlId}">${control.getValue()}</span>
            </div>
          `;
          
        case 'slider':
          const sliderValue = control.getValue();
          const step = control.step ?? 1;
          return `
            <div class="control-row">
              <span class="stat-label">${control.label}:</span>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="range" id="${controlId}" 
                  min="${control.min}" 
                  max="${control.max}" 
                  step="${step}" 
                  value="${sliderValue}" 
                  style="width: 100px;">
                <span class="stat-value" id="${controlId}-value">${sliderValue}</span>
              </div>
            </div>
          `;
          
        case 'button':
          return `
            <div class="control-row">
              <button type="button" class="debug-button" id="${controlId}" style="grid-column: 1 / -1;">${control.label}</button>
            </div>
          `;
          
        case 'checkbox':
          const checked = control.getValue();
          return `
            <div class="control-row" style="grid-template-columns: 1fr;">
              <label class="debug-checkbox-label" id="${controlId}-label">
                <input type="checkbox" id="${controlId}" class="debug-checkbox" ${checked ? 'checked' : ''}>
                <span class="checkmark"></span>
                ${control.label}
              </label>
            </div>
          `;
      }
    }
    
    /**
     * Attach event listeners to a control
     */
    private attachControlListeners(control: DebugDisplay | DebugSlider | DebugButton | DebugCheckbox, containerId: string) {
      const controlId = `${containerId}-${control.label.replace(/\s+/g, '-').toLowerCase()}`;
      const element = this.debugContainer?.querySelector(`#${controlId}`);
      
      if (!element) return;
      
      switch (control.type) {
        case 'slider':
          const slider = element as HTMLInputElement;
          const valueDisplay = this.debugContainer?.querySelector(`#${controlId}-value`);
          slider.addEventListener('input', (e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            control.setValue(value);
            if (valueDisplay) {
              valueDisplay.textContent = value.toString();
            }
          });
          break;
          
        case 'button':
          element.addEventListener('click', () => control.onClick());
          break;
          
        case 'checkbox':
          const checkbox = element as HTMLInputElement;
          checkbox.addEventListener('change', (e) => {
            control.setValue((e.target as HTMLInputElement).checked);
          });
          break;
      }
    }
    
    /**
     * Update display values for all registered sections
     */
    private updateRegisteredDisplays() {
      this.sections.forEach((section, id) => {
        section.controls.forEach(control => {
          if (control.type === 'display') {
            const controlId = `content-${id}-${control.label.replace(/\s+/g, '-').toLowerCase()}`;
            const element = this.debugContainer?.querySelector(`#${controlId}`);
            if (element) {
              element.textContent = String(control.getValue());
            }
          }
        });
      });
    }

    getShowColliders(): boolean {
      return this.showColliders;
    }

    getShowOrigins(): boolean {
      return this.showOrigins;
    }

    getShowSlots(): boolean {
      return this.showSlots;
    }
  }
}
