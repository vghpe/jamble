/// <reference path="input-manager.ts" />
/// <reference path="state-manager.ts" />
/// <reference path="../skills/skill-system.ts" />
/// <reference path="../entities/player/player.ts" />
/// <reference path="../entities/home.ts" />

namespace Jamble {
  /**
   * InputHandler - State-aware input processing
   * 
   * Translates low-level input (from InputManager) into game actions
   * based on current game state. Handles:
   * - Jump input (space/tap)
   * - State-based movement (idle/running/transition)
   * - Transition auto-centering to home
   */
  export class InputHandler {
    private inputManager: InputManager;
    private stateManager: StateManager;
    private skillManager: SkillManager;
    private player: Player;
    private home: Home;
    private canvasHost: HTMLElement;
    private pointerDownHandler: ((e: PointerEvent) => void) | null = null;

    constructor(
      inputManager: InputManager,
      stateManager: StateManager,
      skillManager: SkillManager,
      player: Player,
      home: Home,
      canvasHost: HTMLElement
    ) {
      this.inputManager = inputManager;
      this.stateManager = stateManager;
      this.skillManager = skillManager;
      this.player = player;
      this.home = home;
      this.canvasHost = canvasHost;

      this.setupInputHandlers();
    }

    /**
     * Setup input event handlers
     */
    private setupInputHandlers(): void {
      // Space key for jump
      this.inputManager.onKeyDown('Space', () => {
        this.handleJumpInput();
      });

      // Tap/pointer for jump (entire canvas area)
      this.pointerDownHandler = (e: PointerEvent) => {
        if (this.stateManager.isRunning() && this.skillManager.hasSkill('jump')) {
          e.preventDefault();
          this.skillManager.useSkill('jump', this.player);
        }
      };
      this.canvasHost.addEventListener('pointerdown', this.pointerDownHandler);
    }

    /**
     * Handle jump input (space key)
     */
    private handleJumpInput(): void {
      if (this.skillManager.hasSkill('jump')) {
        this.skillManager.useSkill('jump', this.player);
      }
    }

    /**
     * Update input handling based on current game state
     * Called every frame from game loop
     */
    update(deltaTime: number): void {
      if (!this.skillManager.hasSkill('move')) return;

      // Handle movement based on game state
      if (this.stateManager.isTransition()) {
        this.handleTransitionState();
      } else if (this.stateManager.isRunning()) {
        this.handleRunningState();
      } else if (this.stateManager.isIdle()) {
        this.handleIdleState();
      }
    }

    /**
     * Handle input during transition state - auto-center player to home
     */
    private handleTransitionState(): void {
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

    /**
     * Handle input during running state - auto-run movement
     */
    private handleRunningState(): void {
      // In run state: auto-movement (player controls direction through collisions)
      this.player.startAutoRun();
    }

    /**
     * Handle input during idle state - stop all movement
     */
    private handleIdleState(): void {
      // In idle state: stop autorun, wait for tap (no keyboard movement)
      this.player.stopAutoRun();
      this.player.stopMoving();
    }

    /**
     * Cleanup event listeners
     */
    destroy(): void {
      if (this.pointerDownHandler) {
        this.canvasHost.removeEventListener('pointerdown', this.pointerDownHandler);
        this.pointerDownHandler = null;
      }
      this.inputManager.removeKeyHandler('Space');
    }
  }
}
