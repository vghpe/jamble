/// <reference path="../ui-element-base.ts" />
/// <reference path="../../systems/state-manager.ts" />

namespace Jamble {
  /**
   * Jump Instruction Panel - Shows "TAP OR SPACE TO JUMP" during run mode
   * Replaces the control panel area with soft gray instructional text
   */
  export class JumpPrompt extends UIElement implements IUXPrompt {
    private stateManager: StateManager | null = null;
    private onJumpCallback: (() => void) | null = null;

    constructor(parentContainer: HTMLElement) {
      // Create container first
      const container = document.createElement('div');
      super(container);
      
      this.container.id = 'jump-instruction-panel';
      this.container.className = 'jump-instruction-panel';
      this.container.style.position = 'relative';
      this.container.textContent = 'TAP OR SPACE TO JUMP';
      
      this.setupStyles();
      this.setupClickHandler();
      parentContainer.appendChild(this.container);
    }
    
    /**
     * IUXPrompt: Determine if should show in game state
     */
    shouldShowInState(gameState: string): boolean {
      return gameState === 'running';
    }

    private setupClickHandler(): void {
      this.container.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.onJumpCallback && this.isVisible) {
          this.onJumpCallback();
        }
      });
    }

    /**
     * Set callback for when panel is clicked
     */
    setOnJump(callback: () => void): void {
      this.onJumpCallback = callback;
    }

    show(): void {
      if (this.isVisible) return;
      this.isVisible = true;
      // Trigger reflow for transition
      requestAnimationFrame(() => {
        this.container.classList.add('visible');
      });
    }

    hide(): void {
      if (!this.isVisible) return;
      this.isVisible = false;
      this.container.classList.remove('visible');
    }
    
    update(_deltaTime: number): void {
      // No per-frame updates needed
    }

    private setupStyles(): void {
      const style = document.createElement('style');
      style.textContent = `
        .jump-instruction-panel {
          position: relative;
          display: none;
          align-items: center;
          justify-content: center;
          width: 252px;
          height: 128px;
          margin: 16px auto 0;
          padding: 8px;
          background: #fff;
          border: 2px dashed #2196f3;
          box-sizing: border-box;
          font-size: 16px;
          font-weight: bold;
          color: #2196f3;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0;
          transition: opacity 0.2s ease;
          cursor: pointer;
          user-select: none;
        }

        .jump-instruction-panel.visible {
          display: flex;
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * Set state manager for visibility control
     */
    setStateManager(stateManager: StateManager): void {
      this.stateManager = stateManager;
    }

    /**
     * Update visibility based on game state
     */
    updateVisibility(): void {
      if (!this.stateManager) return;

      const shouldBeVisible = this.stateManager.isRunning();

      if (shouldBeVisible && !this.isVisible) {
        this.show();
      } else if (!shouldBeVisible && this.isVisible) {
        this.hide();
      }
    }

    render(): void {
      // No per-frame rendering needed
    }
  }
}
