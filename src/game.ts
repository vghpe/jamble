/// <reference path="entities/player/player.ts" />
/// <reference path="entities/tree.ts" />
/// <reference path="entities/knob/knob.ts" />
/// <reference path="entities/platform.ts" />
/// <reference path="entities/home.ts" />
/// <reference path="entities/sensor.ts" />
/// <reference path="systems/canvas-renderer.ts" />
/// <reference path="debug/debug-renderer.ts" />
/// <reference path="systems/state-manager.ts" />
/// <reference path="systems/input-manager.ts" />
/// <reference path="systems/level-manager.ts" />
/// <reference path="slots/slot-manager.ts" />
/// <reference path="skills/skill-system.ts" />
/// <reference path="debug/debug-system.ts" />
/// <reference path="systems/collision-manager.ts" />
/// <reference path="ui/hud-manager.ts" />
/// <reference path="ui/tree-placement-overlay.ts" />
/// <reference path="ui/tap-indicator.ts" />
/// <reference path="ui/jump-instruction-panel.ts" />
/// <reference path="npc/soma.ts" />

namespace Jamble {
  interface GameOptions {
    debug?: boolean;
    container?: HTMLElement;
  }

  export class Game {
    private rootElement: HTMLElement;
    private gameShell: HTMLElement;
    private canvasHost: HTMLElement;
    private renderer: CanvasRenderer;
    private debugRenderer: DebugRenderer;
    private stateManager: StateManager;
    private inputManager: InputManager;
    private levelManager: LevelManager;
    private slotManager: SlotManager;
    private skillManager: SkillManager;
    private debugSystem: DebugSystem | null;
    private collisionManager: CollisionManager;
    private activeNPC: Soma;  // Current active NPC (Soma for now)
    private hudManager: HUDManager;
    private treePlacementOverlay: TreePlacementOverlay;
    private tapIndicator: TapIndicator;
    private jumpInstructionPanel: JumpInstructionPanel;
    
    private player!: Player; // Will be initialized in createPlayer()
    private home!: Home; // Reference to home object for centering logic
    private homeSensor!: Sensor; // Reference to home sensor for enabling/disabling
    private groundSensor!: Sensor; // Reference to ground sensor for enabling home
    private gameObjects: GameObject[] = [];
    private knobs: Knob[] = [];  // Track all knobs for pain threshold retraction
    private trees: Map<string, Tree> = new Map(); // Track trees by slot ID
    private treeIdCounter: number = 0; // Counter for unique tree IDs
    
    private lastTime: number = 0;
    private gameWidth: number = 500;
    private gameHeight: number = 100;

