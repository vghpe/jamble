/// <reference path="../entities/player/player.ts" />
/// <reference path="../systems/state-manager.ts" />
/// <reference path="../systems/economy-manager.ts" />
/// <reference path="../ui/hud-manager.ts" /> <reference path="../entities/player/player.ts" />
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
    private hudManager: HUDManager | null = null;

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
              <h2>Debug</h2>
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
                <label class="debug-checkbox-label">
                  <input type="checkbox" id="toggle-origins" class="debug-checkbox">
                  <span class="checkmark"></span>
                  Show Origins
                </label>
                <label class="debug-checkbox-label">
                  <input type="checkbox" id="toggle-slots" class="debug-checkbox">
                  <span class="checkmark"></span>
                  Show Slots
                </label>
              </div>
            </div>
            
            <div class="debug-section">
              <div class="section-header">UI Controls</div>
              <div class="section-content">
                <div class="form-grid" id="ui-controls">
                  <!-- UI controls will be populated here -->
                </div>
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
          
          .debug-slider {
            width: 120px;
            margin-right: 8px;
          }
          
          .form-grid {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 8px 12px;
            align-items: center;
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

    setHUDManager(hudManager: HUDManager) {
      this.hudManager = hudManager;
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

      // Update HUD controls
      if (this.hudManager) {
        const uiContainer = this.debugContainer.querySelector('#ui-controls');
        if (uiContainer) {
          const portraitSize = this.hudManager.getPortraitSize();
          const activityParams = this.hudManager.getActivityParameters();
          
          uiContainer.innerHTML = `
            <span class="stat-label">Portrait Size:</span>
            <input type="range" id="portrait-size-slider" min="40" max="120" value="${portraitSize}" style="width: 100px;">
            <span class="stat-value">${portraitSize}px</span>
            
            <span class="stat-label">Sample Spacing:</span>
            <input type="range" id="sample-spacing-slider" min="1" max="10" step="1" value="${activityParams.sampleSpacing}" style="width: 100px;">
            <span class="stat-value">${activityParams.sampleSpacing}px</span>
            
            <span class="stat-label">Scroll Speed:</span>
            <input type="range" id="scroll-speed-slider" min="5" max="200" step="5" value="${activityParams.scrollSpeed}" style="width: 100px;">
            <span class="stat-value">${activityParams.scrollSpeed.toFixed(0)}px/s</span>

            <span class="stat-label">Wave Frequency:</span>
            <input type="range" id="frequency-slider" min="0.05" max="5" step="0.05" value="${activityParams.frequency}" style="width: 100px;">
            <span class="stat-value">${activityParams.frequency.toFixed(2)} Hz</span>

            <span class="stat-label">Wave Amplitude:</span>
            <input type="range" id="amplitude-slider" min="0.05" max="0.45" step="0.05" value="${activityParams.amplitude}" style="width: 100px;">
            <span class="stat-value">${activityParams.amplitude.toFixed(2)}</span>
            
            <span class="stat-label">Smoothing:</span>
            <input type="range" id="smoothing-slider" min="0.1" max="1.0" step="0.05" value="${activityParams.smoothing}" style="width: 100px;">
            <span class="stat-value">${activityParams.smoothing.toFixed(2)}</span>

            <span class="stat-label">Arousal Stabilization:</span>
            <input type="range" id="arousal-decay-slider" min="0" max="2" step="0.05" value="${activityParams.arousalDecayRate}" style="width: 100px;">
            <span class="stat-value">${activityParams.arousalDecayRate.toFixed(2)} u/s</span>

            <span class="stat-label" style="grid-column: 1 / -1; margin-top: 8px;">Arousal Impulses:</span>
            <div class="debug-button-row" style="grid-column: 1 / -1;">
              <button type="button" class="debug-button" data-arousal-impulse="0.15">Mild Pulse</button>
              <button type="button" class="debug-button" data-arousal-impulse="0.3">Strong Pulse</button>
              <button type="button" class="debug-button" data-arousal-impulse="0.5">Surge Pulse</button>
            </div>
          `;
          
          // Add event listeners for all sliders
          const portraitSlider = uiContainer.querySelector('#portrait-size-slider') as HTMLInputElement;
          if (portraitSlider) {
            portraitSlider.addEventListener('input', (e) => {
              const target = e.target as HTMLInputElement;
              this.hudManager!.setPortraitSize(parseInt(target.value));
            });
          }
          
          const sampleSpacingSlider = uiContainer.querySelector('#sample-spacing-slider') as HTMLInputElement;
          if (sampleSpacingSlider) {
            sampleSpacingSlider.addEventListener('input', (e) => {
              const target = e.target as HTMLInputElement;
              this.hudManager!.setActivitySampleSpacing(parseInt(target.value));
            });
          }
          
          const scrollSpeedSlider = uiContainer.querySelector('#scroll-speed-slider') as HTMLInputElement;
          if (scrollSpeedSlider) {
            scrollSpeedSlider.addEventListener('input', (e) => {
              const target = e.target as HTMLInputElement;
              this.hudManager!.setActivityScrollSpeed(parseFloat(target.value));
            });
          }

          const frequencySlider = uiContainer.querySelector('#frequency-slider') as HTMLInputElement;
          if (frequencySlider) {
            frequencySlider.addEventListener('input', (e) => {
              const target = e.target as HTMLInputElement;
              this.hudManager!.setActivityFrequency(parseFloat(target.value));
            });
          }

          const amplitudeSlider = uiContainer.querySelector('#amplitude-slider') as HTMLInputElement;
          if (amplitudeSlider) {
            amplitudeSlider.addEventListener('input', (e) => {
              const target = e.target as HTMLInputElement;
              this.hudManager!.setActivityAmplitude(parseFloat(target.value));
            });
          }
          
          const smoothingSlider = uiContainer.querySelector('#smoothing-slider') as HTMLInputElement;
          if (smoothingSlider) {
            smoothingSlider.addEventListener('input', (e) => {
              const target = e.target as HTMLInputElement;
              this.hudManager!.setActivitySmoothing(parseFloat(target.value));
            });
          }

          const arousalDecaySlider = uiContainer.querySelector('#arousal-decay-slider') as HTMLInputElement;
          if (arousalDecaySlider) {
            arousalDecaySlider.addEventListener('input', (e) => {
              const target = e.target as HTMLInputElement;
              this.hudManager!.setArousalDecayRate(parseFloat(target.value));
            });
          }

          const arousalImpulseButtons = uiContainer.querySelectorAll('[data-arousal-impulse]');
          arousalImpulseButtons.forEach((button) => {
            button.addEventListener('click', () => {
              const amount = parseFloat((button as HTMLElement).getAttribute('data-arousal-impulse') || '0');
              if (!isNaN(amount)) {
                this.hudManager!.applyArousalImpulse(amount);
              }
            });
          });
        }
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
