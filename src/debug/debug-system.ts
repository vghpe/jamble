/// <reference path="../entities/player.ts" />
/// <reference path="../systems/state-manager.ts" />
/// <reference path="../systems/economy-manager.ts" />

namespace Jamble {
  export class DebugSystem {
    private static readonly BUILD_VERSION = "BUILD_VERSION_PLACEHOLDER";
    private debugContainer: HTMLElement | null = null;
    private showColliders: boolean = false;
    private showOrigins: boolean = false;
    private showSlots: boolean = false;
    private player: Player | null = null;
    private stateManager: StateManager | null = null;
    private economyManager: EconomyManager;

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
              <h2>🎮 Jamble Debug</h2>
              <p class="debug-info">Rebuilt Architecture</p>
              <p class="build-info">Build: ${DebugSystem.BUILD_VERSION}</p>
            </div>
            
            <div class="debug-section">
              <div class="section-header">Economy</div>
              <div class="section-content">
                <div class="form-grid" id="economy-stats">
                  <!-- Economy stats will be populated here -->
                </div>
              </div>
            </div>
            
            <div class="debug-section">
              <div class="section-header">Player Stats</div>
              <div class="section-content">
                <div class="form-grid" id="player-stats">
                  <!-- Player stats will be populated here -->
                </div>
              </div>
            </div>
            
            <div class="debug-section">
              <div class="section-header">Debug Controls</div>
              <div class="section-content">
                <label class="debug-checkbox-label">
                  <input type="checkbox" id="toggle-colliders" class="debug-checkbox">
                  <span class="checkmark"></span>
                  Show Colliders
                </label>
                <br><br>
                <label class="debug-checkbox-label">
                  <input type="checkbox" id="toggle-origins" class="debug-checkbox">
                  <span class="checkmark"></span>
                  Show Origins
                </label>
                <br><br>
                <label class="debug-checkbox-label">
                  <input type="checkbox" id="toggle-slots" class="debug-checkbox">
                  <span class="checkmark"></span>
                  Show Slots
                </label>
              </div>
            </div>
            
            <div class="debug-section">
              <div class="section-header">Game State</div>
              <div class="section-content">
                <div class="form-grid" id="game-state">
                  <!-- Game state will be populated here -->
                </div>
              </div>
            </div>
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
          }
          
          .section-content {
            padding: 16px;
          }
          
          .form-grid {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px 16px;
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
        `;
        document.head.appendChild(style);

        // Setup checkbox events
        const toggleCollidersCheckbox = this.debugContainer.querySelector('#toggle-colliders') as HTMLInputElement;
        if (toggleCollidersCheckbox) {
          toggleCollidersCheckbox.onchange = () => {
            this.showColliders = toggleCollidersCheckbox.checked;
          };
        } else {
          console.error('Could not find toggle-colliders checkbox');
        }

        const toggleOriginsCheckbox = this.debugContainer.querySelector('#toggle-origins') as HTMLInputElement;
        if (toggleOriginsCheckbox) {
          toggleOriginsCheckbox.onchange = () => {
            this.showOrigins = toggleOriginsCheckbox.checked;
          };
        } else {
          console.error('Could not find toggle-origins checkbox');
        }

        const toggleSlotsCheckbox = this.debugContainer.querySelector('#toggle-slots') as HTMLInputElement;
        if (toggleSlotsCheckbox) {
          toggleSlotsCheckbox.onchange = () => {
            this.showSlots = toggleSlotsCheckbox.checked;
          };
        } else {
          console.error('Could not find toggle-slots checkbox');
        }
      } catch (error) {
        console.error('Error setting up debug panel styles and events:', error);
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

    setPlayer(player: Player) {
      this.player = player;
    }

    setStateManager(stateManager: StateManager) {
      this.stateManager = stateManager;
    }

    update() {
      if (!this.player) return;

      if (this.debugContainer) {
        this.updateSidePanelDebug();
      } else {
        this.updateOverlayDebug();
      }
    }

    private updateSidePanelDebug() {
      if (!this.player || !this.debugContainer) return;

      // Update economy stats
      const economyContainer = this.debugContainer.querySelector('#economy-stats');
      if (economyContainer) {
        economyContainer.innerHTML = `
          <span class="stat-label">Currency:</span>
          <span class="stat-value">$${this.economyManager.getCurrency()}</span>
        `;
      }

      const statsContainer = this.debugContainer.querySelector('#player-stats');
      if (statsContainer) {
        statsContainer.innerHTML = `
          <span class="stat-label">Move Speed:</span>
          <span class="stat-value">${this.player.moveSpeed}</span>
          
          <span class="stat-label">Jump Height:</span>
          <span class="stat-value">${this.player.jumpHeight}</span>
          
          <span class="stat-label">Position X:</span>
          <span class="stat-value">${this.player.transform.x.toFixed(1)}</span>
          
          <span class="stat-label">Position Y:</span>
          <span class="stat-value">${this.player.transform.y.toFixed(1)}</span>
          
          <span class="stat-label">Velocity X:</span>
          <span class="stat-value">${this.player.velocityX.toFixed(1)}</span>
          
          <span class="stat-label">Velocity Y:</span>
          <span class="stat-value">${this.player.velocityY.toFixed(1)}</span>
          
          <span class="stat-label">Grounded:</span>
          <span class="stat-value">${this.player.grounded ? 'YES' : 'NO'}</span>
        `;
      }

      // Update game state display
      if (this.stateManager) {
        const gameStateContainer = this.debugContainer.querySelector('#game-state');
        if (gameStateContainer) {
          const currentState = this.stateManager.getCurrentState();
          
          gameStateContainer.innerHTML = `
            <span class="stat-label">Current State:</span>
            <span class="stat-value">${currentState.toUpperCase()}</span>
          `;
        }
      }

      const colliderStatus = this.debugContainer.querySelector('#collider-status');
      if (colliderStatus) {
        colliderStatus.textContent = this.showColliders ? 'ON' : 'OFF';
      }
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