    constructor(gameElement: HTMLElement, optionsOrContainer?: HTMLElement | GameOptions) {
      try {
        // Log build version for debugging
        console.log('🎮 Jamble Game Initializing - Build: BUILD_VERSION_PLACEHOLDER');
        
        let options: GameOptions = {};
        if (optionsOrContainer instanceof HTMLElement) {
          options = { debug: true, container: optionsOrContainer };
        } else if (optionsOrContainer) {
          options = optionsOrContainer;
        }

        this.rootElement = gameElement;
        this.rootElement.innerHTML = '';
        this.gameShell = document.createElement('div');
        this.gameShell.className = 'game-shell';
        this.rootElement.appendChild(this.gameShell);

        // Wrap canvasHost in a container that allows overflow
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'canvas-wrapper';
        canvasWrapper.style.cssText = `
          position: relative;
          width: 100%;
          overflow: visible;
        `;
        this.gameShell.appendChild(canvasWrapper);

        this.canvasHost = document.createElement('div');
        this.canvasHost.className = 'game-canvas';
        canvasWrapper.appendChild(this.canvasHost);

        this.renderer = new CanvasRenderer(this.canvasHost, this.gameWidth, this.gameHeight);
        this.debugRenderer = new DebugRenderer(this.canvasHost);
        this.stateManager = new StateManager();
        this.inputManager = new InputManager();
        this.levelManager = new LevelManager();
        this.slotManager = new SlotManager(this.gameWidth, this.gameHeight);
        this.skillManager = new SkillManager();
        this.activeNPC = new Soma();  // Initialize our active NPC
        this.collisionManager = new CollisionManager(this.gameWidth, this.gameHeight);
        this.hudManager = new HUDManager(this.gameShell, this.gameWidth, this.gameHeight);
        this.hudManager.setStateManager(this.stateManager);
        this.hudManager.setNPC(this.activeNPC); // Pass NPC to HUD for portrait stats
        this.treePlacementOverlay = new TreePlacementOverlay(
          this.canvasHost,
          this.slotManager,
          this.gameWidth,
          this.gameHeight
        );
        this.tapIndicator = new TapIndicator(this.canvasHost, this.gameWidth, this.gameHeight);
        
        // Setup tap indicator callback
        this.tapIndicator.setOnTap(() => {
          if (this.stateManager.isIdle()) {
            // Tap detected! Start running to the right
            this.stateManager.startRun();
            this.tapIndicator.hide();
            // Re-enable jump when entering run state
            this.skillManager.setSkillEnabled('jump', true);
          }
        });
        
        // Get jump instruction panel from HUDManager and wire it up
        this.jumpInstructionPanel = this.hudManager.getJumpInstructionPanel();
        this.jumpInstructionPanel.setStateManager(this.stateManager);
        this.jumpInstructionPanel.setOnJump(() => {
          if (this.stateManager.isRunning() && this.skillManager.hasSkill('jump')) {
            this.skillManager.useSkill('jump', this.player);
          }
        });

        const debugContainer = options.container;
        const debugRequested = options.debug ?? Boolean(debugContainer);

        if (debugRequested) {
          if (debugContainer) {
            this.debugSystem = new DebugSystem(debugContainer);
          } else {
            console.warn('Debug requested but no container provided. Debug UI disabled.');
            this.debugSystem = null;
          }
        } else {
          this.debugSystem = null;
        }

        this.setupGameElement();
        this.createPlayer();
        
        // Connect player to control panel so sliders can update player attributes
        this.hudManager.getControlPanel().setPlayer(this.player);
        
        // Connect heart use to knob respawn
        this.hudManager.getControlPanel().onHeartUsed(() => {
          this.respawnAllKnobs();
        });
        
        // Disable heart initially (knob starts active)
        this.hudManager.getControlPanel().disableHeart();
        
        // Setup tree placement system
        this.setupTreePlacement();
        
        this.TempEntitiesLayout();
        this.setupInput();
        
        // Initialize active NPC
        this.activeNPC.initialize();
        
        // Connect NPC to sensation panel for debug visualization
        this.hudManager.setSensationNPC(this.activeNPC);
        
        // Setup level manager with active NPC
        this.levelManager.setActiveNPC(this.activeNPC);
        
        // Listen for level complete from level manager
        this.levelManager.onLevelComplete((npc) => {
          console.log(`Level complete! ${npc.getName()} reached crescendo!`);
          // TODO: Show victory UI, transition to next level, etc.
          // For now, just log it
        });
        
        // Connect NPC arousal changes to HUD - update sensation panel with normalized value
        this.activeNPC.onArousalChange((value, npc) => {
          // Update HUD with normalized sensation value (0-1)
          this.hudManager.setSensationValue(npc.getSensationNormalized());
        });
        
        // Connect NPC crescendo changes to HUD
        this.activeNPC.onCrescendoChange((value, npc) => {
          this.hudManager.setCrescendoValue(npc.getCrescendoNormalized());
        });

        // Connect NPC expression changes to HUD portrait
        this.activeNPC.onExpressionChange((expression) => {
          this.hudManager.setPortraitExpression(expression);
        });
        
        // Connect NPC pain threshold to retract all knobs
        this.activeNPC.onPainThreshold(() => {
          console.log('Pain threshold hit - retracting all knobs');
          this.knobs.forEach(knob => knob.retract());
          // Disable crescendo rise when knobs retract
          this.activeNPC.disableCrescendo();
          // Trigger portrait pain feedback
          this.hudManager.showPortraitPain();
          // Enable heart module (knob retracted)
          this.hudManager.getControlPanel().enableHeart();
        });
        
        // Set initial values
        this.hudManager.setSensationValue(this.activeNPC.getSensationNormalized());
        this.hudManager.setCrescendoValue(this.activeNPC.getCrescendoNormalized());
        this.hudManager.setPortraitExpression(this.activeNPC.getExpressionDescriptor());

        if (this.debugSystem) {
          this.debugSystem.setPlayer(this.player);
          this.debugSystem.setStateManager(this.stateManager);
          this.debugSystem.setHUDManager(this.hudManager);
          this.debugSystem.setGame(this);
          
          // Register debug sections from systems
          this.debugSystem.registerSection('hud', this.hudManager.getDebugSection());
          this.debugSystem.registerSection('game', this.getDebugSection());
          this.debugSystem.registerSection('npc', this.activeNPC.getDebugSection());
        }
      } catch (error) {
        console.error('Error during game initialization:', error);
        throw error;
      }
    }
    
