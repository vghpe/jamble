/// <reference path="ui-component-base.ts" />
/// <reference path="modules/module-base.ts" />
/// <reference path="modules/heart-module.ts" />
/// <reference path="modules/tree-module.ts" />
/// <reference path="modules/softness-module.ts" />
/// <reference path="modules/temperature-module.ts" />

namespace Jamble {
  /**
   * Control Panel - Modular widget-based interface for game controls.
   * Features a 4x4 grid layout with various sized modules.
   */
  export class ControlPanel extends UIComponent {
    private modules: Map<string, ControlModule> = new Map();
    private stateManager: any;

    constructor(parentContainer: HTMLElement) {
      super(parentContainer, { mountNode: parentContainer, autoReposition: false });
      this.setupStyles();
      this.createModules();
      this.show();
    }

    protected createContainer(): HTMLElement {
      const container = document.createElement('div');
      container.id = 'control-panel';
      container.className = 'control-panel';
      return container;
    }

    protected calculatePosition(_gameRect: DOMRect): { left: number; top: number } {
      return { left: 0, top: 0 };
    }

    show(): void {
      if (this.isVisible) return;
      this.isVisible = true;
      this.container.style.display = 'grid';
      this.mountNode.appendChild(this.container);
    }

    private setupStyles(): void {
      const style = document.createElement('style');
      style.textContent = `
        .control-panel {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 50px);
          grid-template-rows: repeat(4, 50px);
          gap: 12px;
          width: max-content;
          margin: 16px auto 0;
          justify-self: center;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        .control-panel.visible {
          opacity: 1;
          visibility: visible;
        }

        /* Base module styles */
        .control-module {
          background: #666;
          border-radius: 4px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
          user-select: none;
        }

        /* Grid size classes */
        .module-1x1 { 
          grid-column: span 1; 
          grid-row: span 1; 
        }
        
        .module-3x1 { 
          grid-column: span 3; 
          grid-row: span 1; 
        }
        
        .module-2x2 { 
          grid-column: span 2; 
          grid-row: span 2; 
        }

        /* Button module styles */
        .module-button {
          width: 100%;
          height: 100%;
          background: transparent;
          border: none;
          font-size: 24px;
          cursor: pointer;
          transition: transform 0.1s ease;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .module-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .module-button.pressed {
          transform: scale(0.95);
          background: rgba(0, 0, 0, 0.2);
        }

        .module-button.depleted {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .module-button.depleted:hover {
          background: transparent;
          transform: none;
        }

        .module-uses {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 10px;
          font-weight: bold;
          color: #fff;
          background: rgba(0, 0, 0, 0.5);
          padding: 2px 4px;
          border-radius: 2px;
          min-width: 12px;
          text-align: center;
        }

        /* Slider module styles */
        .module-slider {
          padding: 8px;
          gap: 4px;
        }

        .module-label {
          font-size: 10px;
          font-weight: bold;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .slider-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 100%;
        }

        .module-slider-input {
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: #444;
          outline: none;
          border-radius: 2px;
        }

        .module-slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #fff;
          cursor: pointer;
          border-radius: 50%;
        }

        .module-slider-input::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #fff;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }

        .module-value {
          font-size: 9px;
          color: #fff;
          font-family: monospace;
        }
      `;
      document.head.appendChild(style);
    }

    private createModules(): void {
      // V1 Layout:
      // Row 1: Softness (3x1) + Heart (1x1)
      // Row 2: Temperature (3x1) + Tree (1x1)
      
      const softness = new SoftnessModule({ 
        id: 'softness', 
        gridSize: { width: 3, height: 1 }
      });
      
      const heart = new HeartModule({ 
        id: 'heart', 
        gridSize: { width: 1, height: 1 }
      });
      
      const temperature = new TemperatureModule({ 
        id: 'temperature', 
        gridSize: { width: 3, height: 1 }
      });
      
      const tree = new TreeModule({ 
        id: 'tree', 
        gridSize: { width: 1, height: 1 }
      });

      // Add modules in order (grid auto-flow)
      [softness, heart, temperature, tree].forEach(module => {
        this.modules.set(module.getId(), module);
        this.container.appendChild(module.getElement());
      });
    }

    render(): void {
      this.modules.forEach(module => module.render());
    }

    update(deltaTime: number): void {
      super.update(deltaTime);
      this.modules.forEach(module => module.update(deltaTime));
    }

    /**
     * Show the control panel with fade-in animation.
     */
    public showPanel(): void {
      this.container.classList.add('visible');
    }

    /**
     * Hide the control panel with fade-out animation.
     */
    public hidePanel(): void {
      this.container.classList.remove('visible');
    }

    /**
     * Set state manager for game state coordination.
     */
    public setStateManager(stateManager: any): void {
      this.stateManager = stateManager;
    }

    /**
     * Update panel visibility based on game state.
     */
    public updateVisibility(): void {
      if (!this.stateManager) return;
      
      const state = this.stateManager.getCurrentState();
      if (state === 'idle') {
        this.showPanel();
      } else {
        this.hidePanel();
      }
    }

    /**
     * Get a specific module by ID.
     */
    public getModule(id: string): ControlModule | undefined {
      return this.modules.get(id);
    }

    /**
     * Trigger reset event for all modules.
     */
    public resetAllModules(): void {
      window.dispatchEvent(new CustomEvent('jamble:reset'));
    }
  }
}
