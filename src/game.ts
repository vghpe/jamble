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
/// <reference path="slots/slot-manager.ts" />
/// <reference path="skills/skill-system.ts" />
/// <reference path="debug/debug-system.ts" />
/// <reference path="systems/collision-manager.ts" />
/// <reference path="ui/hud-manager.ts" />

namespace Jamble {
  interface GameOptions {
    debug?: boolean;
    container?: HTMLElement;
  }

  export class Game {
    private gameElement: HTMLElement;
    private renderer: CanvasRenderer;
    private debugRenderer: DebugRenderer;
    private stateManager: StateManager;
    private inputManager: InputManager;
    private slotManager: SlotManager;
    private skillManager: SkillManager;
    private debugSystem: DebugSystem | null;
    private collisionManager: CollisionManager;
    private hudManager: HUDManager;
    
    private player!: Player; // Will be initialized in createPlayer()
    private gameObjects: GameObject[] = [];
    
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

        this.gameElement = gameElement;
        this.renderer = new CanvasRenderer(gameElement, this.gameWidth, this.gameHeight);
        this.debugRenderer = new DebugRenderer(gameElement);
        this.stateManager = new StateManager();
        this.inputManager = new InputManager();
        this.slotManager = new SlotManager(this.gameWidth, this.gameHeight);
        this.skillManager = new SkillManager();
        this.collisionManager = new CollisionManager(this.gameWidth, this.gameHeight);
        this.hudManager = new HUDManager(gameElement, this.gameWidth, this.gameHeight);
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

        if (this.debugSystem) {
          this.debugSystem.setPlayer(this.player);
          this.debugSystem.setStateManager(this.stateManager);
          this.debugSystem.setHUDManager(this.hudManager);
        }
      } catch (error) {
        console.error('Error during game initialization:', error);
        throw error;
      }
    }

    private setupGameElement() {
      this.gameElement.style.cssText = `
        position: relative;
        width: ${this.gameWidth}px;
        height: ${this.gameHeight}px;
        background: #e8f5e9;
        overflow: visible;
        margin: 0 auto;
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
        const knob = new Knob('knob1', knobSlot.x, knobSlot.y, this.slotManager, knobSlot.id);
        this.gameObjects.push(knob);
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