    /**
     * Respawn all retracted knobs (called from debug panel or control station)
     */
    respawnAllKnobs(): void {
      let respawnedCount = 0;
      this.knobs.forEach(knob => {
        if (knob.getState() === KnobState.RETRACTED) {
          knob.manualRespawn();
          respawnedCount++;
        }
      });
      
      // Re-enable crescendo if any knobs were respawned
      if (respawnedCount > 0) {
        this.activeNPC.enableCrescendo();
        this.activeNPC.resetPainExpression();
        // Disable heart module (knob is now active)
        this.hudManager.getControlPanel().disableHeart();
      }
      
      console.log(`Respawned ${respawnedCount} knob(s)`);
    }
    
    /**
     * Get debug section for registering with DebugSystem
     */
    getDebugSection(): Jamble.DebugSection {
      return {
        title: 'Game Controls',
        controls: [
          {
            type: 'button',
            label: 'Respawn All Knobs',
            onClick: () => this.respawnAllKnobs()
          }
        ]
      };
    }

    /**
     * Setup tree placement system - wire up all event listeners
     */
    private setupTreePlacement(): void {
      const treeModule = this.hudManager.getControlPanel().getModule('tree') as TreeModule;
      
      // Listen for tree module clicks to toggle edit mode
      window.addEventListener('jamble:tree-module-clicked', () => {
        if (this.stateManager.isInEditorMode()) {
          // Exit edit mode
          this.exitTreeEditMode();
        } else {
          // Enter edit mode
          this.enterTreeEditMode();
        }
      });
      
      // Listen for tree placement from overlay
      window.addEventListener('jamble:tree-placed', ((e: CustomEvent) => {
        const { slotId, x, y } = e.detail;
        this.placeTree(slotId, x, y);
      }) as EventListener);
      
      // Listen for tree removal from overlay
      window.addEventListener('jamble:tree-removed', ((e: CustomEvent) => {
        const { slotId } = e.detail;
        this.removeTree(slotId);
      }) as EventListener);
    }

    /**
     * Enter tree placement edit mode
     */
    private enterTreeEditMode(): void {
      this.stateManager.enterTreePlacementMode();
      this.treePlacementOverlay.show();
      
      const treeModule = this.hudManager.getControlPanel().getModule('tree') as TreeModule;
      treeModule.setEditMode(true);
    }

    /**
     * Exit tree placement edit mode
     */
    private exitTreeEditMode(): void {
      this.stateManager.exitEditorMode();
      this.treePlacementOverlay.hide();
      
      const treeModule = this.hudManager.getControlPanel().getModule('tree') as TreeModule;
      treeModule.setEditMode(false);
    }

    /**
     * Place a tree at the specified slot
     */
    private placeTree(slotId: string, x: number, y: number): void {
      const treeModule = this.hudManager.getControlPanel().getModule('tree') as TreeModule;
      
      // Check if we have trees available and use one
      if (treeModule.getUsesRemaining() === 0 || !treeModule.useTree()) {
        return;
      }
      
      // Create and add tree
      const treeId = `tree_${this.treeIdCounter++}`;
      const tree = new Tree(treeId, x, y, slotId);
      
      this.gameObjects.push(tree);
      this.trees.set(slotId, tree);
      this.slotManager.occupySlot(slotId, treeId);
      this.treePlacementOverlay.setSlotOccupied(slotId, true);
    }

    /**
     * Remove a tree from the specified slot
     */
    private removeTree(slotId: string): void {
      const tree = this.trees.get(slotId);
      if (!tree) return;
      
      // Remove tree from game
      tree.despawn();
      const index = this.gameObjects.indexOf(tree);
      if (index > -1) {
        this.gameObjects.splice(index, 1);
      }
      
      this.trees.delete(slotId);
      this.slotManager.freeSlot(slotId);
      
      // Return tree to module and update overlay
      const treeModule = this.hudManager.getControlPanel().getModule('tree') as TreeModule;
      treeModule.returnTree();
      this.treePlacementOverlay.setSlotOccupied(slotId, false);
    }

