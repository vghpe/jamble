/// <reference path="entities/player.ts" />
/// <reference path="entities/tree.ts" />
/// <reference path="systems/renderer.ts" />
/// <reference path="systems/collision-renderer.ts" />
/// <reference path="slots/slot-manager.ts" />
/// <reference path="skills/skill-system.ts" />
/// <reference path="debug/debug-system.ts" />

namespace Jamble {
  export class Game {
    private gameElement: HTMLElement;
    private renderer: Renderer;
    private collisionRenderer: CollisionRenderer;
    private slotManager: SlotManager;
    private skillManager: SkillManager;
    private debugSystem: DebugSystem;
    
    private player!: Player; // Will be initialized in createPlayer()
    private gameObjects: GameObject[] = [];
    
    private lastTime: number = 0;
    private gameWidth: number = 500;
    private gameHeight: number = 100;

    private keys: Set<string> = new Set();

    constructor(gameElement: HTMLElement, debugContainer?: HTMLElement) {
      try {
        console.log('Initializing game...');
        this.gameElement = gameElement;
        this.renderer = new Renderer(gameElement);
        this.collisionRenderer = new CollisionRenderer(gameElement);
        this.slotManager = new SlotManager(this.gameWidth, this.gameHeight);
        this.skillManager = new SkillManager();
        
        console.log('Creating debug system with container:', debugContainer);
        this.debugSystem = new DebugSystem(debugContainer);

        this.setupGameElement();
        this.createPlayer();
        this.createSampleTree();
        this.setupInput();
        
        this.debugSystem.setPlayer(this.player);
        console.log('Game initialization complete');
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
        border: 2px solid #81c784;
        border-radius: 6px;
        overflow: hidden;
        margin: 0 auto;
      `;
    }

    private createPlayer() {
      this.player = new Player(50, 0);
      this.gameObjects.push(this.player);
    }

    private createSampleTree() {
      const groundSlots = this.slotManager.getAvailableSlots('ground');
      console.log('Available ground slots:', groundSlots);
      if (groundSlots.length > 0) {
        const slot = groundSlots[2]; // Use 3rd slot
        console.log('Using slot:', slot);
        const tree = new Tree('tree1', slot.x - 15, slot.y); // Place on ground level, not below it
        console.log('Created tree at position:', tree.transform.x, tree.transform.y);
        console.log('Tree render info:', tree.render);
        this.gameObjects.push(tree);
        this.slotManager.occupySlot(slot.id, tree.id);
      } else {
        console.warn('No ground slots available for tree');
      }
    }

    private setupInput() {
      document.addEventListener('keydown', (e) => {
        this.keys.add(e.code);
        
        // Handle jump
        if (e.code === 'Space' && this.skillManager.hasSkill('jump')) {
          this.skillManager.useSkill('jump', this.player);
          e.preventDefault();
        }
      });

      document.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });
    }

    private handleInput() {
      if (!this.skillManager.hasSkill('move')) return;

      // Handle movement
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
        this.player.moveLeft();
      } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
        this.player.moveRight();
      } else {
        this.player.stopMoving();
      }
    }

    private update(deltaTime: number) {
      this.handleInput();
      
      // Update all game objects
      this.gameObjects.forEach(obj => obj.update(deltaTime));
      
      // Keep player in bounds
      if (this.player.transform.x > this.gameWidth - this.player.transform.width) {
        this.player.transform.x = this.gameWidth - this.player.transform.width;
        this.player.velocityX = 0;
      }

      this.debugSystem.update();
    }

    private render() {
      this.renderer.render(this.gameObjects);
      this.collisionRenderer.render(this.gameObjects, this.debugSystem.getShowColliders());
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