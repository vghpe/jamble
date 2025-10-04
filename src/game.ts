/// <reference path="entities/player.ts" />
/// <reference path="entities/tree.ts" />
/// <reference path="entities/knob.ts" />
/// <reference path="entities/platform.ts" />
/// <reference path="systems/canvas-renderer.ts" />
/// <reference path="systems/debug-renderer.ts" />
/// <reference path="systems/state-manager.ts" />
/// <reference path="systems/input-manager.ts" />
/// <reference path="slots/slot-manager.ts" />
/// <reference path="skills/skill-system.ts" />
/// <reference path="debug/debug-system.ts" />
/// <reference path="systems/collision-manager.ts" />

namespace Jamble {
  export class Game {
    private gameElement: HTMLElement;
    private renderer: CanvasRenderer;
    private debugRenderer: DebugRenderer;
    private stateManager: StateManager;
    private inputManager: InputManager;
    private slotManager: SlotManager;
    private skillManager: SkillManager;
    private debugSystem: DebugSystem;
    private collisionManager: CollisionManager;
    
    private player!: Player; // Will be initialized in createPlayer()
    private gameObjects: GameObject[] = [];
    
    private lastTime: number = 0;
    private gameWidth: number = 500;
    private gameHeight: number = 100;

    constructor(gameElement: HTMLElement, debugContainer?: HTMLElement) {
      try {
        this.gameElement = gameElement;
        this.renderer = new CanvasRenderer(gameElement, this.gameWidth, this.gameHeight);
        this.debugRenderer = new DebugRenderer(gameElement);
        this.stateManager = new StateManager();
        this.inputManager = new InputManager();
        this.slotManager = new SlotManager(this.gameWidth, this.gameHeight);
        this.skillManager = new SkillManager();
        this.debugSystem = new DebugSystem(debugContainer);
        this.collisionManager = new CollisionManager(this.gameWidth, this.gameHeight);

        this.setupGameElement();
        this.createPlayer();
        this.createSampleTree();
        this.setupInput();
        
        this.debugSystem.setPlayer(this.player);
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
        overflow: hidden;
        margin: 0 auto;
      `;
    }

    private createPlayer() {
      this.player = new Player(50, 0);
      this.player.setWorldHeight(this.gameHeight);
      this.gameObjects.push(this.player);
    }

    private createSampleTree() {
      const groundSlots = this.slotManager.getAvailableSlots('ground');
      const lowAirSlots = this.slotManager.getAvailableSlots('air_low');
      if (groundSlots.length > 1) {
        // Place tree in 3rd slot
        const treeSlot = groundSlots[2];
        const tree = new Tree('tree1', treeSlot.x, treeSlot.y);
        this.gameObjects.push(tree);
        this.slotManager.occupySlot(treeSlot.id, tree.id);
        
        // Place knob in 4th slot (next to tree)
        if (groundSlots.length > 3) {
          const knobSlot = groundSlots[3];
          const knob = new Knob('knob1', knobSlot.x, knobSlot.y);
          this.gameObjects.push(knob);
          this.slotManager.occupySlot(knobSlot.id, knob.id);
        }

        // Add a simple platform in low air layer to test collisions
        if (lowAirSlots.length > 2) {
          const platSlot = lowAirSlots[2];
          const platform = new Platform('platform1', platSlot.x, platSlot.y);
          this.gameObjects.push(platform);
          this.slotManager.occupySlot(platSlot.id, platform.id);
        }
      } else {
        console.warn('Not enough ground slots available for tree and knob');
      }
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

      // Handle movement using InputManager
      if (this.inputManager.isMovingLeft()) {
        this.player.moveLeft();
      } else if (this.inputManager.isMovingRight()) {
        this.player.moveRight();
      } else {
        this.player.stopMoving();
      }
    }

    private update(deltaTime: number) {
      this.handleInput();
      
      // Update all game objects
      this.gameObjects.forEach(obj => obj.update(deltaTime));
      
      // Trigger interactions handled in CollisionManager (knob, etc.)
      // Resolve collisions against solid environment (platforms, trees, etc.)
      this.collisionManager.update(this.gameObjects);
      
      // Edge clamping now handled in CollisionManager

      this.debugSystem.update();
    }

    // CollisionManager now owns environment collisions and trigger handling

    private render() {
      this.renderer.render(this.gameObjects);
      this.debugRenderer.render(
        this.gameObjects, 
        this.debugSystem.getShowColliders(), 
        this.debugSystem.getShowOrigins(), 
        this.debugSystem.getShowSlots(), 
        this.slotManager.getAllSlots()
      );
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