    private setupGameElement() {
      this.gameShell.style.cssText = `
        width: 100%;
        max-width: ${this.gameWidth}px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0 auto;
        overflow: visible;
      `;

      this.canvasHost.style.cssText = `
        position: relative;
        width: 100%;
        aspect-ratio: ${this.gameWidth} / ${this.gameHeight};
        overflow: hidden;
      `;
      
      // Setup resize listener to update HUD scaling
      this.setupResizeListener();
      // Apply initial scale
      this.updateHUDScale();
      
      // Setup editor mode listener for dimming player and background
      window.addEventListener('jamble:editor-mode-change', ((e: CustomEvent) => {
        const dimmed = e.detail.mode !== 'none';
        const alpha = dimmed ? 0.2 : 1.0; // Use 0.2 for more obvious testing
        console.log('Editor mode changed:', e.detail.mode, 'Setting alpha to:', alpha);
        this.player.render.opacity = alpha;
        this.renderer.setBackgroundAlpha(alpha);
      }) as EventListener);
    }

    /**
     * Calculate current scale factor based on canvas actual size vs base size
     */
    private calculateCanvasScale(): number {
      const canvasRect = this.canvasHost.getBoundingClientRect();
      const actualWidth = canvasRect.width;
      const scaleX = actualWidth / this.gameWidth;
      
      // Use scaleX since canvas scales uniformly (aspect-ratio maintains proportions)
      return scaleX;
    }

    /**
     * Update HUD panel scaling to match canvas scale
     */
    private updateHUDScale(): void {
      const scale = this.calculateCanvasScale();
      this.hudManager.setScale(scale);
    }

    /**
     * Setup window resize listener to keep HUD scaled with canvas
     */
    private setupResizeListener(): void {
      window.addEventListener('resize', () => {
        this.updateHUDScale();
      });
    }

    private createPlayer() {
      this.player = new Player(50, 0);
      this.gameObjects.push(this.player);
    }

    private TempEntitiesLayout() {
      const groundSlots = this.slotManager.getSlotsByType('ground');
      const lowAirSlots = this.slotManager.getAvailableSlots('air_low');

      // Place home at the first ground slot (leftmost)
      if (groundSlots.length > 0) {
        const homeSlot = groundSlots[0];
        this.home = new Home('home', homeSlot.x, homeSlot.y);
        this.gameObjects.push(this.home);
        this.slotManager.occupySlot(homeSlot.id, this.home.id);
        
        // Add home sensor - attached to home, just above it
        this.homeSensor = new Sensor('home-sensor', this.home, 0, -20);
        this.homeSensor.setTriggerSize(30, 10); // Narrower point sensor
        this.homeSensor.onTriggerEnter = (other: GameObject) => {
          if (other.id === 'player') {
            // Check if we're in the initial transition state (game start)
            if (this.stateManager.isTransition() && this.player.velocityX === 0) {
              // No movement at game start - go directly to idle
              this.stateManager.enterIdle();
              this.homeSensor.setEnabled(false);
              this.skillManager.setSkillEnabled('jump', false);
            } else if (!this.stateManager.isTransition() && !this.stateManager.isIdle()) {
              // Coming from run state - enter transition
              this.stateManager.enterTransition();
              this.homeSensor.setEnabled(false);
              // Disable jump during transition
              this.skillManager.setSkillEnabled('jump', false);
            }
          }
        };
        this.gameObjects.push(this.homeSensor);
      }

      // Get available slots after home placement
      const availableGroundSlots = this.slotManager.getAvailableSlots('ground');

      // Trees are now placed via tree placement overlay (no default tree spawn)

      // Place knob at the fourth available ground slot
      if (availableGroundSlots.length > 3) {
        const knobSlot = availableGroundSlots[3];
        const knob = new Knob('knob1', knobSlot.x, knobSlot.y, this.slotManager, knobSlot.id, this.activeNPC);
        this.gameObjects.push(knob);
        this.knobs.push(knob);  // Track for pain threshold
        this.slotManager.occupySlot(knobSlot.id, knob.id);
      }

      // Place platform at the third low air slot
      if (lowAirSlots.length > 2) {
        const platformSlot = lowAirSlots[2];
        const platform = new Platform('platform1', platformSlot.x, platformSlot.y);
        this.gameObjects.push(platform);
        this.slotManager.occupySlot(platformSlot.id, platform.id);
      }
      
      // Add ground sensor - static sensor just above ground level for re-enabling home
      this.groundSensor = new Sensor('ground-sensor', undefined, this.gameWidth / 2, this.gameHeight - 5);
      this.groundSensor.setTriggerSize(this.gameWidth, 5); // Full width ground sensor, very thin
      this.groundSensor.onTriggerEnter = (other: GameObject) => {
        if (other.id === 'player' && this.stateManager.isRunning()) {
          // Re-enable home sensor when player touches ground while running
          this.homeSensor.setEnabled(true);
        }
      };
      this.gameObjects.push(this.groundSensor);
    }

