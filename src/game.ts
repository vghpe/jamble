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
    
    private player!: Player; // Will be initialized in createPlayer()
    private gameObjects: GameObject[] = [];
    private knobs: Knob[] = [];  // Track all knobs for pain threshold retraction
    
    private lastTime: number = 0;
    private gameWidth: number = 500;
    private gameHeight: number = 100;

    constructor(gameElement: HTMLElement, optionsOrContainer?: HTMLElement | GameOptions) {
      try {
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

        this.canvasHost = document.createElement('div');
        this.canvasHost.className = 'game-canvas';
        this.gameShell.appendChild(this.canvasHost);

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
        this.TempEntitiesLayout();
        this.setupInput();
        
        // Initialize active NPC
        this.activeNPC.initialize();
        
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
        
        // Connect NPC pain threshold to retract all knobs
        this.activeNPC.onPainThreshold(() => {
          console.log('Pain threshold hit - retracting all knobs');
          this.knobs.forEach(knob => knob.retract());
          // Disable crescendo rise when knobs retract
          this.activeNPC.disableCrescendo();
          // Trigger portrait pain feedback
          this.hudManager.showPortraitPain();
        });
        
        // Set initial values
        this.hudManager.setSensationValue(this.activeNPC.getSensationNormalized());
        this.hudManager.setCrescendoValue(this.activeNPC.getCrescendoNormalized());

        if (this.debugSystem) {
          this.debugSystem.setPlayer(this.player);
          this.debugSystem.setStateManager(this.stateManager);
          this.debugSystem.setHUDManager(this.hudManager);
          this.debugSystem.setGame(this);
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
      }
      
      console.log(`Respawned ${respawnedCount} knob(s)`);
    }

    private setupGameElement() {
      this.gameShell.style.cssText = `
        width: ${this.gameWidth}px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0 auto;
      `;

      this.canvasHost.style.cssText = `
        position: relative;
        width: 100%;
        height: ${this.gameHeight}px;
        background: #e8f5e9;
        overflow: hidden;
      `;
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
        const home = new Home('home', homeSlot.x, homeSlot.y);
        this.gameObjects.push(home);
        this.slotManager.occupySlot(homeSlot.id, home.id);
        
        // Add home sensor - attached to home, just above it
        const homeSensor = new Sensor('home-sensor', home, 0, -20);
        homeSensor.setTriggerSize(70, 10); // Wider than home, thinner height
        homeSensor.onTriggerEnter = (other: GameObject) => {
          if (other.id === 'player') {
            this.stateManager.returnToIdle();
          }
        };
        this.gameObjects.push(homeSensor);
      }

      // Get available slots after home placement
      const availableGroundSlots = this.slotManager.getAvailableSlots('ground');

      // Place tree at the third available ground slot
      if (availableGroundSlots.length > 2) {
        const treeSlot = availableGroundSlots[2];
        const tree = new Tree('tree1', treeSlot.x, treeSlot.y);
        this.gameObjects.push(tree);
        this.slotManager.occupySlot(treeSlot.id, tree.id);
      }

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
      
      // Add ground sensor - static sensor just above ground level for run state
      const groundSensor = new Sensor('ground-sensor', undefined, this.gameWidth / 2, this.gameHeight - 5);
      groundSensor.setTriggerSize(this.gameWidth, 5); // Full width ground sensor, very thin
      groundSensor.onTriggerEnter = (other: GameObject) => {
        if (other.id === 'player') {
          this.stateManager.forceRunState();
        }
      };
      this.gameObjects.push(groundSensor);
    }

    private setupInput() {
      // Set up space key handler for jump
      this.inputManager.onKeyDown('Space', () => {
        if (this.skillManager.hasSkill('jump')) {
          this.skillManager.useSkill('jump', this.player);
        }
      });
    }

    private handleInput() {
      if (!this.skillManager.hasSkill('move')) return;

      // Handle movement based on game state
      if (this.stateManager.isRunning()) {
        // In run state: auto-movement (player controls direction through collisions)
        this.player.startAutoRun();
      } else if (this.stateManager.isIdle()) {
        // In idle state: stop autorun and use manual movement
        this.player.stopAutoRun();
        if (this.inputManager.isMovingLeft()) {
          this.player.moveLeft();
        } else if (this.inputManager.isMovingRight()) {
          this.player.moveRight();
        } else {
          this.player.stopMoving();
        }
      }
      // Note: In countdown state, no movement (could add countdown behavior later)
    }

    private update(deltaTime: number) {
      this.handleInput();
      
      // Update active NPC
      this.activeNPC.update(deltaTime);
      
      // Update all game objects
      this.gameObjects.forEach(obj => obj.update(deltaTime));
      
      // Resolve collisions against solid environment (platforms, trees, etc.)
      this.collisionManager.update(this.gameObjects);
      
      // Update UI systems
      if (this.debugSystem) {
        this.debugSystem.update();
      }
      this.hudManager.updateShop(); // Update shop visibility
      this.hudManager.update(deltaTime);
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
    }

    start() {
      const gameLoop = (currentTime: number) => {
        const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(gameLoop);
      };

      requestAnimationFrame(gameLoop);
    }
  }
}