    private setupInput() {
      // Set up space key handler for jump
      this.inputManager.onKeyDown('Space', () => {
        if (this.skillManager.hasSkill('jump')) {
          this.skillManager.useSkill('jump', this.player);
        }
      });
      
      // Set up tap to jump (entire canvas area)
      this.canvasHost.addEventListener('pointerdown', (e) => {
        if (this.stateManager.isRunning() && this.skillManager.hasSkill('jump')) {
          e.preventDefault();
          this.skillManager.useSkill('jump', this.player);
        }
      });
    }

    private handleInput() {
      if (!this.skillManager.hasSkill('move')) return;

      // Handle movement based on game state
      if (this.stateManager.isTransition()) {
        // In transition state: continue current movement, check for horizontal alignment
        this.handleTransitionState();
      } else if (this.stateManager.isRunning()) {
        // In run state: auto-movement (player controls direction through collisions)
        this.player.startAutoRun();
      } else if (this.stateManager.isIdle()) {
        // In idle state: stop autorun, wait for tap (no keyboard movement)
        this.player.stopAutoRun();
        this.player.stopMoving();
      }
    }

    /**
     * Handle transition state - auto-center player to home position
     */
    private handleTransitionState(): void {
      if (!this.home || !this.player) return;
      
      const homeX = this.home.transform.x;
      const playerX = this.player.transform.x;
      const threshold = 2; // Alignment threshold in pixels
      
      // Check if aligned
      if (Math.abs(playerX - homeX) < threshold) {
        // Aligned! Enter idle state
        this.player.stopMoving();
        this.stateManager.enterIdle();
        return;
      }
      
      // Player continues its current movement (we don't change velocity)
      // The player's existing velocity will naturally move them toward alignment
    }

    private update(deltaTime: number) {
      this.handleInput();
      
      // Update active NPC (pass player for temperature-based decay)
      this.activeNPC.update(deltaTime, this.player);
      
      // Update all game objects
      this.gameObjects.forEach(obj => obj.update(deltaTime));
      
      // Resolve collisions against solid environment (platforms, trees, etc.)
      this.collisionManager.update(this.gameObjects);
      
      // Update UI systems
      if (this.debugSystem) {
        this.debugSystem.update();
      }
      this.hudManager.updateControlPanel(); // Update control panel visibility
      this.jumpInstructionPanel.updateVisibility(); // Update jump instruction panel visibility
      this.hudManager.update(deltaTime);
      
      // Update tap indicator visibility and position
      // Hide tap indicator when in editor mode
      if (this.stateManager.isIdle() && !this.stateManager.isInEditorMode()) {
        // Center the tap circle on the player's center (10px above anchor)
        const playerCenterY = this.player.transform.y - 10;
        if (!this.tapIndicator.isVisible()) {
          this.tapIndicator.show(this.player.transform.x, playerCenterY);
        } else {
          this.tapIndicator.updatePosition(this.player.transform.x, playerCenterY);
        }
      } else {
        if (this.tapIndicator.isVisible()) {
          this.tapIndicator.hide();
        }
      }
    }

    // Render debug overlays and visuals

    private render() {
      this.renderer.render(this.gameObjects);
      this.debugRenderer.render(
        this.gameObjects, 
        this.debugSystem ? this.debugSystem.getShowColliders() : false,
        this.debugSystem ? this.debugSystem.getShowOrigins() : false,
        this.debugSystem ? this.debugSystem.getShowSlots() : false,
        this.slotManager.getAllSlots()
      );
      this.hudManager.render();
      
      // Render tap indicator
      if (this.tapIndicator.isVisible()) {
        this.tapIndicator.render();
      }
    }

    start() {
      const gameLoop = (currentTime: number) => {
        // Calculate delta time (capped to avoid huge jumps)
        const deltaTime = this.lastTime ? Math.min((currentTime - this.lastTime) / 1000, 0.1) : 0;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(gameLoop);
      };

      requestAnimationFrame(gameLoop);
    }
  }
}
